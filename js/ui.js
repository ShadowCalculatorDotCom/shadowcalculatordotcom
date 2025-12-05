import { state, dom, sceneState } from './state.js';
import { CITIES, CUSTOM_CITY_INDEX } from './data.js';
import { getSolarPosition, calculateShadowLength } from './math.js';
import { updateLightPosition, onWindowResize, updateCameraSize, rotateCamera } from './scene.js';
import { createObject } from './objects.js';

import { updateUrlFromState } from './utils.js';

export function initShareButton() {
    const btn = document.getElementById('share-btn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);

            // Show feedback
            const originalHTML = btn.innerHTML;
            btn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Copied!
            `;
            btn.classList.add('success');

            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.classList.remove('success');
            }, 2000);

        } catch (err) {
            console.error('Failed to copy: ', err);
            alert('Failed to copy URL');
        }
    });
}

export function initRotateButton() {
    const btn = document.getElementById('rotate-btn');
    if (!btn) return;
    btn.addEventListener('click', rotateCamera);
}

export function updateScene() {
    // Update grid visibility
    if (sceneState.gridHelper) {
        sceneState.gridHelper.visible = state.showGrid;
    }

    // Create/update object
    createObject(state.objectType, state.height);

    // Update camera zoom to fit object
    updateCameraSize(state.height);

    // Calculate solar position
    const solar = getSolarPosition();

    // Update light position
    updateLightPosition(solar);

    // Update UI
    updateSunStatus(solar);
    updateShadowInfo(solar);
    updateShadowContext();
    updateTriangle(solar);
    updateMathDetails(solar);

    // Update deep link URL
    updateUrlFromState(state);
}

function updateSunStatus(solar) {
    const hours = Math.floor(state.timeMinutes / 60);
    const minutes = state.timeMinutes % 60;
    const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    if (solar.altitudeDeg <= 0) {
        dom.sunStatus.textContent = `Sun is below horizon at ${timeStr}. No shadow cast.`;
        dom.sunStatus.className = 'status error';
    } else {
        dom.sunStatus.textContent = `Sun altitude: ${solar.altitudeDeg.toFixed(1)}° at ${timeStr}`;
        dom.sunStatus.className = 'status success';
    }
}

function updateShadowInfo(solar) {
    if (solar.altitudeDeg <= 0) {
        dom.shadowLength.textContent = 'No shadow';
        return;
    }

    const length = calculateShadowLength(state.height, solar.altitude);

    if (state.units === 'metric') {
        if (length < 1) {
            dom.shadowLength.textContent = `${(length * 100).toFixed(0)} cm`;
        } else {
            dom.shadowLength.textContent = `${length.toFixed(2)} m`;
        }
    } else {
        const feet = length * 3.28084;
        const ft = Math.floor(feet);
        const inches = Math.round((feet - ft) * 12);
        dom.shadowLength.textContent = `${ft}' ${inches}"`;
    }
}

function updateShadowContext() {
    const city = CITIES[state.cityIndex];
    const hours = Math.floor(state.timeMinutes / 60);
    const minutes = state.timeMinutes % 60;
    const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    const dateStr = new Date(state.date.getTime() - state.date.getTimezoneOffset() * 60000).toISOString().split('T')[0];

    let locationStr;
    if (state.cityIndex === CUSTOM_CITY_INDEX) {
        const latDir = state.lat >= 0 ? 'N' : 'S';
        const lonDir = state.lon >= 0 ? 'E' : 'W';
        locationStr = `${Math.abs(state.lat).toFixed(1)}°${latDir}, ${Math.abs(state.lon).toFixed(1)}°${lonDir}`;
    } else {
        locationStr = city.name;
    }

    dom.shadowContext.textContent = `${dateStr} at ${timeStr} • ${locationStr}`;
}

