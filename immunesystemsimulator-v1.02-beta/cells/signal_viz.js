import * as THREE from 'three';

export function createSignalSphere(scene, position, color = 0x00ffff, size = 1.5, duration = 30) {
    const geometry = new THREE.SphereGeometry(size, 16, 16);
    const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.2
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.copy(position);
    scene.add(sphere);

    let life = 0;
    const fadeSpeed = 1 / duration;

    function animate() {
        if (life > duration) {
            scene.remove(sphere);
            geometry.dispose();
            material.dispose();
            return;
        }
        material.opacity -= fadeSpeed;
        life++;
        requestAnimationFrame(animate);
    }
    animate();
}
