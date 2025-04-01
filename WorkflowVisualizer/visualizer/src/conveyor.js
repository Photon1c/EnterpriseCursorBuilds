import * as THREE from 'three';

export class ConveyorBelt {
    constructor(scene) {
        this.scene = scene;
        this.speed = 1.0;
        this.beltLength = 24;
        this.beltWidth = 3;
        
        // Define zones (start, subprocess 1, subprocess 2, end) - values are progress (0 to 1)
        this.zones = {
            start: 0.0,
            subprocess1_start: 0.2,
            subprocess1_end: 0.4,
            subprocess2_start: 0.5,
            subprocess2_end: 0.7,
            endZone_start: 0.9,
            end: 1.0
        };
        
        this.createConveyorBelt();
    }
    
    createConveyorBelt() {
        // Create the main belt platform
        const beltGeometry = new THREE.BoxGeometry(this.beltWidth, 0.2, this.beltLength);
        
        // Create conveyor belt material with animated texture
        this.beltMaterial = new THREE.MeshStandardMaterial({
            color: 0x404040,
            roughness: 0.5,
            metalness: 0.3
        });
        
        this.belt = new THREE.Mesh(beltGeometry, this.beltMaterial);
        this.belt.position.y = 0;
        this.belt.receiveShadow = true;
        this.scene.add(this.belt);
        
        // Add conveyor belt rollers at each end
        this.createRollers();
        
        // Add support stands
        this.createSupports();
        
        // Create animated belt texture
        this.createBeltTexture();
    }
    
    createRollers() {
        const rollerGeometry = new THREE.CylinderGeometry(0.4, 0.4, this.beltWidth + 0.2, 16);
        const rollerMaterial = new THREE.MeshStandardMaterial({
            color: 0x888888,
            roughness: 0.5,
            metalness: 0.7
        });
        
        // Roller at start of conveyor
        this.startRoller = new THREE.Mesh(rollerGeometry, rollerMaterial);
        this.startRoller.rotation.x = Math.PI / 2;
        this.startRoller.position.set(0, 0, -this.beltLength/2);
        this.startRoller.castShadow = true;
        this.scene.add(this.startRoller);
        
        // Roller at end of conveyor
        this.endRoller = new THREE.Mesh(rollerGeometry, rollerMaterial);
        this.endRoller.rotation.x = Math.PI / 2;
        this.endRoller.position.set(0, 0, this.beltLength/2);
        this.endRoller.castShadow = true;
        this.scene.add(this.endRoller);
    }
    
    createSupports() {
        const legGeometry = new THREE.BoxGeometry(0.3, 1, 0.3);
        const legMaterial = new THREE.MeshStandardMaterial({
            color: 0x555555,
            roughness: 0.7,
            metalness: 0.3
        });
        
        this.legs = [];
        const numSupportPairs = 4;
        for (let i = 0; i <= numSupportPairs; i++) {
            const zPos = -this.beltLength / 2 + (this.beltLength * i / numSupportPairs);
            const positions = [
                [-this.beltWidth / 2 + 0.3, -0.6, zPos],
                [this.beltWidth / 2 - 0.3, -0.6, zPos]
            ];
            
            positions.forEach(position => {
                const leg = new THREE.Mesh(legGeometry, legMaterial);
                leg.position.set(...position);
                leg.castShadow = true;
                leg.receiveShadow = true;
                this.scene.add(leg);
                this.legs.push(leg);
            });
        }
    }
    
    createBeltTexture() {
        // Create a canvas to draw the belt texture
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const context = canvas.getContext('2d');
        
        // Draw black background
        context.fillStyle = '#555555';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw conveyor belt divisions (lighter strips)
        context.fillStyle = '#666666';
        const stripWidth = canvas.width / 8;
        for (let i = 0; i < canvas.width; i += stripWidth * 2) {
            context.fillRect(i, 0, stripWidth, canvas.height);
        }
        
        // Create texture from canvas
        this.beltTexture = new THREE.CanvasTexture(canvas);
        this.beltTexture.wrapS = THREE.RepeatWrapping;
        this.beltTexture.wrapT = THREE.RepeatWrapping;
        this.beltTexture.repeat.set(2, this.beltLength / 1.2);
        
        // Apply texture to belt material
        this.beltMaterial.map = this.beltTexture;
        this.beltMaterial.needsUpdate = true;
    }
    
    setSpeed(newSpeed) {
        this.speed = newSpeed;
    }
    
    update(delta) {
        // Rotate rollers based on conveyor speed
        const rotationAmount = delta * this.speed * 2;
        this.startRoller.rotation.z += rotationAmount;
        this.endRoller.rotation.z += rotationAmount;
        
        // Animate belt texture scrolling
        if (this.beltTexture) {
            this.beltTexture.offset.y -= delta * this.speed * 0.5;
        }
    }
    
    // Get the spawn position for new chocolates
    getSpawnPosition() {
        return new THREE.Vector3(0, 0.3, -this.beltLength/2 + 1.0);
    }
    
    // Get the end position for chocolates
    getEndPosition() {
        return new THREE.Vector3(0, 0.3, this.beltLength/2 - 1.0);
    }
    
    // Calculate position on the belt based on progress (0 to 1)
    getPositionOnBelt(progress) {
        const startPos = this.getSpawnPosition();
        const endPos = this.getEndPosition();
        
        return new THREE.Vector3(
            startPos.x + (endPos.x - startPos.x) * progress,
            startPos.y,
            startPos.z + (endPos.z - startPos.z) * progress
        );
    }
    
    // Helper to get the Z coordinate for a given progress
    getZPositionForProgress(progress) {
        return this.getPositionOnBelt(progress).z;
    }
    
    // Helper to get the center Z coordinate of a zone
    getZoneCenterZ(zoneStartKey, zoneEndKey) {
        const startProgress = this.zones[zoneStartKey];
        const endProgress = this.zones[zoneEndKey];
        const centerProgress = startProgress + (endProgress - startProgress) / 2;
        return this.getZPositionForProgress(centerProgress);
    }
} 