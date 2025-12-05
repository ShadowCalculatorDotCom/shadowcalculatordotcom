// Helper function to detect mobile devices
export function isMobile() {
    return window.matchMedia('(max-width: 768px)').matches;
}

// Get appropriate viewSize based on device and object height
export function getViewSize(objectHeight = 1.75) {
    const baseSize = isMobile() ? 4 : 6;
    // Scale up if object is taller than standard (approx 2m)
    // We want the view size to be at least baseSize, but larger for tall objects.
    // Factor of 1.5 provides some padding.
    const scaledSize = Math.max(baseSize, objectHeight * 1.5);
    return scaledSize;
}

// Estimate timezone from longitude (approximate, based on UTC offset)
export function estimateTimezoneFromLongitude(lon) {
    // Rough timezone estimation: 15 degrees of longitude ≈ 1 hour
    const utcOffset = Math.round(lon / 15);

    // Map common UTC offsets to timezone strings
    const tzMap = {
        '-12': 'Pacific/Wake',
        '-11': 'Pacific/Midway',
        '-10': 'Pacific/Honolulu',
        '-9': 'America/Anchorage',
        '-8': 'America/Los_Angeles',
        '-7': 'America/Denver',
        '-6': 'America/Chicago',
        '-5': 'America/New_York',
        '-4': 'America/Halifax',
        '-3': 'America/Argentina/Buenos_Aires',
        '-2': 'Atlantic/South_Georgia',
        '-1': 'Atlantic/Azores',
        '0': 'Europe/London',
        '1': 'Europe/Paris',
        '2': 'Europe/Athens',
        '3': 'Europe/Moscow',
        '4': 'Asia/Dubai',
        '5': 'Asia/Karachi',
        '6': 'Asia/Dhaka',
        '7': 'Asia/Bangkok',
        '8': 'Asia/Shanghai',
        '9': 'Asia/Tokyo',
        '10': 'Australia/Sydney',
        '11': 'Pacific/Guadalcanal',
        '12': 'Pacific/Fiji'
    };

    return tzMap[utcOffset.toString()] || 'UTC';
}

// Parse URL query parameters
export function getParamsFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return {
        lat: params.get('lat'),
        lon: params.get('lon'),
        date: params.get('date'),
        time: params.get('time'),
        object: params.get('obj'),
        height: params.get('h')
    };
}

// Update URL without reloading
// Generate share URL from state without updating browser history
export function getShareUrl(state) {
    const params = new URLSearchParams();
    params.set('lat', parseFloat(state.lat).toFixed(4));
    params.set('lon', parseFloat(state.lon).toFixed(4));

    const dateStr = state.date.toISOString().split('T')[0];
    params.set('date', dateStr);

    params.set('time', state.timeMinutes);
    params.set('obj', state.objectType);
    params.set('h', state.height);

    return `${window.location.protocol}//${window.location.host}${window.location.pathname}?${params.toString()}`;
}