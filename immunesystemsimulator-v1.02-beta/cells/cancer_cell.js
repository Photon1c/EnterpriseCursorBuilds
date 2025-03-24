import * as THREE from 'three';

export class CancerCell {
    constructor(scene) {
        this.scene = scene;
        this.mesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.4, 14, 14),
            new THREE.MeshStandardMaterial({ color: 0xcc00cc })
        );
        this.mesh.position.set(Math.random() * 10 - 5, 0.4, Math.random() * 10 - 5);
        this.mesh.userData.type = 'cancer';
        scene.add(this.mesh);

        this.divisionTimer = 0;
        this.divisionInterval = 500; // frames or ticks until division
    }

    update(neighbors, immuneSystemRef = null) {
		if (!neighbors) return;


        // Clumping force
        let attraction = new THREE.Vector3();
        let repulsion = new THREE.Vector3();
        let count = 0;

        for (let neighbor of neighbors) {
            if (neighbor === this) continue;
            let offset = neighbor.mesh.position.clone().sub(this.mesh.position);
            let distance = offset.length();

            if (distance < 0.01) continue;
            if (distance < 1.0) {
                let repulse = offset.clone().normalize().multiplyScalar(-1 / distance);
                repulsion.add(repulse);
            }
            if (distance < 3.0) {
                attraction.add(offset);
                count++;
            }
        }

        if (count > 0) attraction.divideScalar(count);
        let direction = attraction.add(repulsion).normalize();
        this.mesh.position.addScaledVector(direction, 0.01);

        // Attempt division
        if (immuneSystemRef && this.shouldDivide(neighbors, immuneSystemRef)) {
            this.divide(immuneSystemRef);
        }
    }

    shouldDivide(neighbors, immuneSystemRef) {
        this.divisionTimer++;

        if (this.divisionTimer < this.divisionInterval) return false;

        const nearbyCTLs = immuneSystemRef.tcells.filter(t => 
            t.mesh.position.distanceTo(this.mesh.position) < 4
        );

        const localDensity = neighbors.filter(n =>
            n !== this && n.mesh.position.distanceTo(this.mesh.position) < 1.5
        ).length;

        return nearbyCTLs.length === 0 && localDensity < 5;
    }

    divide(immuneSystemRef) {
        this.divisionTimer = 0;

        const newCell = new CancerCell(this.scene);
        const offset = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            0,
            (Math.random() - 0.5) * 2
        );
        newCell.mesh.position.copy(this.mesh.position).add(offset);
        immuneSystemRef.cancerCells.push(newCell);
    }
}
