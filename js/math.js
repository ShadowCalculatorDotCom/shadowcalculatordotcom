import { CITIES } from './data.js';
import { state } from './state.js';

export function getSolarPosition() {
    const city = CITIES[state.cityIndex];
    const dt = createDateTime(state.date, state.timeMinutes, city.tz);
    // Assumes SunCalc is loaded globally via script tag
    const pos = window.SunCalc.getPosition(dt, state.lat, state.lon);

    return {
        altitude: pos.altitude,
        azimuth: pos.azimuth,
        altitudeDeg: pos.altitude * 180 / Math.PI,
        azimuthDeg: pos.azimuth * 180 / Math.PI
    };
}

export function createDateTime(date, minutes, timezone) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    // Create a date in the specified timezone
    if (timezone && typeof Intl !== 'undefined') {
        let guess = new Date(Date.UTC(year, month, day, hours, mins, 0));

        // Iterate to find correct UTC time for desired local time
        for (let i = 0; i < 3; i++) {
            const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });

            const parts = formatter.formatToParts(guess);
            const getValue = (type) => parts.find(p => p.type === type)?.value;

            const localYear = parseInt(getValue('year'));
            const localMonth = parseInt(getValue('month')) - 1;
            const localDay = parseInt(getValue('day'));
            const localHour = parseInt(getValue('hour'));
            const localMinute = parseInt(getValue('minute'));

            const desiredUTC = Date.UTC(year, month, day, hours, mins, 0);
            const actualUTC = Date.UTC(localYear, localMonth, localDay, localHour, localMinute, 0);

            const diff = actualUTC - desiredUTC;
            if (Math.abs(diff) < 60000) break; // within 1 minute

            guess = new Date(guess.getTime() - diff);
        }

        return guess;
    }

    return new Date(year, month, day, hours, mins, 0);
}

export function calculateShadowLength(height, altitude) {
    if (altitude <= 0) return 0;
    return height / Math.tan(altitude);
}