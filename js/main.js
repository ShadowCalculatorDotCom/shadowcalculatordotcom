import { state, dom, cacheDOMElements, sceneState } from './state.js';
import { CITIES, CUSTOM_CITY_INDEX } from './data.js';
import { DEFAULT_HEIGHTS, BREAKPOINTS, TIME_CONFIG, MAP_CONFIG } from './constants.js';
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
import { setupEventListeners } from './events.js';


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

        // Update Custom Location data
        CITIES[CUSTOM_CITY_INDEX].lat = state.lat;
        CITIES[CUSTOM_CITY_INDEX].lon = state.lon;
        CITIES[CUSTOM_CITY_INDEX].tz = estimateTimezoneFromLongitude(state.lon);

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
        state.timeMinutes = TIME_CONFIG.defaultMinutes;
        dom.time.value = TIME_CONFIG.defaultMinutes;
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
    if (window.innerWidth <= BREAKPOINTS.mobile) {
        // Mobile: true lazy load with IntersectionObserver
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                lazyInitMap();
                observer.disconnect();
            }
        }, { rootMargin: MAP_CONFIG.observerMargin }); // Load 100px before it's visible

        observer.observe(dom.map);

        // Default triangle to hidden on mobile (already hidden via class in HTML)
        // dom.showTriangle.checked = false; // User wants it visible now
        dom.showTriangle.checked = true;
        dom.triangleContainer.classList.remove('hidden');
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