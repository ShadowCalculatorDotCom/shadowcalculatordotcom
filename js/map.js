import { state, dom, sceneState } from './state.js';
import { updateLatLonDisplay, updateScene } from './ui.js';
import { estimateTimezoneFromLongitude } from './utils.js';
import { CITIES, CUSTOM_CITY_INDEX } from './data.js';

function loadLeaflet() {
    return new Promise((resolve) => {
        // Check if already loaded
        if (window.L && window.L.Control.Geocoder) {
            resolve();
            return;
        }

        // Load CSS files
        const leafletCss = document.createElement('link');
        leafletCss.rel = 'stylesheet';
        leafletCss.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(leafletCss);

        const geocoderCss = document.createElement('link');
        geocoderCss.rel = 'stylesheet';
        geocoderCss.href = 'https://unpkg.com/leaflet-control-geocoder/dist/Control.Geocoder.css';
        document.head.appendChild(geocoderCss);

        // Gesture handling CSS (for two-finger scroll on mobile)
        const gestureCss = document.createElement('link');
        gestureCss.rel = 'stylesheet';
        gestureCss.href = 'https://unpkg.com/leaflet-gesture-handling/dist/leaflet-gesture-handling.min.css';
        document.head.appendChild(gestureCss);

        // Load Leaflet JS first, then Geocoder, then Gesture Handling
        const leafletJs = document.createElement('script');
        leafletJs.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        leafletJs.onload = () => {
            const geocoderJs = document.createElement('script');
            geocoderJs.src = 'https://unpkg.com/leaflet-control-geocoder/dist/Control.Geocoder.js';
            geocoderJs.onload = () => {
                const gestureJs = document.createElement('script');
                gestureJs.src = 'https://unpkg.com/leaflet-gesture-handling/dist/leaflet-gesture-handling.min.js';
                gestureJs.onload = resolve;
                document.head.appendChild(gestureJs);
            };
            document.head.appendChild(geocoderJs);
        };
        document.head.appendChild(leafletJs);
    });
}

export function lazyInitMap() {
    if (sceneState.mapInitialized || sceneState.mapLoadPending) return;
    sceneState.mapLoadPending = true;

    // Small delay to ensure Three.js renders first
    // Polyfill/fallback for Safari which doesn't support requestIdleCallback
    if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
            loadLeaflet().then(() => {
                initMap(state.lat, state.lon);
                sceneState.mapInitialized = true;
            });
        }, { timeout: 1000 });
    } else {
        setTimeout(() => {
            loadLeaflet().then(() => {
                initMap(state.lat, state.lon);
                sceneState.mapInitialized = true;
            });
        }, 100);
    }
}

// Initialize Leaflet map
export function initMap(lat, lon) {
    if (!sceneState.map) {
        // Create map centered on initial location
        // gestureHandling requires two-finger touch on mobile to pan
        sceneState.map = window.L.map('map', {
            gestureHandling: true
        }).setView([lat, lon], 10);

        // Add CartoDB Positron tiles (clean, minimal style)
        window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors, © CARTO',
            maxZoom: 19
        }).addTo(sceneState.map);

        // Add geocoder (search) control
        const geocoder = window.L.Control.Geocoder.nominatim();
        const geocoderControl = window.L.Control.geocoder({
            geocoder: geocoder,
            defaultMarkGeocode: false
        })
            .on('markgeocode', function (e) {
                const latlng = e.geocode.center;
                updateLocation(latlng.lat, latlng.lng);
                sceneState.map.setView(latlng, 13);
            })
            .addTo(sceneState.map);

        // Fix accessibility warning (missing id/name)
        const geocoderContainer = geocoderControl.getContainer();
        const searchInput = geocoderContainer.querySelector('input');
        if (searchInput) {
            searchInput.setAttribute('id', 'location-search');
            searchInput.setAttribute('name', 'location-search');
        }

        // Add marker
        sceneState.marker = window.L.marker([lat, lon], { draggable: true }).addTo(sceneState.map);

        // Update on marker drag
        sceneState.marker.on('dragend', function (e) {
            const latlng = sceneState.marker.getLatLng();
            updateLocation(latlng.lat, latlng.lng);
        });

        // Update on map click
        sceneState.map.on('click', function (e) {
            updateLocation(e.latlng.lat, e.latlng.lng);
        });
    } else {
        // Just update existing map
        sceneState.map.setView([lat, lon], sceneState.map.getZoom());
        sceneState.marker.setLatLng([lat, lon]);
    }
}

// Update location coordinates
export function updateLocation(lat, lon) {
    // Update marker position
    if (sceneState.marker) {
        sceneState.marker.setLatLng([lat, lon]);
    }

    // Update state
    state.lat = lat;
    state.lon = lon;

    // Update Custom Location data
    state.cityIndex = CUSTOM_CITY_INDEX; // Set state to Custom
    CITIES[CUSTOM_CITY_INDEX].lat = lat;
    CITIES[CUSTOM_CITY_INDEX].lon = lon;
    CITIES[CUSTOM_CITY_INDEX].tz = estimateTimezoneFromLongitude(lon);

    dom.city.value = '0'; // Update dropdown

    // Update display
    updateLatLonDisplay();

    // Trigger shadow calculation
    updateScene();
}