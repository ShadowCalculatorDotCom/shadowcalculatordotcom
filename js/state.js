// Application state
export const state = {
    cityIndex: 1,
    lat: 40.7128,
    lon: -74.0060,
    date: new Date(),
    timeMinutes: 720, // 12:00
    objectType: 'human',
    height: 1.75, // meters
    units: 'imperial',
    showGrid: true,
    showMath: false
};

// Cached DOM elements
export const dom = {};

export function cacheDOMElements() {
    // Triangle elements
    dom.triangleContainer = document.getElementById('triangle-container');
    dom.triangleFillPath = document.getElementById('triangle-fill-path');
    dom.trianglePath = document.getElementById('triangle-path');
    dom.angleArc = document.getElementById('angle-arc');
    dom.heightLabel = document.getElementById('height-label');
    dom.heightValue = document.getElementById('height-value');
    dom.shadowLabel = document.getElementById('shadow-label');
    dom.shadowValue = document.getElementById('shadow-value');
    dom.angleValue = document.getElementById('angle-value');

    // Info panel elements
    dom.infoPanel = document.getElementById('info-panel');
    dom.mathDetails = document.getElementById('math-details');
    dom.sunStatus = document.getElementById('sun-status');
    dom.shadowLength = document.getElementById('shadow-length');
    dom.shadowContext = document.getElementById('shadow-context');

    // Controls
    dom.showTriangle = document.getElementById('show-triangle');
    dom.showMath = document.getElementById('show-math');
    dom.showGrid = document.getElementById('show-grid');
    dom.city = document.getElementById('city');
    dom.date = document.getElementById('date');
    dom.time = document.getElementById('time');
    dom.timeDisplay = document.getElementById('time-display');

    // Height inputs
    dom.heightMetric = document.getElementById('height-metric');
    dom.heightMetricContainer = document.getElementById('height-metric-container');
    dom.heightImperialContainer = document.getElementById('height-imperial-container');
    dom.heightFt = document.getElementById('height-ft');
    dom.heightIn = document.getElementById('height-in');

    // Location
    dom.latDisplay = document.getElementById('lat-display');
    dom.lonDisplay = document.getElementById('lon-display');
    dom.map = document.getElementById('map');

    // Layout elements
    dom.sidebar = document.getElementById('sidebar');
    dom.menuToggle = document.getElementById('menu-toggle');
    dom.sceneContainer = document.getElementById('scene-container');
    dom.locationSection = document.getElementById('location-section');
    dom.objectSection = document.getElementById('object-section');
    dom.datetimeSection = document.getElementById('datetime-section');
    dom.mobileLocationContainer = document.getElementById('mobile-location-container');

    // Sun Icon and Logic
    dom.sunIcon = document.getElementById('sun-icon');

    // Quick Calculator Results
    dom.quickShadowLength = document.getElementById('quick-shadow-length');
    dom.quickSunAzimuth = document.getElementById('quick-sun-azimuth');

    // Live Formula Elements
    dom.calcL = document.getElementById('calc-L');
    dom.calcH = document.getElementById('calc-h');
    dom.calcAlpha = document.getElementById('calc-alpha');
    dom.calcResultFinal = document.getElementById('calc-result-final');
    dom.calcUnit = document.getElementById('calc-unit');
}

// Global scene/map variables (mutable)
export const sceneState = {
    scene: null,
    camera: null,
    renderer: null,
    objectMesh: null,
    gridHelper: null,
    currentObjectType: null,
    pendingUpdate: false,
    map: null,
    marker: null,
    mapInitialized: false,
    mapLoadPending: false,
    cameraAngle: 0
};