function updateMathDetails(solar) {
    if (!state.showMath) {
        dom.mathDetails.classList.remove('visible');
        return;
    }

    dom.mathDetails.classList.add('visible');

    if (solar.altitudeDeg <= 0) {
        dom.mathDetails.textContent = 'No shadow math: Sun is below horizon';
        return;
    }

    const city = CITIES[state.cityIndex];
    const length = calculateShadowLength(state.height, solar.altitude);
    const tanAlt = Math.tan(solar.altitude);

    //const dateStr = state.date.toISOString().split('T')[0];
    const dateStr = new Date(state.date.getTime() - state.date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const hours = Math.floor(state.timeMinutes / 60);
    const minutes = state.timeMinutes % 60;
    const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    dom.mathDetails.textContent = `Location: ${city.name}
Date: ${dateStr}
Time: ${timeStr} (local)

Sun Position:
  Altitude (angle above horizon): ${solar.altitudeDeg.toFixed(2)}°
  Azimuth: ${solar.azimuthDeg.toFixed(2)}°
  (0° = south, +90° = west in SunCalc convention)

Shadow Calculation:
  Formula: L = H / tan(α)
  Where:
    L = shadow length
    H = object height = ${state.height.toFixed(2)} m
    α = sun altitude = ${solar.altitudeDeg.toFixed(2)}°
  
  tan(${solar.altitudeDeg.toFixed(2)}°) = ${tanAlt.toFixed(4)}
  L = ${state.height.toFixed(2)} / ${tanAlt.toFixed(4)}
  L = ${length.toFixed(2)} m`;
}

export function updateTriangle(solar) {
    // Skip all calculations if triangle is hidden
    if (dom.triangleContainer.classList.contains('hidden')) {
        return;
    }

    if (solar.altitudeDeg <= 0) {
        // No triangle when sun is below horizon
        dom.triangleFillPath.setAttribute('d', 'M 80 190 L 80 190 L 80 190 Z');
        dom.trianglePath.setAttribute('d', 'M 80 190 L 80 190 L 80 190 Z');
        dom.angleArc.setAttribute('d', '');
        dom.heightValue.textContent = '—';
        dom.shadowValue.textContent = '—';
        dom.angleValue.textContent = '—';
        return;
    }

    const height = state.height;
    const shadowLength = calculateShadowLength(height, solar.altitude);
    const angle = solar.altitudeDeg;

    // SVG coordinates
    const baseX = 80;
    const baseY = 190;
    const maxHeight = 120;
    const maxLength = 270;

    // Scale to fit
    const scale = Math.min(
        maxHeight / height,
        maxLength / shadowLength
    );

    const heightPx = height * scale;
    const lengthPx = shadowLength * scale;

    const topX = baseX;
    const topY = baseY - heightPx;
    const endX = baseX + lengthPx;
    const endY = baseY;

    // Update triangle paths
    const trianglePath = `M ${baseX} ${baseY} L ${topX} ${topY} L ${endX} ${endY} Z`;
    dom.triangleFillPath.setAttribute('d', trianglePath);
    dom.trianglePath.setAttribute('d', trianglePath);

    // Update angle arc (at bottom-right corner)
    const arcRadius = angle > 50 ? Math.max(10, 40 - (angle - 50) * 0.6) : 40;
    const angleRad = solar.altitude;

    // Arc starts from horizontal (along shadow) and goes up to hypotenuse
    // Center of arc is at the end of the shadow (endX, endY)
    const arcStartX = endX - arcRadius; // Start left of the corner
    const arcStartY = endY;
    const arcEndX = endX - arcRadius * Math.cos(angleRad);
    const arcEndY = endY - arcRadius * Math.sin(angleRad);

    // Arc goes from horizontal line up to the hypotenuse
    const arcPath = `M ${arcStartX} ${arcStartY} A ${arcRadius} ${arcRadius} 0 0 1 ${arcEndX} ${arcEndY}`;
    dom.angleArc.setAttribute('d', arcPath);

    // Update labels
    // Height label (on left side)
    const heightLabelX = baseX - 25;
    const heightLabelY = baseY - heightPx / 2;
    dom.heightLabel.setAttribute('x', heightLabelX);
    dom.heightLabel.setAttribute('y', heightLabelY - 5);
    dom.heightValue.setAttribute('x', heightLabelX);
    dom.heightValue.setAttribute('y', heightLabelY + 15);

    // Format height value
    let heightText;
    if (state.units === 'metric') {
        if (height < 1) {
            heightText = `${(height * 100).toFixed(0)} cm`;
        } else {
            heightText = `${height.toFixed(2)} m`;
        }
    } else {
        const feet = height * 3.28084;
        const ft = Math.floor(feet);
        const inches = Math.round((feet - ft) * 12);
        if (ft === 0) {
            heightText = `${inches}"`;
        } else {
            heightText = `${ft}' ${inches}"`;
        }
    }
    dom.heightValue.textContent = heightText;

    // Shadow label (on bottom)
    const shadowLabelX = baseX + lengthPx / 2;
    const shadowLabelY = baseY + 20;
    dom.shadowLabel.setAttribute('x', shadowLabelX);
    dom.shadowLabel.setAttribute('y', shadowLabelY);
    dom.shadowValue.setAttribute('x', shadowLabelX);
    dom.shadowValue.setAttribute('y', shadowLabelY + 20);

    // Format shadow value
    let shadowText;
    if (state.units === 'metric') {
        if (shadowLength < 1) {
            shadowText = `${(shadowLength * 100).toFixed(0)} cm`;
        } else {
            shadowText = `${shadowLength.toFixed(2)} m`;
        }
    } else {
        const feet = shadowLength * 3.28084;
        const ft = Math.floor(feet);
        const inches = Math.round((feet - ft) * 12);
        shadowText = `${ft}' ${inches}"`;
    }
    dom.shadowValue.textContent = shadowText;

    // Angle label (positioned near the arc at bottom-right corner)
    const angleLabelX = endX - arcRadius - 15;
    const angleLabelY = endY - arcRadius / 2;
    const angleX = angle < 23 ? angleLabelX + 35 : angleLabelX + 5; // Shift right when angle < 23
    const angleY = angle < 23 ? angleLabelY - 10 : angleLabelY + 10; // Shift up when angle < 23  

    dom.angleValue.setAttribute('x', angleX);
    dom.angleValue.setAttribute('y', angleY);
    dom.angleValue.setAttribute('text-anchor', 'end');
    dom.angleValue.textContent = `${angle.toFixed(1)}°`;
}

export function updateHeightInputsFromState() {
    if (state.units === 'metric') {
        dom.heightMetricContainer.style.display = 'flex';
        dom.heightImperialContainer.style.display = 'none';
        dom.heightMetric.value = state.height.toFixed(2);
    } else {
        dom.heightMetricContainer.style.display = 'none';
        dom.heightImperialContainer.style.display = 'flex';
        // Convert meters to feet/inches
        const totalFeet = state.height * 3.28084;
        const ft = Math.floor(totalFeet);
        const inches = Math.round((totalFeet - ft) * 12);
        dom.heightFt.value = ft;
        dom.heightIn.value = inches;
    }
}

export function updateInfoPanelVisibility() {
    const showMath = dom.showMath.checked;
    const showTriangle = dom.showTriangle.checked;

    if (!showMath && !showTriangle) {
        dom.infoPanel.style.display = 'none';
    } else {
        dom.infoPanel.style.display = 'flex';
    }
}

export function handleLayoutChange() {
    if (window.innerWidth <= 768) {
        // Mobile: Move location to main area
        if (dom.locationSection.parentElement !== dom.mobileLocationContainer) {
            dom.mobileLocationContainer.appendChild(dom.datetimeSection);
            dom.mobileLocationContainer.appendChild(dom.locationSection);
        }
    } else {
        // Desktop: Move location back to sidebar
        if (dom.locationSection.parentElement !== dom.sidebar) {
            dom.sidebar.insertBefore(dom.datetimeSection, dom.objectSection);
            dom.sidebar.insertBefore(dom.locationSection, dom.datetimeSection);
        }
    }
}

export function updateLatLonDisplay() {
    const latDir = state.lat >= 0 ? 'N' : 'S';
    const lonDir = state.lon >= 0 ? 'E' : 'W';

    dom.latDisplay.textContent = `${Math.abs(state.lat).toFixed(1)}°${latDir}`;
    dom.lonDisplay.textContent = `${Math.abs(state.lon).toFixed(1)}°${lonDir}`;
}

export function updateTimeDisplay() {
    const hours = Math.floor(state.timeMinutes / 60);
    const minutes = state.timeMinutes % 60;
    const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    dom.timeDisplay.textContent = timeStr;
}