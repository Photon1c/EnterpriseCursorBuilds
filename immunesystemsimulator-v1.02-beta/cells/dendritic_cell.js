// Dendritic Cell Script - dendritic_cell.js
import * as THREE from 'three';
import { createSignalSphere } from './signal_viz.js';

export class DendriticCell {
    constructor(scene, immuneSystemRef) {
        this.scene = scene;
        this.immuneSystem = immuneSystemRef;
        this.activated = false;
        this.activationTimer = 0;
        this.maxActivationDuration = 120; // 2 seconds at 60fps
        this.cxcl10Radius = 4.0;
        this.migrationSpeed = 0.08;  // Even faster migration
        this.hasSpawnedCTL = false;
        this.activationOrigin = null;
        this.speed = 0.04;
        this.migrationDistance = 0;
        this.spawnDelay = 800; // Reduced delay between CTL spawns
        this.maturationProgress = 0;
        this.detectionRadius = 2.5;
        this.signalPulseTimer = 0;

        this.mesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.35, 14, 14),
            new THREE.MeshStandardMaterial({ 
                color: 0xffa500,
                emissive: 0x000000,
                emissiveIntensity: 0.3
            })
        );
        this.mesh.position.set(Math.random() * 10 - 5, 0.5, Math.random() * 10 - 5);
        scene.add(this.mesh);
    }

    update(cancerCells, chemicalField) {
        if (!this.activated) {
            // Enhanced cancer cell detection
            for (let cell of cancerCells) {
                const distance = this.mesh.position.distanceTo(cell.mesh.position);
                if (distance < this.detectionRadius) {
                    this.activated = true;
                    this.activationOrigin = this.mesh.position.clone();
                    this.mesh.material.color.set(0xff6600);
                    this.mesh.material.emissiveIntensity = 1.0;

                    // Enhanced activation burst
                    for (let i = 0; i < 16; i++) {
                        const angle = (i / 16) * Math.PI * 2;
                        const radius = 1.5;
                        const offset = new THREE.Vector3(
                            Math.cos(angle) * radius,
                            0,
                            Math.sin(angle) * radius
                        );
                        createSignalSphere(this.scene, this.mesh.position.clone().add(offset), 0xff6600);
                    }
                    break;
                }
            }

            // Improved patrolling behavior
            if (!this.activated) {
                const gradient = chemicalField.getGradient(this.mesh.position, 'cancer');
                if (gradient.lengthSq() > 0) {
                    // Follow cancer gradient with some randomness
                    const randomOffset = new THREE.Vector3(
                        (Math.random() - 0.5) * 0.3,
                        0,
                        (Math.random() - 0.5) * 0.3
                    );
                    gradient.add(randomOffset).normalize();
                    this.mesh.position.addScaledVector(gradient, this.speed * 1.2);
                } else {
                    // Enhanced random patrol
                    const randomDir = new THREE.Vector3(
                        Math.random() * 2 - 1,
                        0,
                        Math.random() * 2 - 1
                    ).normalize();
                    this.mesh.position.addScaledVector(randomDir, this.speed * 0.8);
                }
            }
        }

        if (this.activated) {
            this.activationTimer++;
            this.signalPulseTimer++;

            // Pulsing CXCL10 signal
            const baseSignalStrength = Math.max(0.6, 2.5 * (1 - this.activationTimer / this.maxActivationDuration));
            const pulseIntensity = Math.sin(this.signalPulseTimer * 0.1) * 0.3 + 1.0;
            const signalStrength = baseSignalStrength * pulseIntensity;
            
            chemicalField.addSignal(this.mesh.position, signalStrength, 'cxcl10');

            // Enhanced visual effects during migration
            if (this.signalPulseTimer % 10 === 0) {
                const signalColor = new THREE.Color(0xff6600);
                const numSignals = Math.floor(Math.random() * 3) + 2;
                for (let i = 0; i < numSignals; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const radius = Math.random() * 0.8 + 0.4;
                    const offset = new THREE.Vector3(
                        Math.cos(angle) * radius,
                        0,
                        Math.sin(angle) * radius
                    );
                    createSignalSphere(this.scene, this.mesh.position.clone().add(offset), signalColor);
                }
            }

            // Improved migration behavior
            if (this.activationOrigin) {
                const awayVector = this.mesh.position.clone().sub(this.activationOrigin).normalize();
                // Add some randomness to migration path
                const randomOffset = new THREE.Vector3(
                    (Math.random() - 0.5) * 0.2,
                    0,
                    (Math.random() - 0.5) * 0.2
                );
                awayVector.add(randomOffset).normalize();
                this.mesh.position.addScaledVector(awayVector, this.migrationSpeed);
                this.migrationDistance = this.mesh.position.distanceTo(this.activationOrigin);

                // Enhanced CTL spawning
                if (this.migrationDistance > 4.0 && !this.hasSpawnedCTL) {
                    if (this.immuneSystem?.addTCell) {
                        // Spawn first CTL with effects
                        this.immuneSystem.addTCell(this.activationOrigin);
                        for (let i = 0; i < 12; i++) {
                            const angle = (i / 12) * Math.PI * 2;
                            const radius = 1.0;
                            const offset = new THREE.Vector3(
                                Math.cos(angle) * radius,
                                0,
                                Math.sin(angle) * radius
                            );
                            createSignalSphere(this.scene, this.activationOrigin.clone().add(offset), 0x00ffcc);
                        }

                        // Spawn second CTL after delay
                        setTimeout(() => {
                            this.immuneSystem.addTCell(this.activationOrigin);
                            for (let i = 0; i < 12; i++) {
                                const angle = (i / 12) * Math.PI * 2;
                                const radius = 1.0;
                                const offset = new THREE.Vector3(
                                    Math.cos(angle) * radius,
                                    0,
                                    Math.sin(angle) * radius
                                );
                                createSignalSphere(this.scene, this.activationOrigin.clone().add(offset), 0x00ffcc);
                            }
                        }, this.spawnDelay);
                    }
                    this.hasSpawnedCTL = true;
                }

                // Enhanced removal sequence
                if (this.hasSpawnedCTL && this.migrationDistance > 6) {
                    // Final signal burst
                    for (let i = 0; i < 12; i++) {
                        const angle = (i / 12) * Math.PI * 2;
                        const radius = 1.2;
                        const offset = new THREE.Vector3(
                            Math.cos(angle) * radius,
                            0,
                            Math.sin(angle) * radius
                        );
                        createSignalSphere(this.scene, this.mesh.position.clone().add(offset), 0xff6600);
                    }
                    this._removeSelf();
                    return;
                }
            }
        }

        // Keep within bounds with smooth transition
        const maxBound = 9.5;
        const minBound = -9.5;
        if (this.mesh.position.x > maxBound || this.mesh.position.x < minBound) {
            this.mesh.position.x = Math.max(minBound, Math.min(maxBound, this.mesh.position.x));
        }
        if (this.mesh.position.z > maxBound || this.mesh.position.z < minBound) {
            this.mesh.position.z = Math.max(minBound, Math.min(maxBound, this.mesh.position.z));
        }
    }

    _removeSelf() {
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
        this.dead = true;
    }
}
