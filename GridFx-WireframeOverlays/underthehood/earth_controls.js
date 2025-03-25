// Earth Controls Module

let rotationSpeed = 0;
let isSpinning = false;
let animationId = null;

export function initializeEarth(earth) {
    earth.rotation.y = 0;
    rotationSpeed = 0;
    isSpinning = false;
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
}

export function spinEarth(earth) {
    if (isSpinning) return;
    
    isSpinning = true;
    rotationSpeed = 0.01; // radians per frame
    
    function animate() {
        if (!isSpinning) return;
        
        earth.rotation.y += rotationSpeed;
        animationId = requestAnimationFrame(() => animate());
    }
    
    animate();
}

export function stopEarth(earth) {
    isSpinning = false;
    rotationSpeed = 0;
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
}

export function setRotationSpeed(speed) {
    rotationSpeed = speed;
}

export function getRotationSpeed() {
    return rotationSpeed;
}

export function isEarthSpinning() {
    return isSpinning;
}

// Additional Earth control functions can be added here
export function tiltEarth(earth, angle) {
    earth.rotation.z = angle * (Math.PI / 180);
}

export function resetEarth(earth) {
    earth.rotation.set(0, 0, 0);
    stopEarth(earth);
}

export function rotateToCoordinates(earth, lat, lon) {
    // Convert lat/lon to rotation angles
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    
    // Stop any current rotation
    stopEarth(earth);
    
    // Set the rotation
    earth.rotation.set(phi, theta, 0);
}

export function animateToCoordinates(earth, lat, lon, duration = 1000) {
    // Get current rotation
    const startPhi = earth.rotation.x;
    const startTheta = earth.rotation.y;
    
    // Calculate target rotation
    const targetPhi = (90 - lat) * (Math.PI / 180);
    const targetTheta = (lon + 180) * (Math.PI / 180);
    
    // Animation variables
    const startTime = Date.now();
    
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Interpolate rotation
        earth.rotation.x = startPhi + (targetPhi - startPhi) * progress;
        earth.rotation.y = startTheta + (targetTheta - startTheta) * progress;
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    
    animate();
} 