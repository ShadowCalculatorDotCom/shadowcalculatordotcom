import { state, dom, sceneState } from './state.js';
import { CITIES, CUSTOM_CITY_INDEX } from './data.js';
import { getSolarPosition, calculateShadowLength } from './math.js';
import { updateLightPosition, onWindowResize, updateCameraSize, rotateCamera } from './scene.js';
import { createObject } from './objects.js';

import { getShareUrl } from './utils.js';

export function initShareButton() {
    const btn = document.getElementById('share-btn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        try {
            const shareUrl = getShareUrl(state);
            const shareData = {
                title: 'Shadow Calculator',
                text: 'Check out this shadow simulation!',
                url: shareUrl
            };

            // Try native share first
            if (navigator.share) {
                try {
                    await navigator.share(shareData);
                    // Share successful - no need for visual feedback as OS handles it
                    return;
                } catch (shareError) {
                    // Ignore abort error (user cancelled share)
                    if (shareError.name === 'AbortError') return;
                    // Otherwise fall through to clipboard copy
                    console.log('Share failed, falling back to clipboard', shareError);
                }
            }

            // Fallback: Clipboard API
            await navigator.clipboard.writeText(shareUrl);

            // Show feedback
            const originalHTML = btn.innerHTML;
            btn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
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


}

function updateSunStatus(solar) {
    const hours = Math.floor(state.timeMinutes / 60);
    const minutes = state.timeMinutes % 60;
    const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    if (solar.altitudeDeg <= 0) {
        dom.sunStatus.textContent = `Sun is below horizon at ${timeStr}. No shadow cast.`;
        dom.sunStatus.className = 'status error';
        dom.sunStatus.style.display = 'block';
    } else {
        dom.sunStatus.textContent = '';
        dom.sunStatus.className = '';
        dom.sunStatus.style.display = 'none';
    }
}

function updateShadowInfo(solar) {
    if (solar.altitudeDeg <= 0) {
        dom.shadowLength.textContent = 'No shadow';
        // Clear detailed results
        updateCalculatorResults("—", state.height, 0, solar);
        return;
    }

    const length = calculateShadowLength(state.height, solar.altitude);

    let lengthText = "";
    if (state.units === 'metric') {
        if (length < 1) {
            lengthText = `${(length * 100).toFixed(0)} cm`;
            dom.shadowLength.textContent = lengthText;
        } else {
            lengthText = `${length.toFixed(2)} m`;
            dom.shadowLength.textContent = lengthText;
        }
    } else {
        const feet = length * 3.28084;
        const ft = Math.floor(feet);
        const inches = Math.round((feet - ft) * 12);
        lengthText = `${ft}' ${inches}"`;
        dom.shadowLength.textContent = lengthText;
    }

    updateCalculatorResults(lengthText, state.height, length, solar);

    if (dom.mobileShadowValue) {
        dom.mobileShadowValue.textContent = lengthText;
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

    // --- Dynamic Sun Icon Update ---
    const sunIcon = document.getElementById('sun-icon');
    if (sunIcon) {
        sunIcon.style.display = 'block';
        // Orbit radius relative to the top vertex of the object
        const orbitRadius = 60;
        // Sun position relative to the TOP vertex (topX, topY)
        // We want the sun to be "up and to the left" based on altitude
        // 0 degrees altitude = horizon (left)
        // 90 degrees altitude = zenith (top)

        // Calculate offsets
        // cos(0) = 1 -> full left offset
        // sin(0) = 0 -> no vertical offset (horizon)
        const sunOffsetX = -orbitRadius * Math.cos(solar.altitude);
        const sunOffsetY = -orbitRadius * Math.sin(solar.altitude);

        // Apply translation relative to the top vertex
        const sunX = topX + sunOffsetX;
        const sunY = topY + sunOffsetY;

        sunIcon.setAttribute('transform', `translate(${sunX}, ${sunY})`);
    }

    // Update Quick Calculator Results
}

function updateCalculatorResults(lengthText, heightVal, rawShadowLength, solar) {
    const quickAzimuth = document.getElementById('quick-sun-azimuth');

    if (solar.altitudeDeg <= 0) {
        if (quickAzimuth) quickAzimuth.textContent = "—";

        if (dom.calcH) {
            dom.calcH.textContent = heightVal.toFixed(2);
            dom.calcAlpha.textContent = "—";
            dom.calcResultFinal.textContent = "—";
        }

        // Clear advanced inputs if sun is down
        if (dom.eqPhi) dom.eqPhi.textContent = "—";
        if (dom.eqDelta) dom.eqDelta.textContent = "—";
        if (dom.eqAlpha) dom.eqAlpha.textContent = "—";
        if (dom.eqPhi2) dom.eqPhi2.textContent = "—";
        if (dom.eqAlpha2) dom.eqAlpha2.textContent = "—";
        if (dom.eqAzResult) dom.eqAzResult.textContent = "—";
        if (dom.sdAzVal) dom.sdAzVal.textContent = "—";
        if (dom.sdFinalResult) dom.sdFinalResult.textContent = "—";

    } else {
        // Live Formula Update
        if (dom.calcH) {
            let displayH = heightVal;
            let displayL = rawShadowLength;
            let unitText = 'm';

            if (state.units === 'imperial') {
                // Convert meters to decimal feet
                displayH = heightVal * 3.28084;
                displayL = rawShadowLength * 3.28084;
                unitText = 'ft';
            }

            dom.calcH.textContent = displayH.toFixed(2);
            dom.calcAlpha.textContent = `${solar.altitudeDeg.toFixed(1)}°`;
            dom.calcResultFinal.textContent = displayL.toFixed(2);
            if (dom.calcUnit) dom.calcUnit.textContent = unitText;
        }

        if (quickAzimuth) {
            // Convert azimuth to cardinal direction roughly
            // 0 = South, 90 = West, 180 = North, 270 = East
            let cardinal = "";
            const az = (solar.azimuthDeg + 360) % 360;
            if (az >= 337.5 || az < 22.5) cardinal = "S";
            else if (az >= 22.5 && az < 67.5) cardinal = "SW";
            else if (az >= 67.5 && az < 112.5) cardinal = "W";
            else if (az >= 112.5 && az < 157.5) cardinal = "NW";
            else if (az >= 157.5 && az < 202.5) cardinal = "N";
            else if (az >= 202.5 && az < 247.5) cardinal = "NE";
            else if (az >= 247.5 && az < 292.5) cardinal = "E";
            else if (az >= 292.5 && az < 337.5) cardinal = "SE";

            quickAzimuth.textContent = `${az.toFixed(1)}° (${cardinal})`;
        }

        // Update Advanced Formula Inputs
        // Formula: cos(Az) = (sin(δval) - sin(φval) · sin(αval)) / (cos(φval) · cos(αval))
        const phiStr = `${solar.latitude.toFixed(1)}°`;
        const deltaStr = `${solar.declination.toFixed(1)}°`;
        const alphaStr = `${solar.altitudeDeg.toFixed(1)}°`;

        if (dom.eqPhi) dom.eqPhi.textContent = phiStr;
        if (dom.eqDelta) dom.eqDelta.textContent = deltaStr;
        if (dom.eqAlpha) dom.eqAlpha.textContent = alphaStr;

        // Denominator repeats
        if (dom.eqPhi2) dom.eqPhi2.textContent = phiStr;
        if (dom.eqAlpha2) dom.eqAlpha2.textContent = alphaStr;

        if (dom.eqAzResult) dom.eqAzResult.textContent = `${solar.azimuthDeg.toFixed(1)}°`;

        // Shadow Direction Update
        if (dom.sdAzVal) dom.sdAzVal.textContent = `${solar.azimuthDeg.toFixed(1)}°`;
        if (dom.sdFinalResult) {
            const shadowDir = (solar.azimuthDeg + 180) % 360;
            // Cardinal for Shadow
            let cardinal = "";
            if (shadowDir >= 337.5 || shadowDir < 22.5) cardinal = "S";
            else if (shadowDir >= 22.5 && shadowDir < 67.5) cardinal = "SW";
            else if (shadowDir >= 67.5 && shadowDir < 112.5) cardinal = "W";
            else if (shadowDir >= 112.5 && shadowDir < 157.5) cardinal = "NW";
            else if (shadowDir >= 157.5 && shadowDir < 202.5) cardinal = "N";
            else if (shadowDir >= 202.5 && shadowDir < 247.5) cardinal = "NE";
            else if (shadowDir >= 247.5 && shadowDir < 292.5) cardinal = "E";
            else if (shadowDir >= 292.5 && shadowDir < 337.5) cardinal = "SE";

            dom.sdFinalResult.textContent = `${shadowDir.toFixed(1)}° (${cardinal})`;
        }
    }
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
    // Info panel always visible now since Shadow Info is permanent
    dom.infoPanel.style.display = 'flex';
}

export function handleLayoutChange() {
    // Safety check for required elements
    if (!dom.mobileLocationContainer || !dom.locationSection || !dom.shadowInfo || !dom.datetimeSection || !dom.triangleContainer) {
        // Elements not ready yet
        return;
    }

    if (window.innerWidth <= 768) {
        // Mobile: Move sections to main area below scene
        // Order: Date/Time -> Location -> 2D View -> Calculations
        if (dom.locationSection.parentElement !== dom.mobileLocationContainer ||
            dom.shadowInfo.parentElement !== dom.mobileLocationContainer) {

            dom.mobileLocationContainer.appendChild(dom.datetimeSection);
            dom.mobileLocationContainer.appendChild(dom.locationSection);
            dom.mobileLocationContainer.appendChild(dom.triangleContainer);
            dom.mobileLocationContainer.appendChild(dom.shadowInfo);
        }
    } else {
        // Desktop: Restore locations

        // Restore sidebar items
        if (dom.locationSection.parentElement !== dom.sidebar) {
            dom.sidebar.insertBefore(dom.datetimeSection, dom.objectSection);
            dom.sidebar.insertBefore(dom.locationSection, dom.datetimeSection);
        }

        // Restore Info Panel items
        if (dom.shadowInfo.parentElement !== dom.infoPanel) {
            dom.infoPanel.appendChild(dom.shadowInfo); // Calculations (Left)
            dom.infoPanel.appendChild(dom.triangleContainer); // Triangle (Right)
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
