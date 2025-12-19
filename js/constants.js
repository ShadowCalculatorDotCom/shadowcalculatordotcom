// Configuration constants and magic numbers

// Default object heights (in meters)
export const DEFAULT_HEIGHTS = {
    human: 1.75,    // ~5'9"
    tree: 10,       // ~33ft - mature garden tree
    box: 2,         // ~6.5ft - tall fence
    house: 6        // ~20ft - 2 story house
};

// Breakpoints
export const BREAKPOINTS = {
    mobile: 768,
    narrow: 480
};

// Scene configuration
export const SCENE_CONFIG = {
    desktopViewSize: 6,
    mobileViewSize: 4,
    gridSize: 20,
    gridDivisions: 20
};

// Time configuration
export const TIME_CONFIG = {
    defaultMinutes: 720,  // 12:00 noon
    minMinutes: 0,
    maxMinutes: 1439
};

// Conversion factors
export const CONVERSIONS = {
    feetToMeters: 0.3048,
    inchesToMeters: 0.0254,
    metersToFeet: 3.28084,
    metersToInches: 39.3701
};

// Map configuration
export const MAP_CONFIG = {
    defaultZoom: 13,
    observerMargin: '100px'
};
