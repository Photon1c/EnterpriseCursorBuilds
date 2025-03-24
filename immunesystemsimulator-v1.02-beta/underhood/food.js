import * as THREE from 'three';

export class FoodManager {
    constructor(scene) {
        this.scene = scene;
        this.foodParticles = [];
        this.foodMaterial = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    }

    addFood() {
        const food = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), this.foodMaterial);
        food.position.set(Math.random() * 10 - 5, 0.2, Math.random() * 10 - 5);
        this.scene.add(food);
        this.foodParticles.push(food);
    }

    getFoodParticles() {
        return this.foodParticles;
    }
}
