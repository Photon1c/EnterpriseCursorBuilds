// CTL Script - cytotoxic_tcell.js
import * as THREE from 'three';
import { createSignalSphere } from './signal_viz.js';

export class CytotoxicTCell {
    constructor(scene, position = null) {
        this.scene = scene;
        this.energy = 500;  // Increased energy pool
        this.speed = 0.08;
        this.state = 'primed';  // Start primed when spawned by dendritic cell
        this.killCount = 0;
        this.fatigueThreshold = 5;  // Changed to 5 kills before fatigue
        this.cooldownTimer = 0;
        this.cooldownLimit = 600;  // 10 seconds at 60fps
        this.targetLocked = false;
        this.attackAnimationFrame = 0;
        this.attackCooldown = 0;
        this.currentTarget = null;

        this.mesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.45, 16, 16),
            new THREE.MeshStandardMaterial({ 
                color: 0x00ffcc,
                emissive: 0x000000,
                emissiveIntensity: 0.5
            })
        );

        this.mesh.position.set(
            position ? position.x : Math.random() * 10 - 5,
            0.5,
            position ? position.z : Math.random() * 10 - 5
        );

        scene.add(this.mesh);
        
        // Initialize kill counter if not exists
        if (typeof window !== 'undefined' && window.cancerCellsKilled === undefined) {
            window.cancerCellsKilled = 0;
        }
    }

    playAttackAnimation() {
        this.attackAnimationFrame++;
        if (this.attackAnimationFrame < 5) {
            this.mesh.material.emissive.setHex(0xff0000);
            this.mesh.material.emissiveIntensity = 1.0;
            
            // Create attack effect spheres in a circle
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                const offset = new THREE.Vector3(
                    Math.cos(angle) * 0.5,
                    0,
                    Math.sin(angle) * 0.5
                );
                createSignalSphere(this.scene, this.mesh.position.clone().add(offset), 0xff0000);
            }
        } else {
            this.mesh.material.emissive.setHex(0x000000);
            this.mesh.material.emissiveIntensity = 0.5;
            this.attackAnimationFrame = 0;
        }
    }

    killTarget(target) {
        if (!target || !target.mesh || target.dead) return;

        // Remove the target
        this.scene.remove(target.mesh);
        target.mesh.geometry.dispose();
        target.mesh.material.dispose();
        target.dead = true;

        // Update kill counter
        if (typeof window !== 'undefined') {
            window.cancerCellsKilled = (window.cancerCellsKilled || 0) + 1;
            const counter = document.getElementById('kill-counter');
            if (counter) {
                counter.textContent = `Cancer Cells Killed: ${window.cancerCellsKilled}`;
            }
        }

        // Update cell state
        this.killCount++;
        this.energy += 50;

        // Create kill effect
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const radius = 0.7;
            const offset = new THREE.Vector3(
                Math.cos(angle) * radius,
                0,
                Math.sin(angle) * radius
            );
            createSignalSphere(this.scene, this.mesh.position.clone().add(offset), 0xff0000);
        }

        // Check for fatigue
        if (this.killCount >= this.fatigueThreshold && Math.random() < 0.7) {
            this.state = 'fatigued';
            this.cooldownTimer = 0;
            this.mesh.material.color.set(0x444444);
        }
    }

    update(chemicalField, cancerCells) {
        if (this.energy <= 0) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
            this.dead = true;
            return;
        }

        // Visual indicator for fatigue recovery
        if (this.state === 'fatigued') {
            const recoveryProgress = this.cooldownTimer / this.cooldownLimit;
            const color = new THREE.Color(0x444444).lerp(new THREE.Color(0x00ffcc), recoveryProgress);
            this.mesh.material.color.set(color);
            
            if (Math.random() < 0.1) {
                createSignalSphere(this.scene, this.mesh.position, color);
            }
        }

        // Decrease attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown--;
        }

        // Handle behavior based on state
        if (this.state === 'primed') {
            let closestCell = null;
            let closestDistance = Infinity;

            // Find closest cancer cell
            for (let cell of cancerCells) {
                if (!cell.dead && cell.mesh) {
                    const distance = this.mesh.position.distanceTo(cell.mesh.position);
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestCell = cell;
                    }
                }
            }

            if (closestCell && closestDistance < 0.75 && !this.targetLocked && this.attackCooldown === 0) {
                // Attack sequence
                this.targetLocked = true;
                this.currentTarget = closestCell;
                this.attackCooldown = 30;
                this.playAttackAnimation();

                // Kill after short delay
                setTimeout(() => {
                    this.killTarget(this.currentTarget);
                    this.targetLocked = false;
                    this.currentTarget = null;
                }, 100);
            } else if (closestCell) {
                // Move towards target
                const direction = closestCell.mesh.position.clone().sub(this.mesh.position).normalize();
                this.mesh.position.addScaledVector(direction, this.speed * 1.2);
            } else {
                // Wander and follow chemical gradient
                const gradient = chemicalField.getGradient(this.mesh.position, 'cxcl10');
                const randomDir = new THREE.Vector3(Math.random() * 2 - 1, 0, Math.random() * 2 - 1).normalize();
                
                if (gradient.lengthSq() > 0) {
                    this.mesh.position.addScaledVector(gradient, this.speed * 0.8);
                } else {
                    this.mesh.position.addScaledVector(randomDir, this.speed * 0.5);
                }
            }

            // Visual effects for active state
            if (Math.random() < 0.2) {
                createSignalSphere(this.scene, this.mesh.position, 0x00ffcc);
            }
        } else if (this.state === 'fatigued') {
            // Slow wandering when fatigued
            const randomDir = new THREE.Vector3(Math.random() * 2 - 1, 0, Math.random() * 2 - 1).normalize();
            this.mesh.position.addScaledVector(randomDir, this.speed * 0.2);

            // Recovery
            this.cooldownTimer++;
            if (this.cooldownTimer > this.cooldownLimit) {
                this.state = 'primed';
                this.killCount = 0;
                this.mesh.material.color.set(0x00ffcc);
            }
        }

        // Energy consumption
        const energyCost = {
            'primed': 0.15,
            'fatigued': 0.08
        }[this.state] || 0.1;

        this.energy -= energyCost;

        // Keep within bounds
        const maxBound = 10;
        this.mesh.position.x = Math.max(-maxBound, Math.min(maxBound, this.mesh.position.x));
        this.mesh.position.z = Math.max(-maxBound, Math.min(maxBound, this.mesh.position.z));
    }
}
