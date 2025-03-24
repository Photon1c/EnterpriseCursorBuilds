import * as THREE from 'three';
import { createSignalSphere } from './signal_viz.js';

export class CellDynamics {
    static moveTowardsTarget(position, targetPosition, speed) {
        const dir = targetPosition.clone().sub(position).normalize();
        position.addScaledVector(dir, speed);
    }

    static wander(position, speed, factor = 0.3) {
        const wander = new THREE.Vector3(
            Math.random() * 2 - 1,
            0,
            Math.random() * 2 - 1
        ).normalize();
        position.addScaledVector(wander, speed * factor);
    }

    static followChemicalGradient(position, chemicalField, chemical, speed, fatigueFactor = 1) {
        const gradient = chemicalField.getGradient(position, chemical);
        const move = gradient.lengthSq() > 0 ? gradient : new THREE.Vector3(
            Math.random() * 2 - 1,
            0,
            Math.random() * 2 - 1
        ).normalize();
        position.addScaledVector(move, speed * fatigueFactor);
    }

    static findClosestTarget(position, targets) {
        let closestTarget = null;
        let closestDistance = Infinity;

        for (let target of targets) {
            const distance = position.distanceTo(target.mesh.position);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestTarget = target;
            }
        }

        return { target: closestTarget, distance: closestDistance };
    }

    static handleAttack(scene, attacker, target, targets, onKill) {
        if (!target || !target.mesh || target.mesh.userData.beingAttacked || attacker.targetLocked) {
            return false;
        }

        target.mesh.userData.beingAttacked = true;
        attacker.targetLocked = true;

        setTimeout(() => {
            CellDynamics.finalizeKill(scene, target, targets);
            attacker.targetLocked = false;
            if (onKill) onKill();
        }, 100);

        return true;
    }

    static finalizeKill(scene, target, targets) {
        if (!target || !target.mesh || !target.mesh.geometry) return;

        scene.remove(target.mesh);
        target.mesh.geometry.dispose();
        target.mesh.material.dispose();

        const index = targets.indexOf(target);
        if (index !== -1) targets.splice(index, 1);

        if (target.mesh.userData) {
            target.mesh.userData.beingAttacked = false;
        }
    }

    static createVisualEffect(scene, position, color) {
        createSignalSphere(scene, position, color);
    }

    static updateCellState(cell, chemicalField, thresholds = { cxcl10: 0.5, suppression: 1.0 }) {
        const cxcl10 = chemicalField.getSignalAt(cell.mesh.position, 'cxcl10');
        const suppression = chemicalField.getSignalAt(cell.mesh.position, 'pd1tim3');

        // Default state is 'resting' if not set
        if (!cell.state) cell.state = 'resting';

        switch (cell.state) {
            case 'fatigued':
                cell.cooldownTimer++;
                // Make recovery more likely when chemical signals are favorable
                if (cell.cooldownTimer > cell.cooldownLimit * (suppression > 0.5 ? 1.5 : 1.0)) {
                    cell.state = 'resting';
                    cell.killCount = 0;
                    cell.cooldownTimer = 0;
                    cell.mesh.material.color.set(0x00ffcc);  // Reset to original color
                }
                break;

            case 'resting':
                // Activation requires chemical signal but isn't blocked by suppression
                if (cxcl10 > thresholds.cxcl10) {
                    cell.state = 'primed';
                    cell.mesh.material.emissive = new THREE.Color(0x220022);
                }
                break;

            case 'primed':
                // High suppression can cause fatigue
                if (suppression > thresholds.suppression) {
                    cell.state = 'fatigued';
                    cell.cooldownTimer = 0;
                    cell.mesh.material.color.set(0x444444);
                }
                // Low chemical signal returns to resting
                else if (cxcl10 < thresholds.cxcl10 * 0.5) {
                    cell.state = 'resting';
                    cell.mesh.material.emissive = new THREE.Color(0x000000);
                }
                break;
        }

        return cell.state;
    }
} 