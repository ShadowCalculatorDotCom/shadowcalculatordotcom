import { dom, sceneState } from './state.js';

import { getViewSize } from './utils.js';

import {
    Scene,
    OrthographicCamera,
    WebGLRenderer,
    PCFSoftShadowMap,
    AmbientLight,
    DirectionalLight,
    PlaneGeometry,
    ShadowMaterial,
    Mesh,
    GridHelper,
    CanvasTexture,
    MeshBasicMaterial
} from 'three';

export function initScene() {
    const container = dom.sceneContainer;

    // Scene
    sceneState.scene = new Scene();
    sceneState.scene.background = null;

    // Camera (orthographic for consistent shadow visualization)
    const aspect = container.clientWidth / container.clientHeight;
    const viewSize = getViewSize();
    sceneState.camera = new OrthographicCamera(
        -viewSize * aspect, viewSize * aspect,
        viewSize, -viewSize,
        0.1, 1000
    );
    sceneState.camera.position.set(6, 6, 6);
    sceneState.camera.lookAt(0, 0, 0);

    // Renderer
    sceneState.renderer = new WebGLRenderer({ antialias: true, alpha: true });
    sceneState.renderer.setSize(container.clientWidth, container.clientHeight);
    sceneState.renderer.setPixelRatio(window.devicePixelRatio);
    sceneState.renderer.shadowMap.enabled = true;
    sceneState.renderer.shadowMap.type = PCFSoftShadowMap;
    container.appendChild(sceneState.renderer.domElement);

    // Lights
    const ambientLight = new AmbientLight(0xffffff, 0.6);
    sceneState.scene.add(ambientLight);

    const directionalLight = new DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    const d = 10;
    directionalLight.shadow.camera.left = -d;
    directionalLight.shadow.camera.right = d;
    directionalLight.shadow.camera.top = d;
    directionalLight.shadow.camera.bottom = -d;
    sceneState.scene.add(directionalLight);

    // Ground Plane - make it huge to catch long shadows
    const planeGeometry = new PlaneGeometry(2000, 2000);
    const planeMaterial = new ShadowMaterial({ opacity: 0.4 });
    const plane = new Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = 0.001;
    plane.receiveShadow = true;
    sceneState.scene.add(plane);

    // Grid
    sceneState.gridHelper = new GridHelper(10, 20, 0xaaaaaa, 0xdddddd);
    sceneState.gridHelper.material.opacity = 0.38;
    sceneState.gridHelper.material.transparent = true;
    sceneState.scene.add(sceneState.gridHelper);

    // Add "N" for North indicator
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#16A34A';
    ctx.font = 'bold 100px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', 64, 64);

    const texture = new CanvasTexture(canvas);
    const northMaterial = new MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.7,
        depthWrite: false
    });

    const northGeometry = new PlaneGeometry(0.8, 0.8);
    const northMarker = new Mesh(northGeometry, northMaterial);
    northMarker.rotation.x = -Math.PI / 2; // Lay flat on ground
    northMarker.position.set(0, 0.01, -4.5); // Position at north edge of grid
    sceneState.scene.add(northMarker);

    // Add "S" for South indicator
    const canvasS = document.createElement('canvas');
    canvasS.width = 128;
    canvasS.height = 128;
    const ctxS = canvasS.getContext('2d');
    ctxS.fillStyle = '#16A34A';
    ctxS.font = 'bold 100px Inter, Arial, sans-serif';
    ctxS.textAlign = 'center';
    ctxS.textBaseline = 'middle';
    ctxS.fillText('S', 64, 64);

    const textureS = new CanvasTexture(canvasS);
    const southMaterial = new MeshBasicMaterial({
        map: textureS,
        transparent: true,
        opacity: 0.7,
        depthWrite: false
    });

    const southGeometry = new PlaneGeometry(0.8, 0.8);
    const southMarker = new Mesh(southGeometry, southMaterial);
    southMarker.rotation.x = -Math.PI / 2; // Lay flat on ground
    southMarker.position.set(0, 0.01, 4.5); // Position at south edge of grid (positive Z)
    sceneState.scene.add(southMarker);

    // Start animation loop
    animate();

    // Handle resize
    window.addEventListener('resize', onWindowResize);
}

