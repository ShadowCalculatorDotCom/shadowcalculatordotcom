import { dom, sceneState } from './state.js';

import { getViewSize } from './utils.js';
import * as THREE from 'three';

export function initScene() {
    const container = dom.sceneContainer;

    // Scene
    sceneState.scene = new THREE.Scene();
    sceneState.scene.background = null;

    // Camera (orthographic for consistent shadow visualization)
    const aspect = container.clientWidth / container.clientHeight;
    const viewSize = getViewSize();
    sceneState.camera = new THREE.OrthographicCamera(
        -viewSize * aspect, viewSize * aspect,
        viewSize, -viewSize,
        0.1, 1000
    );
    sceneState.camera.position.set(6, 6, 6);
    sceneState.camera.lookAt(0, 0, 0);

    // Renderer
    sceneState.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    sceneState.renderer.setSize(container.clientWidth, container.clientHeight);
    sceneState.renderer.setPixelRatio(window.devicePixelRatio);
    sceneState.renderer.shadowMap.enabled = true;
    sceneState.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(sceneState.renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    sceneState.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
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

    // Ground Plane
    const planeGeometry = new THREE.PlaneGeometry(20, 20);
    const planeMaterial = new THREE.ShadowMaterial({ opacity: 0.4 });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = 0.001;
    plane.receiveShadow = true;
    sceneState.scene.add(plane);

    // Grid
    sceneState.gridHelper = new THREE.GridHelper(10, 20, 0xaaaaaa, 0xdddddd);
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

    const texture = new THREE.CanvasTexture(canvas);
    const northMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.7,
        depthWrite: false
    });

    const northGeometry = new THREE.PlaneGeometry(0.8, 0.8);
    const northMarker = new THREE.Mesh(northGeometry, northMaterial);
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

    const textureS = new THREE.CanvasTexture(canvasS);
    const southMaterial = new THREE.MeshBasicMaterial({
        map: textureS,
        transparent: true,
        opacity: 0.7,
        depthWrite: false
    });

    const southGeometry = new THREE.PlaneGeometry(0.8, 0.8);
    const southMarker = new THREE.Mesh(southGeometry, southMaterial);
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
    const viewSize = getViewSize();

    sceneState.camera.left = -viewSize * aspect;
    sceneState.camera.right = viewSize * aspect;
    sceneState.camera.top = viewSize;
    sceneState.camera.bottom = -viewSize;
    sceneState.camera.updateProjectionMatrix();

    sceneState.renderer.setSize(width, height);
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