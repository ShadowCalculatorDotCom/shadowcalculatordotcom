import { state, dom, cacheDOMElements, sceneState } from './state.js';
import { CITIES, CUSTOM_CITY_INDEX } from './data.js';
import { initScene, onWindowResize } from './scene.js';
import { initMap, lazyInitMap, updateLocation } from './map.js';
import {
    updateScene,
    updateHeightInputsFromState,
    updateInfoPanelVisibility,
    updateLatLonDisplay,
    updateTimeDisplay,
    handleLayoutChange,
    updateTriangle,
    initShareButton,
    initRotateButton
} from './ui.js';
import { estimateTimezoneFromLongitude, getParamsFromUrl } from './utils.js';
import { getSolarPosition } from './math.js';

function setupEventListeners() {
    // Mobile menu toggle
    dom.menuToggle.addEventListener('click', () => {
        dom.sidebar.classList.toggle('open');
    });

    // Close sidebar when clicking outside on mobile
    document.getElementById('main').addEventListener('click', () => {
        if (dom.sidebar.classList.contains('open') && window.innerWidth <= 768) {
            dom.sidebar.classList.remove('open');
        }
    });

    // City selection
    // For Custom Location (value 0), this uses the last lat/lon set by sliders
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

    // Object type
    document.querySelectorAll('input[name="object-type"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            state.objectType = e.target.value;

            // set default heights based on type
            // Human: 1.75m (approx 5'9")
            // Tree: 10m (approx 33ft - mature garden tree)
            // Box/Post: 2m (approx 6.5ft - tall fence)
            // House: 6m (approx 20ft - 2 story house)
            switch (state.objectType) {
                case 'human':
                    state.height = 1.75;
                    break;
                case 'tree':
                    state.height = 10;
                    break;
                case 'box':
                    state.height = 2;
                    break;
                case 'house':
                    state.height = 6;
                    break;
            }

            updateHeightInputsFromState();
            updateScene();
        });
    });

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
    // Grid toggle
    dom.showGrid.addEventListener('change', (e) => {
        state.showGrid = e.target.checked;
        updateScene();
    });

    // Math details toggle
    dom.showMath.addEventListener('change', (e) => {
        state.showMath = e.target.checked;
        updateScene();
        updateInfoPanelVisibility();

        // Resize scene on desktop only
        if (window.innerWidth > 768) {
            setTimeout(onWindowResize, 50);
        }
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
        if (window.innerWidth > 768) {
            setTimeout(onWindowResize, 50);
        }
    });
}

function init() {
    // Cache DOM elements first
    cacheDOMElements();

    // Set default date to today
    const today = new Date();
    const dateStr = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    dom.date.value = dateStr;
    state.date = today;

    // Check for URL parameters first
    const params = getParamsFromUrl();
    const hasLocationParams = params.lat && params.lon;

    if (hasLocationParams) {
        // Hydrate from URL
        state.lat = parseFloat(params.lat);
        state.lon = parseFloat(params.lon);
        state.cityIndex = 0; // Custom location
        dom.city.value = '0';

        if (params.date) {
            state.date = new Date(params.date + 'T12:00:00');
            dom.date.value = params.date;
        }

        if (params.time) {
            state.timeMinutes = parseInt(params.time);
            dom.time.value = state.timeMinutes;
        }

        if (params.object) {
            state.objectType = params.object;
            // Sync radio button
            const radio = document.querySelector(`input[name="object-type"][value="${params.object}"]`);
            if (radio) radio.checked = true;
        }

        if (params.height) {
            const h = parseFloat(params.height);
            if (!isNaN(h)) {
                state.height = h;
                // Update inputs will happen via updateHeightInputsFromState call later or we call it explicitly
                // For now just setting state is enough as updateScene will use it
            }
        }

    } else {
        // Fallback: Set random city on load
        const randomCityIndex = Math.floor(Math.random() * (CITIES.length - 1)) + 1;
        state.cityIndex = randomCityIndex;
        const city = CITIES[randomCityIndex];
        state.lat = city.lat;
        state.lon = city.lon;
        dom.city.value = randomCityIndex;

        // Set time to mid-day
        state.timeMinutes = 720;
        dom.time.value = 720;
    }


    // Initialize displays
    updateLatLonDisplay();
    updateTimeDisplay();
    updateHeightInputsFromState();

    // Initialize Three.js scene
    initScene();

    // Setup event listeners
    setupEventListeners();

    updateInfoPanelVisibility();

    // Initialize share button
    initShareButton();
    initRotateButton();

    // MOVED: Handle layout before setting up observers
    handleLayoutChange();
    window.addEventListener('resize', handleLayoutChange);

    // Handle mobile defaults and layout
    if (window.innerWidth <= 768) {
        // Mobile: true lazy load with IntersectionObserver
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                lazyInitMap();
                observer.disconnect();
            }
        }, { rootMargin: '100px' }); // Load 100px before it's visible

        observer.observe(dom.map);

        // Default triangle to hidden on mobile (already hidden via class in HTML)
        dom.showTriangle.checked = false;
        updateInfoPanelVisibility();
    } else {
        // Desktop: show triangle by default and sync checkbox
        dom.showTriangle.checked = true;
        dom.triangleContainer.classList.remove('hidden');

        // Desktop: defer map load to not block Three.js, but load quickly
        lazyInitMap();
    }

    // Initial scene update
    updateScene();
}

// Start when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}