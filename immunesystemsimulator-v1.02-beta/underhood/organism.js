import * as THREE from 'three';

export class Organism {
    constructor(scene) {
        this.scene = scene;
        this.energy = 100;
        this.speed = 0.02;
        this.reproductionThreshold = 150;
        this.mesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.5, 16, 16),
            new THREE.MeshStandardMaterial({ color: 0x0099ff })
        );
        this.mesh.position.set(Math.random() * 10 - 5, 0.5, Math.random() * 10 - 5);
        scene.add(this.mesh);
    }

    update(foodParticles, organisms) {
        if (this.energy <= 0) {
            this.scene.remove(this.mesh);
            return;
        }

        let moveDirection = new THREE.Vector3();
        if (foodParticles.length > 0) {
            // Find closest food
            let closestFood = foodParticles.reduce((closest, food) =>
                this.mesh.position.distanceTo(food.position) < this.mesh.position.distanceTo(closest.position) ? food : closest
            );

            moveDirection.subVectors(closestFood.position, this.mesh.position).normalize();
            
            // If close enough, "consume" food
            if (this.mesh.position.distanceTo(closestFood.position) < 0.5) {
                this.scene.remove(closestFood);
                foodParticles.splice(foodParticles.indexOf(closestFood), 1);
                this.energy += 50; // Gain energy from food
            }
        } else {
            // Move randomly when no food
            moveDirection.set(
                Math.random() * 2 - 1,
                0,
                Math.random() * 2 - 1
            ).normalize();
        }

        // Move organism
        this.mesh.position.addScaledVector(moveDirection, this.speed);
        this.energy -= 0.1; // Energy depletion

        // Replication
        if (this.energy >= this.reproductionThreshold) {
            this.replicate(organisms);
        }
    }

    replicate(organisms) {
        let offspring = new Organism(this.scene);
        offspring.mesh.position.copy(this.mesh.position).add(new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5));
        organisms.push(offspring);
        this.energy /= 2; // Split energy with offspring
    }
}
