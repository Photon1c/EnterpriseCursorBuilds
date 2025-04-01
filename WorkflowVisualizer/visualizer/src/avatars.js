import * as THREE from 'three';

export class Avatar {
    constructor(scene, name, position, isSupervisor = false) {
        this.scene = scene;
        this.name = name;
        this.position = position;
        this.isSupervisor = isSupervisor;
        this.frantic = false;
        this.isWrapping = false;
        this.wrapAnimationProgress = 0;
        this.wrapAnimationDuration = 0.5; // seconds
        
        // Intervention animation for supervisor
        this.interventionActive = false;
        this.interventionAnimationProgress = 0;
        this.interventionAnimationDuration = 3.0; // seconds
        
        // Character state
        this.fatigue = 0; // 0 to 1, increases with work, affects performance
        this.experience = 0; // 0 to 1, increases over time, improves performance
        
        // Create the avatar
        this.createAvatar();
    }
    
    createAvatar() {
        // Create a simple avatar with primitive shapes
        // Head
        const headGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        const headMaterial = new THREE.MeshStandardMaterial({ 
            color: this.isSupervisor ? 0xD3D3D3 : (this.name === 'Lucy' ? 0xF8A8A8 : (this.name === 'Ethel' ? 0xF8D8A8 : 0xC0C0C0)),
            roughness: 0.7 
        });
        this.head = new THREE.Mesh(headGeometry, headMaterial);
        this.head.position.y = 1.6;
        this.head.castShadow = true;
        
        // Body
        const bodyGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.8, 16);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: this.isSupervisor ? 0x00008B : (this.name === 'Lucy' ? 0xA02222 : (this.name === 'Ethel' ? 0x22A022 : 0x696969)),
            roughness: 0.8 
        });
        this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.body.position.y = 1.05;
        this.body.castShadow = true;
        
        // Arms
        this.createArms(bodyMaterial.color);
        
        // Legs
        this.createLegs();
        
        // Group all components to move together
        this.avatar = new THREE.Group();
        this.avatar.add(this.head);
        this.avatar.add(this.body);
        this.avatar.add(this.leftArm);
        this.avatar.add(this.rightArm);
        this.avatar.add(this.leftLeg);
        this.avatar.add(this.rightLeg);
        
        // Position the avatar group
        this.avatar.position.copy(this.position);
        
        // Set initial rotation to face the conveyor belt
        this.avatar.rotation.y = this.position.x < 0 ? Math.PI / 4 : -Math.PI / 4;
        
        // Add the group to the scene
        this.scene.add(this.avatar);
        
        // Create a thought bubble for "learning" visualization
        if (!this.isSupervisor && this.name !== 'Packer') {
            this.createThoughtBubble();
        }
    }
    
    createArms(armColor) {
        // Arm material
        const armMaterial = new THREE.MeshStandardMaterial({ 
            color: armColor,
            roughness: 0.8 
        });
        
        // Left arm
        const leftArmGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8);
        this.leftArm = new THREE.Mesh(leftArmGeometry, armMaterial);
        this.leftArm.position.set(-0.25, 1.05, 0);
        this.leftArm.rotation.z = Math.PI / 4;
        this.leftArm.castShadow = true;
        
        // Right arm
        const rightArmGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8);
        this.rightArm = new THREE.Mesh(rightArmGeometry, armMaterial);
        this.rightArm.position.set(0.25, 1.05, 0);
        this.rightArm.rotation.z = -Math.PI / 4;
        this.rightArm.castShadow = true;
    }
    
    createLegs() {
        // Leg material
        const legMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x222222,
            roughness: 0.9 
        });
        
        // Left leg
        const leftLegGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.7, 8);
        this.leftLeg = new THREE.Mesh(leftLegGeometry, legMaterial);
        this.leftLeg.position.set(-0.15, 0.35, 0);
        this.leftLeg.castShadow = true;
        
        // Right leg
        const rightLegGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.7, 8);
        this.rightLeg = new THREE.Mesh(rightLegGeometry, legMaterial);
        this.rightLeg.position.set(0.15, 0.35, 0);
        this.rightLeg.castShadow = true;
    }
    
    createThoughtBubble() {
        // Create a thought bubble that will show when learning is happening
        const bubbleMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.7,
            visible: false
        });
        const bubbleGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        
        this.thoughtBubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
        this.thoughtBubble.position.set(this.name === 'Lucy' ? -0.4 : 0.4, 2.0, 0);
        this.avatar.add(this.thoughtBubble);
        
        // Smaller bubble dots leading to the thought bubble
        const smallBubbleGeometry1 = new THREE.SphereGeometry(0.05, 8, 8);
        const smallBubble1 = new THREE.Mesh(smallBubbleGeometry1, bubbleMaterial.clone());
        smallBubble1.position.set(this.name === 'Lucy' ? -0.3 : 0.3, 1.85, 0);
        this.avatar.add(smallBubble1);
        
        const smallBubbleGeometry2 = new THREE.SphereGeometry(0.08, 8, 8);
        const smallBubble2 = new THREE.Mesh(smallBubbleGeometry2, bubbleMaterial.clone());
        smallBubble2.position.set(this.name === 'Lucy' ? -0.35 : 0.35, 1.92, 0);
        this.avatar.add(smallBubble2);
        
        // Group thought bubbles
        this.thoughtBubbles = [this.thoughtBubble, smallBubble1, smallBubble2];
    }
    
    startInterventionAnimation() {
        if (!this.isSupervisor) return;
        
        this.interventionActive = true;
        this.interventionAnimationProgress = 0;
        
        // Create a "stop" sign for the supervisor to hold during intervention
        if (!this.stopSign) {
            // Create a red stop sign
            const signGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.05);
            const signMaterial = new THREE.MeshStandardMaterial({ 
                color: 0xFF0000,
                emissive: 0x990000,
                emissiveIntensity: 0.5
            });
            this.stopSign = new THREE.Mesh(signGeometry, signMaterial);
            
            // Add white text
            const textGeometry = new THREE.BoxGeometry(0.3, 0.08, 0.06);
            const textMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
            const stopText = new THREE.Mesh(textGeometry, textMaterial);
            stopText.position.z = 0.03;
            this.stopSign.add(stopText);
            
            // Position at hand
            this.stopSign.position.set(0.4, 0, 0.2);
            this.stopSign.rotation.z = Math.PI / 4;
            this.stopSign.visible = false;
            this.avatar.add(this.stopSign);
        }
        
        // Make the stop sign visible during intervention
        this.stopSign.visible = true;
    }
    
    updateInterventionAnimation(delta) {
        if (!this.isSupervisor || !this.interventionActive) {
            if (this.stopSign) this.stopSign.visible = false;
            return;
        }
        
        // Update animation progress
        this.interventionAnimationProgress += delta / this.interventionAnimationDuration;
        
        if (this.interventionAnimationProgress >= 1.0) {
            // Animation complete
            this.interventionActive = false;
            if (this.stopSign) this.stopSign.visible = false;
            return;
        }
        
        // Create a more dramatic animation for the supervisor
        // Raise arm with stop sign
        this.rightArm.rotation.z = -Math.PI / 2 - Math.sin(this.interventionAnimationProgress * Math.PI * 4) * 0.3;
        
        // Move back and forth rapidly to show urgency
        const pacingAmount = Math.sin(this.interventionAnimationProgress * Math.PI * 8) * 0.8;
        this.avatar.position.x = this.position.x + pacingAmount;
        
        // Rotate to face conveyor more dramatically
        this.avatar.rotation.y = (this.position.x < 0 ? Math.PI / 3 : -Math.PI / 3) + 
                               Math.sin(this.interventionAnimationProgress * Math.PI * 6) * 0.3;
        
        // Bob up and down slightly to show agitation
        this.avatar.position.y = Math.sin(this.interventionAnimationProgress * Math.PI * 10) * 0.1;
    }
    
    startWrappingAnimation() {
        if (this.isSupervisor || this.name === 'Packer') return;
        if (!this.isWrapping) {
            this.isWrapping = true;
            this.wrapAnimationProgress = 0;
            
            // Reset arm positions before animation
            this.leftArm.rotation.z = Math.PI / 4;
            this.rightArm.rotation.z = -Math.PI / 4;
        }
    }
    
    updateWrappingAnimation(delta) {
        if (this.isSupervisor || !this.isWrapping) return;
        
        // Special animation for packer if applicable
        if (this.name === 'Packer') {
            this.updatePackingAnimation(delta);
            return;
        }
        
        // Update animation progress
        this.wrapAnimationProgress += delta / this.wrapAnimationDuration;
        
        if (this.wrapAnimationProgress >= 1.0) {
            // Animation complete
            this.isWrapping = false;
            this.wrapAnimationProgress = 0;
            
            // Reset arm positions
            this.leftArm.rotation.z = Math.PI / 4;
            this.rightArm.rotation.z = -Math.PI / 4;
            return;
        }
        
        // Animate arms
        const progress = this.wrapAnimationProgress;
        
        // Use sine wave to create a natural motion
        const angle = Math.sin(progress * Math.PI) * (Math.PI / 3);
        
        // Rotate arms inward during the first half, outward during the second half
        this.leftArm.rotation.z = Math.PI / 4 - angle;
        this.rightArm.rotation.z = -Math.PI / 4 + angle;
        
        // Add slight body movement for more realistic animation
        this.body.rotation.x = Math.sin(progress * Math.PI * 2) * 0.1;
        
        // Add head movement looking down at task then back up
        if (progress < 0.5) {
            this.head.rotation.x = progress * 0.4; // Look down gradually
        } else {
            this.head.rotation.x = (1 - progress) * 0.4; // Look back up gradually
        }
    }
    
    updatePackingAnimation(delta) {
        // Special animation for packer - different arm movements for boxing
        if (!this.isWrapping) return;
        
        // Update animation progress
        this.wrapAnimationProgress += delta / this.wrapAnimationDuration;
        
        if (this.wrapAnimationProgress >= 1.0) {
            // Animation complete
            this.isWrapping = false;
            this.wrapAnimationProgress = 0;
            
            // Reset arm positions
            this.leftArm.rotation.z = Math.PI / 4;
            this.rightArm.rotation.z = -Math.PI / 4;
            return;
        }
        
        const progress = this.wrapAnimationProgress;
        
        // Packing animation - arms move up and down together
        const upDownMotion = Math.sin(progress * Math.PI * 2) * 0.6;
        
        // Arms move together in a boxing motion
        this.leftArm.rotation.z = Math.PI / 4 - upDownMotion;
        this.rightArm.rotation.z = -Math.PI / 4 + upDownMotion;
        
        // Add body movements
        this.body.rotation.x = Math.sin(progress * Math.PI) * 0.15;
    }
    
    setFrantic(isFrantic) {
        this.frantic = isFrantic;
    }
    
    updateFranticBehavior(delta) {
        if (!this.frantic) {
            // Reset frantic state if not frantic
            this.head.rotation.z = 0;
            this.body.rotation.z = 0;
            // Reset supervisor pacing if needed
            if (this.isSupervisor) {
                this.avatar.position.x = this.position.x;
            }
            return;
        }
        
        // Frantic head movement
        const headShake = Math.sin(Date.now() * (this.isSupervisor ? 0.03 : 0.02)) * (this.isSupervisor ? 0.15 : 0.1);
        this.head.rotation.z = headShake;
        
        // Random body twitches (Supervisor might twitch more dramatically or differently)
        if (Math.random() > (this.isSupervisor ? 0.90 : 0.95)) {
            const bodyTwitch = (Math.random() - 0.5) * (this.isSupervisor ? 0.3 : 0.2);
            this.body.rotation.z = bodyTwitch;
            // Supervisor might pace or step side to side when frantic
            if (this.isSupervisor) {
                 this.avatar.position.x = this.position.x + (Math.random() - 0.5) * 0.2;
            }
        } else if (this.isSupervisor) {
             // Reset pacing position if not twitching
             this.avatar.position.x = this.position.x;
        }
        
        // Increase fatigue when frantic
        const fatigueRate = this.isSupervisor ? 0.01 : (this.name === 'Packer' ? 0.03 : 0.05);
        this.fatigue = Math.min(1.0, this.fatigue + delta * fatigueRate);
        
        // Visual representation of fatigue
        const fatigueEffect = this.fatigue * 0.2;
        this.body.position.y = 1.05 - fatigueEffect;
        this.head.position.y = 1.6 - fatigueEffect;
    }
    
    updateLearningAndFatigue(delta) {
        // Supervisors/Packers might have different fatigue/learning mechanics
        if (this.isSupervisor || this.name === 'Packer') {
            // Example: Supervisor fatigue recovers faster, Packer fatigue recovers slower
            const recoveryRate = this.isSupervisor ? 0.02 : (this.name === 'Packer' ? 0.005 : 0.01);
            if (!this.frantic) {
                 this.fatigue = Math.max(0, this.fatigue - delta * recoveryRate);
            }
            // No learning effect for these roles in this example
            this.experience = 1.0; // Assume they are fully "experienced"
            
            // Update fatigue visualization even for these roles
            const fatigueEffect = this.fatigue * 0.2;
            this.body.position.y = 1.05 - fatigueEffect; 
            this.head.position.y = 1.6 - fatigueEffect; 
            return; // Skip Lucy/Ethel logic
        }
        
        // Reduce fatigue over time when not frantic
        if (!this.frantic) {
            this.fatigue = Math.max(0, this.fatigue - delta * 0.01);
        }
        
        // Increase experience over time (learn from work)
        if (this.isWrapping) {
            this.experience = Math.min(1.0, this.experience + delta * 0.01);
            
            // Show thought bubble when learning
            if (Math.random() > 0.7) {
                this.showLearningEffect();
            }
        }
        
        // Visual representation of experience affecting animation speed
        this.wrapAnimationDuration = 0.5 - (this.experience * 0.2) + (this.fatigue * 0.3);
    }
    
    showLearningEffect() {
        if (this.isSupervisor || this.name === 'Packer') return;
        if (!this.thoughtBubbles) return;
        // Make thought bubbles visible
        this.thoughtBubbles.forEach(bubble => {
            bubble.material.visible = true;
            
            // Fade out after a short delay
            setTimeout(() => {
                bubble.material.visible = false;
            }, 500);
        });
    }
    
    update(delta) {
        // Update wrapping animation if in progress
        this.updateWrappingAnimation(delta);
        
        // Update supervisor intervention animation if active
        this.updateInterventionAnimation(delta);
        
        // Update frantic behavior if active
        this.updateFranticBehavior(delta);
        
        // Update learning and fatigue simulation
        this.updateLearningAndFatigue(delta);
    }
    
    // Get current efficiency based on experience and fatigue
    getEfficiency() {
        if (this.isSupervisor) return 1.0;
        if (this.name === 'Packer') return 0.9 - (this.fatigue * 0.5);
        return 0.7 + (this.experience * 0.5) - (this.fatigue * 0.6);
    }
} 