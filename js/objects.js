import { sceneState } from './state.js';
import * as THREE from 'three';

// Base height for creating objects (scale from this to actual height)
const BASE_HEIGHT = 1;

export function createObject(type, height) {
    // Only rebuild geometry if type changed
    if (type !== sceneState.currentObjectType) {
        // Remove existing object
        if (sceneState.objectMesh) {
            sceneState.scene.remove(sceneState.objectMesh);
            sceneState.objectMesh.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        }

        sceneState.objectMesh = new THREE.Group();
        sceneState.currentObjectType = type;

        // Build geometry at BASE_HEIGHT (1 meter)
        if (type === 'human') {
            // Body
            const bodyGeom = new THREE.CylinderGeometry(0.1, 0.1, BASE_HEIGHT * 0.35, 16); // Shorten body height
            const bodyMat = new THREE.MeshStandardMaterial({ color: 0x16A34A });
            const body = new THREE.Mesh(bodyGeom, bodyMat);
            body.position.y = BASE_HEIGHT * 0.425; // Adjust position to make space for legs below and connect to head
            body.castShadow = true;
            sceneState.objectMesh.add(body);

            // Head
            const headGeom = new THREE.SphereGeometry(BASE_HEIGHT * 0.12, 16, 16);
            const headMat = new THREE.MeshStandardMaterial({ color: 0x16A34A });
            const head = new THREE.Mesh(headGeom, headMat);
            head.position.y = BASE_HEIGHT * 0.65;
            head.castShadow = true;
            // Arms
            const armGeom = new THREE.CylinderGeometry(0.035, 0.035, BASE_HEIGHT * 0.25, 8);
            const armMat = new THREE.MeshStandardMaterial({ color: 0x16A34A });

            const handGeom = new THREE.SphereGeometry(0.04, 8, 8);
            const handMat = new THREE.MeshStandardMaterial({ color: 0x16A34A });

            const leftArm = new THREE.Mesh(armGeom, armMat);
            leftArm.position.set(-0.15, BASE_HEIGHT * 0.42, 0);
            leftArm.rotation.z = -Math.PI / 6;
            leftArm.castShadow = true;
            sceneState.objectMesh.add(leftArm);

            const leftHand = new THREE.Mesh(handGeom, handMat);
            // Position relative to arm endpoint
            leftHand.position.set(-0.21, BASE_HEIGHT * 0.3, 0);
            leftHand.castShadow = true;
            sceneState.objectMesh.add(leftHand);

            const rightArm = new THREE.Mesh(armGeom, armMat);
            rightArm.position.set(0.15, BASE_HEIGHT * 0.42, 0);
            rightArm.rotation.z = Math.PI / 6;
            rightArm.castShadow = true;
            sceneState.objectMesh.add(rightArm);

            const rightHand = new THREE.Mesh(handGeom, handMat);
            rightHand.position.set(0.21, BASE_HEIGHT * 0.3, 0);
            rightHand.castShadow = true;
            sceneState.objectMesh.add(rightHand);

            // Legs
            const legGeom = new THREE.CylinderGeometry(0.04, 0.04, BASE_HEIGHT * 0.3, 8);
            const legMat = new THREE.MeshStandardMaterial({ color: 0x16A34A });

            const footGeom = new THREE.BoxGeometry(0.08, 0.05, 0.15);
            const footMat = new THREE.MeshStandardMaterial({ color: 0x16A34A });

            const leftLeg = new THREE.Mesh(legGeom, legMat);
            leftLeg.position.set(-0.07, BASE_HEIGHT * 0.15, 0);
            leftLeg.castShadow = true;
            sceneState.objectMesh.add(leftLeg);

            const leftFoot = new THREE.Mesh(footGeom, footMat);
            leftFoot.position.set(-0.07, 0.025, 0.02);
            leftFoot.castShadow = true;
            sceneState.objectMesh.add(leftFoot);

            const rightLeg = new THREE.Mesh(legGeom, legMat);
            rightLeg.position.set(0.07, BASE_HEIGHT * 0.15, 0);
            rightLeg.castShadow = true;
            sceneState.objectMesh.add(rightLeg);

            const rightFoot = new THREE.Mesh(footGeom, footMat);
            rightFoot.position.set(0.07, 0.025, 0.02);
            rightFoot.castShadow = true;
            sceneState.objectMesh.add(rightFoot);

            sceneState.objectMesh.add(body);
            sceneState.objectMesh.add(head);

        } else if (type === 'tree') {
            // Trunk
            const trunkGeom = new THREE.CylinderGeometry(BASE_HEIGHT * 0.05, BASE_HEIGHT * 0.08, BASE_HEIGHT * 0.4, 12);
            const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a4b2b });
            const trunk = new THREE.Mesh(trunkGeom, trunkMat);
            trunk.position.y = BASE_HEIGHT * 0.2;
            trunk.castShadow = true;

            // Canopy
            const canopyGeom = new THREE.SphereGeometry(BASE_HEIGHT * 0.35, 20, 16);
            const canopyMat = new THREE.MeshStandardMaterial({ color: 0x2f7d35 });
            const canopy = new THREE.Mesh(canopyGeom, canopyMat);
            canopy.position.y = BASE_HEIGHT * 0.55;
            canopy.castShadow = true;

            sceneState.objectMesh.add(trunk);
            sceneState.objectMesh.add(canopy);

        } else { // box
            const boxGeom = new THREE.BoxGeometry(BASE_HEIGHT * 0.3, BASE_HEIGHT, BASE_HEIGHT * 0.3);
            const boxMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
            const box = new THREE.Mesh(boxGeom, boxMat);
            box.position.y = BASE_HEIGHT / 2;
            box.castShadow = true;

            sceneState.objectMesh.add(box);
        }

        sceneState.scene.add(sceneState.objectMesh);
    }

    // Scale to target height (uniform scale preserves proportions)
    const scale = height / BASE_HEIGHT;
    sceneState.objectMesh.scale.set(scale, scale, scale);
    sceneState.objectMesh.position.y = 0; // Reset position after scaling
}