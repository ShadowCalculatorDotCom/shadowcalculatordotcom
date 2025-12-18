import { CITIES } from './data.js';
import { state } from './state.js';

export function getSolarPosition() {
    const city = CITIES[state.cityIndex];
    const dt = createDateTime(state.date, state.timeMinutes, city.tz);
    // Assumes SunCalc is loaded globally via script tag
    const pos = window.SunCalc.getPosition(dt, state.lat, state.lon);

    // Calculate intermediate values for educational display
    // These are approximations to match the "math" behind the black box
    const dayOfYear = getDayOfYear(dt);
    const B = (360 / 365) * (dayOfYear - 81) * (Math.PI / 180);
    const equationOfTime = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
    const declination = 23.45 * Math.sin(B); // Approx declination in degrees

    // Local Solar Time (approx)
    const timeOffset = equationOfTime + 4 * (state.lon - (15 * Math.round(state.lon / 15)));
    const lst = state.timeMinutes + timeOffset;
    const hourAngle = (lst / 4) - 180; // degrees

    return {
        altitude: pos.altitude,
        azimuth: pos.azimuth,
        altitudeDeg: pos.altitude * 180 / Math.PI,
        azimuthDeg: pos.azimuth * 180 / Math.PI,
        // Educational params
        declination: declination,
        hourAngle: hourAngle,
        latitude: state.lat
    };
}

function getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
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