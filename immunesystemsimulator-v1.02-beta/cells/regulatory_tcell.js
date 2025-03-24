import * as THREE from 'three';
import { CellDynamics } from './cell_dynamics.js';
import { createSignalSphere } from './signal_viz.js';

export class RegulatoryTCell {
    constructor(scene) {
        this.scene = scene;
        this.speed = 0.05;
        this.suppressionRadius = 3.5;
        this.suppressionStrength = 0.6;
        this.pulseTimer = 0;
        this.pulseInterval = 30; // Pulse every half second
        this.energy = 600;
        this.state = 'patrolling';
        this.suppressionDuration = 0;
        this.maxSuppressionDuration = 300; // 5 seconds at 60fps
        this.restDuration = 0;
        this.maxRestDuration = 120; // 2 seconds rest
        this.targetPosition = null;

        this.mesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.4, 16, 16),
            new THREE.MeshStandardMaterial({ 
                color: 0x8a2be2,
                emissive: 0x4b0082,
                emissiveIntensity: 0.3,
                transparent: true,
                opacity: 0.9
            })
        );

        this.mesh.position.set(
            Math.random() * 10 - 5,
            0.5,
            Math.random() * 10 - 5
        );

        // Create suppression field visualization
        this.suppressionField = new THREE.Mesh(
            new THREE.CircleGeometry(this.suppressionRadius, 32),
            new THREE.MeshBasicMaterial({
                color: 0x8a2be2,
                transparent: true,
                opacity: 0.1
            })
        );
        this.suppressionField.rotation.x = -Math.PI / 2;
        this.suppressionField.position.y = 0.1;
        
        this.mesh.add(this.suppressionField);
        scene.add(this.mesh);
    }

    update(chemicalField, immuneCells) {
        this.pulseTimer++;
        
        // Energy consumption
        this.energy -= 0.1;
        if (this.energy <= 0) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
            this.suppressionField.geometry.dispose();
            this.suppressionField.material.dispose();
            this.dead = true;
            return;
        }

        // State machine
        switch(this.state) {
            case 'patrolling':
                this._handlePatrolling(chemicalField);
                break;
            case 'suppressing':
                this._handleSuppressing(immuneCells);
                break;
            case 'resting':
                this._handleResting();
                break;
        }

        // Pulsing effect
        if (this.pulseTimer % this.pulseInterval === 0) {
            const pulseIntensity = (Math.sin(this.pulseTimer * 0.1) * 0.3 + 0.7);
            this.suppressionField.material.opacity = 0.1 * pulseIntensity;
            this.mesh.material.emissiveIntensity = 0.3 * pulseIntensity;
            
            // Create pulse effect
            if (this.state === 'suppressing') {
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2;
                    const radius = this.suppressionRadius * (0.3 + Math.random() * 0.4);
                    const offset = new THREE.Vector3(
                        Math.cos(angle) * radius,
                        0,
                        Math.sin(angle) * radius
                    );
                    createSignalSphere(this.scene, this.mesh.position.clone().add(offset), 0x8a2be2);
                }
            }
        }

        // Apply suppression effect to nearby immune cells
        if (this.state === 'suppressing') {
            for (let cell of immuneCells) {
                if (cell === this || !cell.mesh) continue;
                
                const distance = this.mesh.position.distanceTo(cell.mesh.position);
                if (distance < this.suppressionRadius) {
                    // Calculate suppression factor based on distance
                    const suppressionFactor = 1 - (distance / this.suppressionRadius);
                    
                    // Apply suppression effects
                    if (cell.speed) {
                        cell.speed *= (1 - suppressionFactor * this.suppressionStrength);
                    }
                    
                    // Visual feedback for suppressed cells
                    if (Math.random() < 0.05) {
                        createSignalSphere(this.scene, cell.mesh.position, 0x8a2be2);
                    }
                }
            }
        }

        // Keep within bounds
        const maxBound = 9.5;
        const minBound = -9.5;
        this.mesh.position.x = Math.max(minBound, Math.min(maxBound, this.mesh.position.x));
        this.mesh.position.z = Math.max(minBound, Math.min(maxBound, this.mesh.position.z));
    }

    _handlePatrolling(chemicalField) {
        // Follow CXCL10 gradient with some randomness
        const gradient = chemicalField.getGradient(this.mesh.position, 'cxcl10');
        
        if (gradient.lengthSq() > 0.1) {
            // Strong signal detected, switch to suppressing
            this.state = 'suppressing';
            this.suppressionDuration = 0;
            this.mesh.material.emissiveIntensity = 0.6;
            return;
        }

        // Random movement with occasional direction changes
        if (!this.targetPosition || this.mesh.position.distanceTo(this.targetPosition) < 0.5) {
            this.targetPosition = new THREE.Vector3(
                Math.random() * 19 - 9.5,
                0.5,
                Math.random() * 19 - 9.5
            );
        }

        const direction = this.targetPosition.clone().sub(this.mesh.position).normalize();
        this.mesh.position.addScaledVector(direction, this.speed);
    }

    _handleSuppressing(immuneCells) {
        this.suppressionDuration++;
        
        // Count nearby active immune cells
        let activeImmuneCells = 0;
        for (let cell of immuneCells) {
            if (cell === this || !cell.mesh) continue;
            const distance = this.mesh.position.distanceTo(cell.mesh.position);
            if (distance < this.suppressionRadius) {
                activeImmuneCells++;
            }
        }

        // If no immune cells nearby or max duration reached, switch to resting
        if (activeImmuneCells === 0 || this.suppressionDuration >= this.maxSuppressionDuration) {
            this.state = 'resting';
            this.restDuration = 0;
            this.mesh.material.emissiveIntensity = 0.2;
            this.suppressionField.material.opacity = 0.05;
        }
    }

    _handleResting() {
        this.restDuration++;
        
        // Slow wandering during rest
        const randomDir = new THREE.Vector3(
            Math.random() * 2 - 1,
            0,
            Math.random() * 2 - 1
        ).normalize();
        this.mesh.position.addScaledVector(randomDir, this.speed * 0.3);

        // Return to patrolling after rest
        if (this.restDuration >= this.maxRestDuration) {
            this.state = 'patrolling';
            this.mesh.material.emissiveIntensity = 0.3;
            this.suppressionField.material.opacity = 0.1;
        }
    }
}
