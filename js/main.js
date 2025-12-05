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
    updateTriangle
} from './ui.js';
import { estimateTimezoneFromLongitude } from './utils.js';
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

    // Set time to current local time
    const currentTimeMinutes = today.getHours() * 60 + today.getMinutes();
    state.timeMinutes = currentTimeMinutes;
    dom.time.value = currentTimeMinutes;


    // Initialize displays
    updateLatLonDisplay();
    updateTimeDisplay();
    updateHeightInputsFromState();

    // Initialize Three.js scene
    initScene();

    // Setup event listeners
    setupEventListeners();

    updateInfoPanelVisibility();

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