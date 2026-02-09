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



// Expose reset function for testing
window.resetWelcome = function () {
    localStorage.removeItem('shadowcalc_welcome_seen');
    checkWelcome();
    console.log('Welcome state reset. Toast banner should appear.');
};


function checkWelcome() {
    const hasSeen = localStorage.getItem('shadowcalc_welcome_seen');
    const toast = document.getElementById('welcome-toast');
    const restartBtn = document.getElementById('restart-tour-btn');

    // Always enable the restart button
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            // Reset state logic if needed? No, just start it.
            // Maybe close toast if open?
            if (toast) toast.classList.add('hidden');
            startSpotlightTour();
        });
    }

    if (!hasSeen && toast) {
        // Show Toast if new user
        toast.classList.remove('hidden');

        // Close button click (Dismiss completely)
        const toastClose = toast.querySelector('.welcome-toast-close');
        if (toastClose) {
            toastClose.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering the banner click
                toast.classList.add('hidden');
                localStorage.setItem('shadowcalc_welcome_seen', 'true');
            });
        }

        // Banner click (Open Guide)
        toast.addEventListener('click', () => {
            toast.classList.add('hidden');
            startSpotlightTour();
        });
    }
}

// Spotlight Tour Logic
function startSpotlightTour() {
    const overlay = document.getElementById('spotlight-overlay');
    const tooltip = document.getElementById('spotlight-tooltip');

    document.body.classList.add('tour-active');

    // Elements
    const titleEl = document.getElementById('spotlight-title');
    const descEl = document.getElementById('spotlight-description');
    const progressEl = document.getElementById('spotlight-progress');
    const nextBtn = document.getElementById('spotlight-next');
    const skipBtn = document.getElementById('spotlight-skip');

    let currentStepIndex = 0;

    // Define Steps
    const steps = [
        {
            targetId: 'location-section',
            title: 'Set Location',
            description: 'Start here! Choose a city from the dropdown, use the map, or click "Use My Location".',
            placement: 'right'
        },
        {
            targetId: 'datetime-section',
            title: 'Date & Time',
            description: 'Pick a data from the calendar and/or adjust the slider to see how shadows change.',
            placement: 'right'
        },
        {
            targetId: 'object-section',
            title: 'Object Dimensions',
            description: 'Define what is casting the shadow. You can switch between 3D models and their heights.',
            placement: 'right'
        }
    ];

    // Mobile specific path
    if (window.innerWidth <= 768) {
        // Force tooltip placement
        steps.forEach(s => s.placement = 'bottom');

        // Replace the 3rd step (Object Dimensions) with Mobile Menu Step
        // Find index of object-section step
        const objStepIndex = steps.findIndex(s => s.targetId === 'object-section');
        if (objStepIndex !== -1) {
            steps[objStepIndex] = {
                targetId: 'menu-toggle', // The hamburger button
                title: 'More Settings',
                description: 'Tap this menu button to access Object Height, Type, and other advanced settings.',
                placement: 'mobile-menu-hint' // Special placement
            };
        }
    }

    function showStep(index) {
        if (index >= steps.length) {
            endTour();
            return;
        }

        const step = steps[index];
        let target = document.getElementById(step.targetId);

        // Fallback for class selectors if ID not found (specifically for sidebar-header) or if we want to target by class
        if (!target && step.targetId === 'sidebar-header') {
            target = document.querySelector('.sidebar-header');
        }

        if (!target) {
            // If target missing (e.g. mobile layout changes), skip
            showStep(index + 1);
            return;
        }

        // Highlight Target
        document.querySelectorAll('.highlight-element').forEach(el => el.classList.remove('highlight-element'));
        target.classList.add('highlight-element');

        // Update Content
        titleEl.textContent = step.title;
        descEl.textContent = step.description;
        progressEl.textContent = `${index + 1} of ${steps.length}`;
        nextBtn.textContent = index === steps.length - 1 ? 'Finish' : 'Next';

        // Show UI
        overlay.classList.add('active');
        // Wait for potential scroll jump before showing tooltip to avoid flicker

        // Scroll target into view instantly
        target.scrollIntoView({ behavior: 'auto', block: 'center' });

        // Update position after a microtask to ensure layout is settled
        setTimeout(() => {
            updateSpotlightPosition(target, tooltip, step.placement);
            tooltip.classList.add('active');
        }, 10);
    }

    function updateSpotlightPosition(target, tooltip, placement) {
        const tRect = target.getBoundingClientRect();
        const ttRect = tooltip.getBoundingClientRect();
        const gap = 12;

        let top = 0;
        let left = 0;

        // Basic placement logic
        // Basic placement logic
        if (window.innerWidth <= 768) {
            // Mobile
            if (placement === 'top') {
                // Place above target
                top = tRect.top - ttRect.height - gap;
                left = tRect.left + (tRect.width / 2) - (ttRect.width / 2);
                tooltip.setAttribute('data-placement', 'top'); // Arrow points DOWN
            } else if (placement === 'mobile-menu-hint') {
                // Place above, aligned right-ish to point to hamburger
                // User requested moving it up more to avoid covering the button
                // Now at -20px to bring it closer to the button
                top = tRect.top - ttRect.height - 20;
                // Align right edge of tooltip with right edge of screen minus margin
                left = window.innerWidth - ttRect.width - 20;
                tooltip.setAttribute('data-placement', 'mobile-menu-hint'); // Arrow points DOWN-RIGHT
            } else {
                // Default Bottom
                top = tRect.bottom + gap;
                left = (window.innerWidth - ttRect.width) / 2;
                tooltip.setAttribute('data-placement', 'bottom'); // Arrow points UP
            }
        } else {
            // Desktop
            if (placement === 'right') {
                top = tRect.top + (tRect.height / 2) - (ttRect.height / 2);
                left = tRect.right + gap;
            }
        }

        // Bounds check
        if (top < 10) top = 10;
        if (left < 10) left = 10;
        if (left + ttRect.width > window.innerWidth) left = window.innerWidth - ttRect.width - 10;

        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
    }

    function recalculatePosition() {
        if (!overlay.classList.contains('active')) return;
        const currentStep = steps[currentStepIndex];
        const target = document.getElementById(currentStep.targetId);
        if (target) {
            updateSpotlightPosition(target, tooltip, currentStep.placement);
        }
    }

    // Event Handlers
    function nextHandler() {
        currentStepIndex++;
        showStep(currentStepIndex);
    }

    function endTour() {
        overlay.classList.remove('active');
        tooltip.classList.remove('active');
        document.querySelectorAll('.highlight-element').forEach(el => el.classList.remove('highlight-element'));
        document.body.classList.remove('tour-active');

        // Cleanup listeners
        nextBtn.removeEventListener('click', nextHandler);
        skipBtn.removeEventListener('click', endTour);
        window.removeEventListener('resize', recalculatePosition);
        window.removeEventListener('scroll', recalculatePosition, true); // true for capture (sidebar scroll)

        // Save
        localStorage.setItem('shadowcalc_welcome_seen', 'true');
    }

    nextBtn.addEventListener('click', nextHandler);
    skipBtn.addEventListener('click', endTour);
    window.addEventListener('resize', recalculatePosition);
    window.addEventListener('scroll', recalculatePosition, true); // Update if user scrolls manually

    // Start
    showStep(0);
}

// Start when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Call welcome check after init
checkWelcome();