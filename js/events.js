import { state, dom, sceneState } from './state.js';
import { CITIES, CUSTOM_CITY_INDEX } from './data.js';
import { DEFAULT_HEIGHTS, BREAKPOINTS } from './constants.js';
import { initMap, updateLocation } from './map.js';
import { updateScene, updateHeightInputsFromState, updateLatLonDisplay, updateTimeDisplay, updateTriangle } from './ui.js';
import { getSolarPosition } from './math.js';
import { onWindowResize } from './scene.js';
import { updateInfoPanelVisibility } from './ui.js';

/**
 * Setup all event listeners for the application
 */
export function setupEventListeners() {
    setupMobileMenuListeners();
    setupLocationListeners();
    setupDateTimeListeners();
    setupObjectListeners();
    setupHeightListeners();
    setupDisplayListeners();
    setupAnimationListeners();
}

/**
 * Mobile menu toggle and sidebar interactions
 */
function setupMobileMenuListeners() {
    dom.menuToggle.addEventListener('click', () => {
        dom.sidebar.classList.toggle('open');
        dom.menuToggle.classList.toggle('open');
    });

    // Close sidebar when clicking outside on mobile
    document.getElementById('main').addEventListener('click', () => {
        if (dom.sidebar.classList.contains('open') && window.innerWidth <= BREAKPOINTS.mobile) {
            dom.sidebar.classList.remove('open');
            dom.menuToggle.classList.remove('open');
        }
    });
}

/**
 * Location selection and geolocation
 */
function setupLocationListeners() {
    // City selection
    dom.city.addEventListener('change', (e) => {
        state.cityIndex = parseInt(e.target.value);
        const city = CITIES[state.cityIndex];
        state.lat = city.lat;
        state.lon = city.lon;

        updateLatLonDisplay();
        updateScene();
        initMap(state.lat, state.lon);
    });

    // Use current location button
    document.getElementById('use-current-location').addEventListener('click', () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    updateLocation(lat, lon);
                    sceneState.map.setView([lat, lon], 13);
                    dom.city.value = '0'; // Set to "Custom Location"
                },
                (error) => {
                    alert('Unable to get your location. Please ensure location permissions are enabled.');
                }
            );
        } else {
            alert('Geolocation is not supported by your browser.');
        }
    });
}

/**
 * Date and time input handlers
 */
function setupDateTimeListeners() {
    // Date
    dom.date.addEventListener('change', (e) => {
        state.date = new Date(e.target.value + 'T12:00:00');
        updateScene();
    });

    // Time (throttled with RAF for smooth performance)
    dom.time.addEventListener('input', (e) => {
        state.timeMinutes = parseInt(e.target.value);
        updateTimeDisplay(); // Always update display immediately

        // Throttle expensive updates to animation frame
        if (!sceneState.pendingUpdate) {
            sceneState.pendingUpdate = true;
            requestAnimationFrame(() => {
                updateScene();
                sceneState.pendingUpdate = false;
            });
        }
    });
}

/**
 * Object type selection
 */
function setupObjectListeners() {
    document.querySelectorAll('input[name="object-type"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            state.objectType = e.target.value;

            // Set default heights based on type
            state.height = DEFAULT_HEIGHTS[state.objectType] || DEFAULT_HEIGHTS.human;

            updateHeightInputsFromState();
            updateScene();
        });
    });
}

/**
 * Height input handlers (metric and imperial)
 */
function setupHeightListeners() {
    // Height (Metric)
    dom.heightMetric.addEventListener('input', (e) => {
        state.height = parseFloat(e.target.value);
        updateScene();
    });

    // Height (Imperial)
    const updateImperialHeight = () => {
        const ft = parseFloat(dom.heightFt.value) || 0;
        const inches = parseFloat(dom.heightIn.value) || 0;
        // Convert feet/inches to meters
        state.height = (ft * 0.3048) + (inches * 0.0254);
        updateScene();
    };
    dom.heightFt.addEventListener('input', updateImperialHeight);
    dom.heightIn.addEventListener('input', updateImperialHeight);

    // Units Change
    document.querySelectorAll('input[name="units"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            state.units = e.target.value;
            updateHeightInputsFromState();
            updateScene();
        });
    });
}

/**
 * Display toggles (grid, triangle)
 */
function setupDisplayListeners() {
    // Grid toggle
    dom.showGrid.addEventListener('change', (e) => {
        state.showGrid = e.target.checked;
        updateScene();
    });

    // Triangle diagram toggle
    dom.showTriangle.addEventListener('change', (e) => {
        if (e.target.checked) {
            dom.triangleContainer.classList.remove('hidden');
            // Update triangle now that it's visible
            updateTriangle(getSolarPosition());
        } else {
            dom.triangleContainer.classList.add('hidden');
        }
        updateInfoPanelVisibility();

        // Resize scene on desktop only
        if (window.innerWidth > BREAKPOINTS.mobile) {
            setTimeout(onWindowResize, 50);
        }
    });
}

/**
 * Play/Pause animation for the day
 */
function setupAnimationListeners() {
    if (!dom.playPauseBtn) return;

    dom.playPauseBtn.addEventListener('click', () => {
        sceneState.isPlaying = !sceneState.isPlaying;
        
        if (sceneState.isPlaying) {
            // Change icon to pause
            dom.playPauseBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                    <rect x="6" y="4" width="4" height="16"></rect>
                    <rect x="14" y="4" width="4" height="16"></rect>
                </svg>`;
            startAnimation();
        } else {
            // Change icon to play
            dom.playPauseBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>`;
            stopAnimation();
        }
    });

    function startAnimation() {
        let lastTime = performance.now();
        
        function tick(now) {
            if (!sceneState.isPlaying) return;
            
            const delta = (now - lastTime) / 1000; // seconds
            lastTime = now;
            
            const solar = getSolarPosition();
            const isSunUp = solar.altitudeDeg > 0;
            
            if (isSunUp) {
                // 1440 minutes in a day. 15 seconds to complete a full day.
                state.timeMinutes += 96 * delta;
            } else {
                if (dom.timeLoop && dom.timeLoop.checked) {
                    state.timeMinutes += 960 * delta; // fast forward night
                } else {
                    // Sun below horizon and not looping -> Stop
                    sceneState.isPlaying = false;
                    dom.playPauseBtn.innerHTML = `
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>`;
                    updateTimeDisplay();
                    updateScene();
                    return; // stop
                }
            }
            
            if (state.timeMinutes >= 1440) {
                state.timeMinutes = 0;
                if (!dom.timeLoop || !dom.timeLoop.checked) {
                    sceneState.isPlaying = false;
                    dom.playPauseBtn.innerHTML = `
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>`;
                    
                    dom.time.value = 0;
                    updateTimeDisplay();
                    updateScene();
                    return; // stop
                }
            }
            
            // update UI
            dom.time.value = Math.floor(state.timeMinutes);
            updateTimeDisplay();
            
            // update scene
            updateScene();
            
            sceneState.animationFrameId = requestAnimationFrame(tick);
        }
        
        sceneState.animationFrameId = requestAnimationFrame(tick);
    }

    function stopAnimation() {
        if (sceneState.animationFrameId) {
            cancelAnimationFrame(sceneState.animationFrameId);
            sceneState.animationFrameId = null;
        }
    }
}
