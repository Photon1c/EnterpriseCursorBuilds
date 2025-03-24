import * as THREE from 'three';

export class WBC {
    constructor(scene) {
        this.scene = scene;
        this.energy = 100;
        this.speed = 0.03;
        this.mesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.5, 16, 16),
            new THREE.MeshStandardMaterial({ color: 0xffffff })
        );
        this.mesh.position.set(Math.random() * 10 - 5, 0.5, Math.random() * 10 - 5);
        scene.add(this.mesh);
    }

    update(chemicalField, pathogens) {
        if (this.energy <= 0) {
            this.scene.remove(this.mesh);
            return;
        }

        let moveDirection = new THREE.Vector3();
        let maxSignal = 0;
        
        // Chemotaxis: Follow highest detected chemoattractant gradient
        for (let i = 0; i < 8; i++) {
            let angle = (i / 8) * Math.PI * 2;
            let probePos = this.mesh.position.clone().add(new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).multiplyScalar(0.5));
            let signal = chemicalField.getSignalAt(probePos);
            if (signal > maxSignal) {
                maxSignal = signal;
                moveDirection.set(Math.cos(angle), 0, Math.sin(angle));
            }
        }
        
        if (maxSignal === 0) {
            // Random movement if no signal detected
            moveDirection.set(Math.random() * 2 - 1, 0, Math.random() * 2 - 1).normalize();
        }
        
        // Move WBC
        this.mesh.position.addScaledVector(moveDirection, this.speed);
        this.energy -= 0.1;
        
        // Check for pathogen collision
        for (let pathogen of pathogens) {
            if (this.mesh.position.distanceTo(pathogen.mesh.position) < 0.5) {
                this.consumePathogen(pathogen, pathogens);
                break;
            }
        }
    }

    consumePathogen(pathogen, pathogens) {
        this.scene.remove(pathogen.mesh);
        pathogens.splice(pathogens.indexOf(pathogen), 1);
        this.energy += 50;
    }
}
