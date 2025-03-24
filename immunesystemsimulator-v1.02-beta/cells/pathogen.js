import * as THREE from 'three';

export class Pathogen {
    constructor(scene) {
        this.scene = scene;
        this.speed = 0.02;
        this.mesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 12, 12),
            new THREE.MeshStandardMaterial({ color: 0xff0000 })
        );
        this.mesh.position.set(Math.random() * 10 - 5, 0.3, Math.random() * 10 - 5);
        scene.add(this.mesh);
    }

    update() {
        // Random movement (Brownian-like motion)
        let randomDirection = new THREE.Vector3(
            Math.random() * 2 - 1,
            0,
            Math.random() * 2 - 1
        ).normalize();
        this.mesh.position.addScaledVector(randomDirection, this.speed);
    }
}