export function onWindowResize() {
    const container = dom.sceneContainer;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const aspect = width / height;
    // Get view size based on current object height
    const viewSize = getViewSize(sceneState.currentObjectHeight || 1.75);

    sceneState.camera.left = -viewSize * aspect;
    sceneState.camera.right = viewSize * aspect;
    sceneState.camera.top = viewSize;
    sceneState.camera.bottom = -viewSize;

    sceneState.camera.updateProjectionMatrix();

    sceneState.renderer.setSize(width, height);
}

// Helper to update camera when object changes
export function updateCameraSize(height) {
    sceneState.currentObjectHeight = height;

    // Update main camera
    onWindowResize();

    // Update Shadow Camera
    const light = sceneState.scene.children.find(c => c.isDirectionalLight);
    if (light) {
        // Use the same viewSize logic but slightly larger to ensure shadows don't clip
        // getViewSize calculates the scale based on object height.
        // We multiply by a factor (e.g., 4) because shadows can get very long at low angles.
        const viewSize = getViewSize(height);
        const d = viewSize * 3; // Shadow box size

        light.shadow.camera.left = -d;
        light.shadow.camera.right = d;
        light.shadow.camera.top = d;
        light.shadow.camera.bottom = -d;

        // Also increase far plane if needed for tall objects
        light.shadow.camera.far = 50 + (height * 5);

        light.shadow.camera.updateProjectionMatrix();
    }
}

function animate() {
    requestAnimationFrame(animate);
    if (sceneState.renderer && sceneState.scene && sceneState.camera) {
        sceneState.renderer.render(sceneState.scene, sceneState.camera);
    }
}

export function updateLightPosition(solar) {
    const light = sceneState.scene.children.find(c => c.isDirectionalLight);
    if (!light) return;

    if (solar.altitudeDeg <= 0) {
        // Sun below horizon - disable light and shadows
        light.intensity = 0;
        light.castShadow = false;
    } else {
        // Sun above horizon - enable light and shadows
        light.intensity = 0.5;
        light.castShadow = true;
        // Position light based on solar position
        const dist = 20;
        const x = Math.sin(solar.azimuth) * Math.cos(solar.altitude) * dist;
        const y = Math.sin(solar.altitude) * dist;
        const z = Math.cos(solar.azimuth) * Math.cos(solar.altitude) * dist;

        light.position.set(x, y, z);
        light.updateMatrixWorld();
    }
}

// Rotation state
let isRotating = false;

export function rotateCamera() {
    if (isRotating) return;
    isRotating = true;

    const duration = 600; // ms
    const startTime = performance.now();

    // We rotate 90 degrees clockwise
    // Current angle index is 0-3.
    // We were setting position based on fixed quadrants.
    // Better strategy: Tween the angle itself.

    // Calculate current angle logic: 
    // 0 (6,6) = 45 deg = PI/4
    // 1 (6,-6) = -45 deg = -PI/4
    // 2 (-6,-6) = -135 deg = -3PI/4
    // 3 (-6,6) = 135 deg = 3PI/4

    // Simplification: Just track total rotation in radians
    if (sceneState.targetCameraAngle === undefined) {
        sceneState.targetCameraAngle = Math.PI / 4; // Start at 45 deg
    }

    const startAngle = sceneState.targetCameraAngle;
    const endAngle = startAngle - (Math.PI / 2); // Rotate right (CW)
    sceneState.targetCameraAngle = endAngle;

    // Radius on XZ plane (distance from 0,0,0)
    // x=6, z=6 => r = sqrt(6^2 + 6^2) = sqrt(72)
    const radius = Math.sqrt(72);

    function animateRotation(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing: easeOutCubic
        const ease = 1 - Math.pow(1 - progress, 3);

        const currentAngle = startAngle + (endAngle - startAngle) * ease;

        // Convert polar to cartesian
        // In Three.js: x is right, z is forward/back used for depth
        const x = radius * Math.sin(currentAngle);
        const z = radius * Math.cos(currentAngle);

        sceneState.camera.position.set(x, 6, z);
        sceneState.camera.lookAt(0, 0, 0);

        // We rely on the main animate loop to render, but force update matrix
        sceneState.camera.updateMatrixWorld();

        if (progress < 1) {
            requestAnimationFrame(animateRotation);
        } else {
            isRotating = false;
        }
    }

    requestAnimationFrame(animateRotation);
}