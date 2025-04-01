import * as THREE from 'three';

export class TaskManager {
    constructor(mainVisualizer, scene, conveyorBelt, avatars, callbacks) {
        this.mainVisualizer = mainVisualizer; // Store reference
        this.scene = scene;
        this.conveyorBelt = conveyorBelt;
        this.avatars = avatars;
        this.callbacks = callbacks;
        
        // Task settings - Now user configurable
        this.taskSpeed = 1.0; // Base tasks per second
        this.baseWrapChance = 0.7; // Base chance of successful wrapping
        this.chocolateProcessTime = 2.0; // Seconds to process a single chocolate (will be user configurable)
        this.packerSpeed = 1.0; // Speed multiplier for the packer (will be user configurable)
        this.supervisorResponsiveness = 0.5; // How quickly supervisor reacts to missed chocolates (0-1)
        
        // Task generation
        this.taskGenerationActive = false;
        this.timeSinceLastTask = 0;
        this.taskInterval = 1.5; // Default interval at speed 1 (will be divided by speed)
        
        // Task tracking
        this.nextTaskId = 0;
        this.tasks = new Map(); // Map of taskId -> task object
        this.taskObjects = []; // Array of task 3D objects for raycasting
        this.missedChocolatePool = []; // Pool of chocolate objects for missed animations
        this.spilledChocolates = []; // Currently spilled/animated chocolates
        
        // Added tracking for spillage events
        this.spillageCount = 0;
        this.lastSpillageTime = 0;
        this.supervisorIntervening = false;
        this.conveyorSlowdownFactor = 1.0; // 1.0 = normal speed
        
        // Statistics
        this.stats = {
            totalGenerated: 0,
            wrapped: 0,
            missed: 0,
            packedChocolates: 0, // New stat
            spilledChocolates: 0  // Track chocolates that fell on floor
        };
        
        // Track packaged chocolates and create boxes
        this.wrappedChocolateCount = 0;
        this.chocolateBoxes = [];
        
        // Create trash pile for missed chocolates
        this.trashPile = new THREE.Group();
        this.trashPile.position.set(5, -0.5, -5); // Position trash pile to the side
        this.scene.add(this.trashPile);
        
        // Track trash pile size
        this.trashPileSize = 0;
        
        // Create chocolate/task material
        this.setupMaterials();
        
        // Initialize the chocolate spill pool
        this.createChocolateSpillPool();
    }
    
    setupMaterials() {
        // Chocolate (unwrapped task) material with improved texturing
        const chocolateBaseColor = 0x3D1C02;
        this.chocolateMaterial = new THREE.MeshStandardMaterial({
            color: chocolateBaseColor,
            roughness: 0.7,
            metalness: 0.3
        });
        
        // Add random slight variation to each chocolate for realism
        this.getChocolateVariation = () => {
            // Create a slight color variation for each chocolate
            const variation = Math.random() * 0.15 - 0.075; // -0.075 to +0.075
            const chocolateColor = new THREE.Color(chocolateBaseColor);
            chocolateColor.r = Math.min(1, Math.max(0, chocolateColor.r + variation));
            chocolateColor.g = Math.min(1, Math.max(0, chocolateColor.g + variation / 2));
            
            return new THREE.MeshStandardMaterial({
                color: chocolateColor,
                roughness: 0.6 + Math.random() * 0.3,
                metalness: 0.2 + Math.random() * 0.3,
                flatShading: Math.random() > 0.5
            });
        };
        
        // Wrapped chocolate material (shiny wrapper effect)
        this.wrappedMaterial = new THREE.MeshStandardMaterial({
            color: 0xE6BE8A,
            roughness: 0.3,
            metalness: 0.7,
            emissive: 0x222222
        });
        
        // Create several wrapper material variations
        this.wrapperColors = [
            0xE6BE8A, // Gold
            0xC0C0C0, // Silver
            0xDA70D6, // Orchid
            0x00CED1, // Turquoise
            0xFF6347  // Tomato
        ];
        
        this.getWrapperVariation = () => {
            const colorIndex = Math.floor(Math.random() * this.wrapperColors.length);
            return new THREE.MeshStandardMaterial({
                color: this.wrapperColors[colorIndex],
                roughness: 0.2,
                metalness: 0.8,
                emissive: new THREE.Color(this.wrapperColors[colorIndex]).multiplyScalar(0.1),
                emissiveIntensity: 0.5
            });
        };
        
        // Failed/missed task material
        this.failedMaterial = new THREE.MeshStandardMaterial({
            color: 0xFF0000,
            roughness: 0.5,
            metalness: 0.3,
            emissive: 0x330000
        });
    }
    
    startTaskGeneration() {
        this.taskGenerationActive = true;
    }
    
    stopTaskGeneration() {
        this.taskGenerationActive = false;
    }
    
    setTaskSpeed(newSpeed) {
        this.taskSpeed = newSpeed;
        
        // No need to calculate taskInterval directly - handled in updateTaskGeneration
        
        // Only update conveyor speed if supervisor isn't currently intervening
        if (!this.supervisorIntervening) {
            this.conveyorBelt.setSpeed(newSpeed / 20); // Scale down for visual effect
        }
    }
    
    update(delta) {
        // Generate new tasks
        if (this.taskGenerationActive) {
            this.updateTaskGeneration(delta);
        }
        
        // Move existing tasks along the conveyor
        this.updateTasks(delta);
        
        // Update spilled chocolate physics animations
        this.updateSpilledChocolates(delta);
    }
    
    updateTaskGeneration(delta) {
        this.timeSinceLastTask += delta;
        
        // Calculate seconds between chocolates based on chocolates per hour
        // Example: 15 chocolates/hour = 3600 / 15 = 240 seconds between each chocolate in simulation time
        // But with our time scale conversion, it's much faster in real time
        const chocolatesPerHour = this.taskSpeed;
        const secondsBetweenChocolates = chocolatesPerHour > 0 ? 3600 / chocolatesPerHour : Infinity;
        
        // Check if it's time to generate a new task
        if (this.timeSinceLastTask >= secondsBetweenChocolates / 60) { // Convert sim seconds to real-time seconds
            this.createNewTask();
            this.timeSinceLastTask = 0;
            console.log(`New chocolate created, next one in ${(secondsBetweenChocolates / 60).toFixed(2)} seconds`);
        }
    }
    
    createNewTask() {
        // Create chocolate geometry (randomly choose between shapes for variety)
        const shapes = [
            () => new THREE.BoxGeometry(0.5, 0.2, 0.5), // Square chocolate
            () => new THREE.CylinderGeometry(0.25, 0.25, 0.2, 16), // Round chocolate
            () => new THREE.TorusGeometry(0.2, 0.08, 16, 24), // Donut-shaped chocolate
            () => {
                // Heart-shaped chocolate (approximation)
                const heartShape = new THREE.Shape();
                heartShape.moveTo(0, 0.1);
                heartShape.bezierCurveTo(0.1, 0.2, 0.3, 0.2, 0.3, 0);
                heartShape.bezierCurveTo(0.3, -0.15, 0.1, -0.3, 0, -0.15);
                heartShape.bezierCurveTo(-0.1, -0.3, -0.3, -0.15, -0.3, 0);
                heartShape.bezierCurveTo(-0.3, 0.2, -0.1, 0.2, 0, 0.1);
                return new THREE.ExtrudeGeometry(heartShape, {
                    depth: 0.15,
                    bevelEnabled: true,
                    bevelSegments: 2,
                    bevelSize: 0.02,
                    bevelThickness: 0.02
                });
            },
            () => {
                // Rectangle with rounded corners
                const roundedRect = new THREE.Shape();
                const width = 0.5;
                const height = 0.3;
                const radius = 0.08;
                
                roundedRect.moveTo(-width/2 + radius, -height/2);
                roundedRect.lineTo(width/2 - radius, -height/2);
                roundedRect.quadraticCurveTo(width/2, -height/2, width/2, -height/2 + radius);
                roundedRect.lineTo(width/2, height/2 - radius);
                roundedRect.quadraticCurveTo(width/2, height/2, width/2 - radius, height/2);
                roundedRect.lineTo(-width/2 + radius, height/2);
                roundedRect.quadraticCurveTo(-width/2, height/2, -width/2, height/2 - radius);
                roundedRect.lineTo(-width/2, -height/2 + radius);
                roundedRect.quadraticCurveTo(-width/2, -height/2, -width/2 + radius, -height/2);
                
                return new THREE.ExtrudeGeometry(roundedRect, {
                    depth: 0.15,
                    bevelEnabled: true,
                    bevelSegments: 1,
                    bevelSize: 0.01,
                    bevelThickness: 0.01
                });
            }
        ];
        
        const randomShape = Math.floor(Math.random() * shapes.length);
        const geometry = shapes[randomShape]();
        
        // Create the chocolate mesh with varied material
        const chocolate = new THREE.Mesh(geometry, this.getChocolateVariation());
        chocolate.castShadow = true;
        chocolate.receiveShadow = true;
        
        // Position at the start of the conveyor
        chocolate.position.copy(this.conveyorBelt.getSpawnPosition());
        
        // Add small random rotation for natural look
        chocolate.rotation.y = Math.random() * Math.PI * 2;
        chocolate.rotation.x = (Math.random() - 0.5) * 0.2;
        chocolate.rotation.z = (Math.random() - 0.5) * 0.2;
        
        // Generate unique ID and metadata for this task
        const taskId = this.nextTaskId++;
        const creationTime = Date.now();
        
        // Store task metadata
        const task = {
            id: taskId,
            object: chocolate,
            progress: 0, // 0 to 1, representing position on conveyor
            speed: this.taskSpeed, // Current speed setting when created
            creationTime: creationTime,
            isWrapped: false,
            isMissed: false,
            wrappedTime: null,
            missedTime: null
        };
        
        // Add task to our tracking collections
        this.tasks.set(taskId, task);
        this.taskObjects.push(chocolate);
        
        // Store task ID in the object's userData for raycasting identification
        chocolate.userData = {
            taskId: taskId,
            isWrapped: false,
            isMissed: false
        };
        
        // Add to scene
        this.scene.add(chocolate);
        
        // Update statistics
        this.stats.totalGenerated++;
        
        return taskId;
    }
    
    updateTasks(delta) {
        const tasksToRemove = [];
        const tasksToPack = []; // Store tasks ready for packing
        
        // Calculate a global auto-wrap chance based on avatar efficiencies
        const lucyEfficiency = this.avatars.lucy.getEfficiency();
        const ethelEfficiency = this.avatars.ethel.getEfficiency();
        const packerEfficiency = this.avatars.packer.getEfficiency(); // Get packer efficiency
        
        console.log(`Lucy Efficiency: ${lucyEfficiency}, Ethel Efficiency: ${ethelEfficiency}`);
        
        // Update each task
        this.tasks.forEach((task) => {
            // Skip if task is removed or packed
            if (task.removed || task.packed) return; 
            
            // Update progress along the conveyor
            // Adjust speed based on conveyor speed - make it consistent regardless of input rate
            const progressDelta = delta * 0.05 * (this.taskSpeed / 15); // Base progress on a reference speed
            task.progress += progressDelta;
            
            // Update position based on progress
            task.object.position.copy(
                this.conveyorBelt.getPositionOnBelt(task.progress)
            );
            
            // Also add a small rotation for visual interest
            task.object.rotation.y += delta * 0.5;
            
            // Check if task has reached avatars for auto-wrapping attempt
            const inSubprocess1Zone = task.progress >= this.conveyorBelt.zones.subprocess1_start && task.progress < this.conveyorBelt.zones.subprocess1_end;
            
            // First avatar (Lucy) is at around 40% of the conveyor
            if (inSubprocess1Zone && !task.lucyAttempted && !task.isWrapped && !task.isMissed) {
                task.lucyAttempted = true;
                
                console.log(`Lucy attempting to wrap task ${task.id}`);
                
                // Determine if Lucy successfully wraps the chocolate
                if (Math.random() < this.baseWrapChance * lucyEfficiency) {
                    console.log(`Lucy wrapped task ${task.id}`);
                    // Queue the task for wrapping by Lucy
                    setTimeout(() => {
                        this.avatars.lucy.startWrappingAnimation();
                        this.wrapTask(task.id);
                    }, this.chocolateProcessTime * 300); // Scaled based on process time
                }
            }
            
            // Second avatar (Ethel) is at around 60% of the conveyor
            if (inSubprocess1Zone && !task.ethelAttempted && !task.isWrapped && !task.isMissed) {
                task.ethelAttempted = true;
                
                console.log(`Ethel attempting to wrap task ${task.id}`);
                
                // Only attempt if not already wrapped
                if (!task.isWrapped) {
                    // Determine if Ethel successfully wraps the chocolate
                    if (Math.random() < this.baseWrapChance * ethelEfficiency) {
                        console.log(`Ethel wrapped task ${task.id}`);
                        // Queue the task for wrapping by Ethel
                        setTimeout(() => {
                            this.avatars.ethel.startWrappingAnimation();
                            this.wrapTask(task.id);
                        }, this.chocolateProcessTime * 300); // Scaled based on process time
                    }
                }
            }
            
            // Supervisor check? (Subprocess 2 zone) - For now, just visual
            const inSubprocess2Zone = task.progress >= this.conveyorBelt.zones.subprocess2_start && task.progress < this.conveyorBelt.zones.subprocess2_end;
            if (inSubprocess2Zone && !task.supervisorInspected) {
                task.supervisorInspected = true;
                // Supervisor might trigger an animation or effect here later
            }
            
            // Packing attempt (Packer in end zone)
            const inEndZone = task.progress >= this.conveyorBelt.zones.endZone_start && task.progress < this.conveyorBelt.zones.end;
            if (inEndZone && !task.packerAttempted && task.isWrapped && !task.isMissed) { // Only pack wrapped items
                task.packerAttempted = true;
                if (Math.random() < packerEfficiency) { // Packer attempts based on efficiency
                    setTimeout(() => {
                        this.avatars.packer.startWrappingAnimation(); // Re-use wrapping animation for packing motion
                        tasksToPack.push(task.id); // Add to packing queue
                    }, (this.chocolateProcessTime / this.packerSpeed) * 200); // Scaled based on process time and packer speed
                }
            }
            
            // Check if task has reached the end of the conveyor
            if (task.progress >= 1.0) {
                // If not wrapped, mark as missed
                if (!task.isWrapped && !task.packed) { // Missed if not wrapped OR packed
                    this.markTaskAsMissed(task.id);
                } else if (task.isWrapped && !task.packed) {
                    // Wrapped but not packed - maybe a different kind of failure?
                    // For now, count as missed or handle differently
                    this.markTaskAsMissed(task.id, true); // Pass a flag indicating it was wrapped but missed packing
                }
                
                // Queue for removal
                tasksToRemove.push(task.id);
            }
        });
        
        // Process packing queue
        tasksToPack.forEach(taskId => {
            this.packTask(taskId);
        });
        
        // Remove tasks that have completed
        tasksToRemove.forEach(taskId => {
            this.removeTask(taskId);
        });
    }
    
    wrapTask(taskId) {
        const task = this.tasks.get(taskId);
        if (!task || task.isWrapped || task.isMissed) return false;
        
        // Update the mesh material to show it's wrapped
        task.object.material = this.getWrapperVariation();
        
        // Update metadata
        task.isWrapped = true;
        task.wrappedTime = Date.now();
        task.object.userData.isWrapped = true;
        
        // Update statistics
        this.stats.wrapped++;
        
        // Fire callback
        if (this.callbacks && this.callbacks.onTaskWrapped) {
            this.callbacks.onTaskWrapped(taskId);
        }
        
        return true;
    }
    
    markTaskAsMissed(taskId, wasWrapped = false) {
        const task = this.tasks.get(taskId);
        if (!task || task.isMissed) return;
        
        task.isMissed = true;
        task.missedTime = Date.now();
        
        // Mark as missed in userData as well
        task.object.userData.isMissed = true;
        
        // Change material to show missed status
        task.object.material = this.failedMaterial;
        
        // Create a copy of the chocolate to add to the trash pile
        const trashChocolate = task.object.clone();
        
        // Add particle effect when chocolate is missed
        this.createMissedChocolateParticles(task.object.position.clone());
        
        // Make the chocolate move to the trash pile with animation
        const startPosition = task.object.position.clone();
        const endPosition = this.trashPile.position.clone();
        endPosition.y += this.trashPileSize * 0.1; // Stack based on current pile size
        
        // Animate the chocolate moving to the trash pile
        this.animateChocolateToTrash(trashChocolate, startPosition, endPosition, () => {
            // Add to trash pile after animation
            this.trashPile.add(trashChocolate);
            this.trashPileSize++;
            
            // Scale the trash pile as it grows
            const pileScale = 1 + (this.trashPileSize * 0.01);
            this.trashPile.scale.set(pileScale, pileScale, pileScale);
        });
        
        // Update statistics
        this.stats.missed++;
        
        // Call callback if provided
        if (this.callbacks.onTaskMissed) {
            this.callbacks.onTaskMissed(taskId);
        }
        
        // Track this spillage event
        this.spillageCount++;
        this.lastSpillageTime = Date.now();
        this.stats.spilledChocolates++;
        
        // If multiple spills happen quickly, supervisor should intervene
        if (this.spillageCount > 3 && (Date.now() - this.lastSpillageTime < 5000)) {
            this.supervisorIntervention();
        }
    }
    
    removeTask(taskId) {
        const task = this.tasks.get(taskId);
        if (!task || task.removed) return;
        
        // Mark as removed to prevent duplicate removal
        task.removed = true;
        
        // Remove from scene
        this.scene.remove(task.object);
        
        // Remove from taskObjects array for raycasting
        const index = this.taskObjects.indexOf(task.object);
        if (index !== -1) {
            this.taskObjects.splice(index, 1);
        }
        
        // Schedule actual deletion from Map (to allow for animation completion)
        setTimeout(() => {
            this.tasks.delete(taskId);
        }, 1000);
    }
    
    getTaskDetails(taskId) {
        const task = this.tasks.get(taskId);
        if (!task) return null;
        
        // Calculate time elapsed since creation
        const currentTime = Date.now();
        const elapsedMs = currentTime - task.creationTime;
        const elapsedSecs = (elapsedMs / 1000).toFixed(1);
        
        // Calculate wrapped or missed time if applicable
        let wrappedSecs = null;
        if (task.wrappedTime) {
            const wrappedMs = task.wrappedTime - task.creationTime;
            wrappedSecs = (wrappedMs / 1000).toFixed(1);
        }
        
        let missedSecs = null;
        if (task.missedTime) {
            const missedMs = task.missedTime - task.creationTime;
            missedSecs = (missedMs / 1000).toFixed(1);
        }
        
        // Calculate packed time if applicable
        let packedSecs = null;
        if (task.packedTime) {
            const packedMs = task.packedTime - task.creationTime;
            packedSecs = (packedMs / 1000).toFixed(1);
        }
        
        // Determine final status including Packed
        let status = 'In Progress';
        if (task.packed) status = 'Packed';
        else if (task.isWrapped) status = 'Wrapped (Awaiting Packing)';
        else if (task.isMissed) status = 'Missed';
        
        // Return formatted details
        return {
            id: task.id,
            status: status, // Updated status
            progress: `${(task.progress * 100).toFixed(0)}%`,
            elapsedTime: `${elapsedSecs}s`,
            wrappedTime: wrappedSecs ? `${wrappedSecs}s` : 'N/A',
            packedTime: packedSecs ? `${packedSecs}s` : 'N/A', // Add packed time
            missedTime: missedSecs ? `${missedSecs}s` : 'N/A',
            speed: task.speed.toFixed(1)
        };
    }
    
    getInteractiveTasks() {
        return this.taskObjects;
    }
    
    getEfficiency() {
        if (this.stats.totalGenerated === 0) return 100;
        return (this.stats.wrapped / this.stats.totalGenerated) * 100;
    }
    
    // New method to handle packing
    packTask(taskId) {
        const task = this.tasks.get(taskId);
        if (!task || !task.isWrapped || task.packed || task.isMissed) return;
        
        task.packed = true;
        task.packedTime = Date.now();
        task.object.userData.isPacked = true;
        
        // Increment wrapped chocolate count
        this.wrappedChocolateCount++;
        
        // Create a box after every 5 chocolates
        if (this.wrappedChocolateCount % 5 === 0) {
            this.createChocolateBox();
        }
        
        // Hide the original chocolate
        task.object.visible = false;
        
        // Update packed stats
        this.stats.wrapped++; // Count packed as "wrapped" for efficiency calculation
        this.stats.packedChocolates++; // Increment dedicated packed counter
        
        // Call callbacks
        if (this.callbacks.onTaskPacked) {
            this.callbacks.onTaskPacked(taskId, this.stats.packedChocolates);
        }
        if (this.callbacks.onTaskWrapped) { // Still call wrapped callback for general efficiency update in UI
            this.callbacks.onTaskWrapped(taskId);
        }
    }
    
    createChocolateSpillPool() {
        // Create a pool of objects to use for spilled chocolate animations
        const poolSize = 20; // Maximum number of spilled chocolates at once
        
        for (let i = 0; i < poolSize; i++) {
            // Create a variety of small chocolate pieces
            const size = 0.1 + Math.random() * 0.15;
            let geometry;
            
            // Randomly choose shapes
            const shapeType = Math.floor(Math.random() * 3);
            switch(shapeType) {
                case 0:
                    geometry = new THREE.BoxGeometry(size, size/2, size);
                    break;
                case 1:
                    geometry = new THREE.SphereGeometry(size/2, 8, 8);
                    break;
                case 2:
                    geometry = new THREE.TetrahedronGeometry(size/2);
                    break;
            }
            
            // Create mesh with chocolate material
            const chocolatePiece = new THREE.Mesh(geometry, this.chocolateMaterial.clone());
            chocolatePiece.castShadow = true;
            chocolatePiece.visible = false; // Hide until needed
            
            // Add physics properties for animation
            chocolatePiece.userData = {
                velocity: new THREE.Vector3(),
                rotationSpeed: new THREE.Vector3(),
                active: false,
                lifetime: 0
            };
            
            this.scene.add(chocolatePiece);
            this.missedChocolatePool.push(chocolatePiece);
        }
    }
    
    createChocolateSpill(position) {
        // Get up to 5 available chocolate pieces from the pool
        const spillCount = 3 + Math.floor(Math.random() * 3); 
        let usedCount = 0;
        
        // Record spill for stats
        this.stats.spilledChocolates++;
        
        // Create permanent blobs
        for (let i = 0; i < spillCount; i++) {
            const chocolatePiece = this.missedChocolatePool.find(piece => !piece.userData.active);
            if (chocolatePiece) {
                chocolatePiece.position.copy(position);
                chocolatePiece.visible = true;
                chocolatePiece.userData.active = true;
                chocolatePiece.userData.lifetime = Infinity; // Permanent
                usedCount++;
            }
        }
    }
    
    triggerSupervisorIntervention() {
        if (this.supervisorIntervening) return; // Already intervening
        
        // Supervisor notices the problem! 
        this.supervisorIntervening = true;
        
        // Make supervisor frantic
        this.avatars.supervisor.setFrantic(true);
        
        // Slow down the conveyor based on supervisor responsiveness
        this.conveyorSlowdownFactor = Math.max(0.2, 1.0 - this.supervisorResponsiveness); 
        this.conveyorBelt.setSpeed(this.taskSpeed * this.conveyorSlowdownFactor / 5);
        
        // Supervisor intervention duration based on responsiveness (faster = shorter)
        const interventionDuration = 3000 + (1.0 - this.supervisorResponsiveness) * 5000;
        
        // Show supervisor animation - pacing and gesturing
        if (this.avatars.supervisor.startInterventionAnimation) {
            this.avatars.supervisor.startInterventionAnimation();
        }
        
        // After intervention, return to normal
        setTimeout(() => {
            this.supervisorIntervening = false;
            this.spillageCount = 0;
            this.conveyorSlowdownFactor = 1.0;
            this.conveyorBelt.setSpeed(this.taskSpeed / 5);
            this.avatars.supervisor.setFrantic(false);
        }, interventionDuration);
    }
    
    updateSpilledChocolates(delta) {
        const gravity = -9.8; // m/s²
        const floorY = -0.9; // Y position of the floor
        const maxLifetime = 5; // Seconds before fading out
        
        // Process each active spilled chocolate
        for (let i = this.spilledChocolates.length - 1; i >= 0; i--) {
            const piece = this.spilledChocolates[i];
            const userData = piece.userData;
            
            // Update lifetime
            userData.lifetime += delta;
            
            // Update position based on velocity
            piece.position.x += userData.velocity.x * delta;
            piece.position.y += userData.velocity.y * delta;
            piece.position.z += userData.velocity.z * delta;
            
            // Apply gravity to velocity
            userData.velocity.y += gravity * delta;
            
            // Update rotation
            piece.rotation.x += userData.rotationSpeed.x * delta;
            piece.rotation.y += userData.rotationSpeed.y * delta;
            piece.rotation.z += userData.rotationSpeed.z * delta;
            
            // Check for floor bounce
            if (piece.position.y < floorY) {
                piece.position.y = floorY;
                userData.velocity.y = -userData.velocity.y * 0.4; // Bounce with damping
                userData.velocity.x *= 0.8; // Friction
                userData.velocity.z *= 0.8; // Friction
                
                // Create floor splatter effect on first bounce
                if (!userData.hasBounced) {
                    userData.hasBounced = true;
                    this.createSplatter(piece.position.clone());
                }
                
                // Reduce rotation speed after bounce
                userData.rotationSpeed.multiplyScalar(0.8);
            }
            
            // Fade out when reaching maximum lifetime
            if (userData.lifetime > maxLifetime) {
                // Fade out opacity
                if (piece.material.opacity > 0) {
                    piece.material.opacity -= delta * 2;
                    if (piece.material.opacity <= 0) {
                        // Reset the piece
                        this.resetChocolatePiece(piece);
                        this.spilledChocolates.splice(i, 1);
                    }
                }
            }
        }
    }
    
    // Create splatter effect on the floor
    createSplatter(position) {
        // Only create DOM splatter if we have a container element
        if (!this.mainVisualizer || !this.mainVisualizer.container) return;
        
        const container = this.mainVisualizer.container;
        const splatterCount = 1 + Math.floor(Math.random() * 3); 
        
        for (let i = 0; i < splatterCount; i++) {
            // Create a splatter mark
            const splatter = document.createElement('div');
            splatter.className = 'spill-mark';
            
            // Random size and position near the spill location
            const size = 8 + Math.random() * 15; // px
            splatter.style.width = `${size}px`;
            splatter.style.height = `${size}px`;
            
            // Position relative to the 3D position - this will need adjustment based on your scene
            // Convert 3D position to screen position
            const vector = position.clone();
            vector.project(this.mainVisualizer.camera);
            
            const x = (vector.x * 0.5 + 0.5) * container.clientWidth;
            const y = (-(vector.y * 0.5) + 0.5) * container.clientHeight;
            
            // Add some randomness to splatter position
            const offsetX = (Math.random() - 0.5) * 30;
            const offsetY = (Math.random() - 0.5) * 30;
            
            splatter.style.left = `${x + offsetX}px`;
            splatter.style.top = `${y + offsetY + 30}px`; // Add +30 to make it appear on "floor"
            
            // Add to container
            container.appendChild(splatter);
            
            // Create small splash droplets
            this.createSplashDroplets(x, y);
            
            // Remove after animation completes
            setTimeout(() => {
                if (splatter.parentNode) {
                    splatter.parentNode.removeChild(splatter);
                }
            }, 3000);
        }
    }
    
    // Create small splash droplets flying from spill point
    createSplashDroplets(x, y) {
        if (!this.mainVisualizer || !this.mainVisualizer.container) return;
        
        const container = this.mainVisualizer.container;
        const dropletCount = 3 + Math.floor(Math.random() * 5);
        
        for (let i = 0; i < dropletCount; i++) {
            const droplet = document.createElement('div');
            droplet.className = 'chocolate-splash';
            
            // Position at spill point
            droplet.style.left = `${x}px`;
            droplet.style.top = `${y}px`;
            
            // Random flight path
            const splashX = (Math.random() - 0.5) * 120;
            const splashY = -(20 + Math.random() * 40); // Up and out
            
            droplet.style.setProperty('--splash-x', `${splashX}px`);
            droplet.style.setProperty('--splash-y', `${splashY}px`);
            
            // Add to container
            container.appendChild(droplet);
            
            // Remove after animation
            setTimeout(() => {
                if (droplet.parentNode) {
                    droplet.parentNode.removeChild(droplet);
                }
            }, 1000);
        }
    }
    
    resetChocolatePiece(piece) {
        piece.visible = false;
        piece.userData.active = false;
        piece.userData.lifetime = 0;
        piece.userData.hasBounced = false;
        piece.material.opacity = 1.0;
        
        // Reset rotation
        piece.rotation.set(0, 0, 0);
        
        // Clear velocity
        piece.userData.velocity.set(0, 0, 0);
    }
    
    // New methods for user-controlled parameters
    setChocolateProcessTime(seconds) {
        this.chocolateProcessTime = Math.max(0.5, seconds);
        // Update wrapping animation duration for avatars
        if (this.avatars.lucy) {
            this.avatars.lucy.wrapAnimationDuration = this.chocolateProcessTime;
        }
        if (this.avatars.ethel) {
            this.avatars.ethel.wrapAnimationDuration = this.chocolateProcessTime;
        }
    }
    
    setPackerSpeed(speed) {
        this.packerSpeed = Math.max(0.1, speed);
        // Update packer efficiency/speed
        if (this.avatars.packer) {
            this.avatars.packer.wrapAnimationDuration = this.chocolateProcessTime / this.packerSpeed;
        }
    }
    
    setSupervisorResponsiveness(responsiveness) {
        this.supervisorResponsiveness = Math.min(1.0, Math.max(0.1, responsiveness));
    }
    
    // Reset statistics for a new day
    resetStats() {
        // Reset only daily stats, not cumulative ones if needed
        this.stats = {
            totalGenerated: 0,
            wrapped: 0,
            missed: 0,
            packedChocolates: 0,
            spilledChocolates: 0
        };
        
        // Reset spillage tracking
        this.spillageCount = 0;
        this.lastSpillageTime = 0;
        this.supervisorIntervening = false;
        this.conveyorSlowdownFactor = 1.0;
        
        // Remove any active spilled chocolates from the scene
        this.cleanupSpilledChocolates();
        
        return this.stats;
    }
    
    // Clean up any active chocolate spills in the scene
    cleanupSpilledChocolates() {
        // Reset all active spilled chocolates
        for (let i = this.spilledChocolates.length - 1; i >= 0; i--) {
            const piece = this.spilledChocolates[i];
            this.resetChocolatePiece(piece);
            this.spilledChocolates.splice(i, 1);
        }
        
        // Remove any DOM splatter elements
        if (this.mainVisualizer && this.mainVisualizer.container) {
            const container = this.mainVisualizer.container;
            const splatters = container.querySelectorAll('.spill-mark, .chocolate-splash');
            splatters.forEach(element => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            });
        }
    }

    // Add a method for supervisor intervention to clean up spills
    supervisorIntervention() {
        // If supervisor is already intervening, don't start again
        if (this.supervisorIntervening) return;
        
        this.supervisorIntervening = true;
        
        console.log("Supervisor intervention started!");
        
        // Slow down the conveyor temporarily
        this.conveyorSlowdownFactor = 0.5; // Slow down to 50% speed
        this.conveyorBelt.setSpeed((this.taskSpeed / 20) * this.conveyorSlowdownFactor);
        
        // Animate the supervisor to each spill location
        if (this.avatars && this.avatars.supervisor) {
            this.animateSupervisorCleanup();
        } else {
            // No supervisor model, just clean up spills
            this.cleanupSpilledChocolates();
            
            // Reset after cleanup
            setTimeout(() => {
                this.supervisorIntervening = false;
                this.conveyorSlowdownFactor = 1.0;
                this.conveyorBelt.setSpeed(this.taskSpeed / 20);
                console.log("Supervisor intervention complete!");
            }, 3000);
        }
        
        return true;
    }

    // Animate the supervisor cleaning up spills
    animateSupervisorCleanup() {
        const supervisor = this.avatars.supervisor;
        
        // Get current spill positions
        const spillPositions = this.spilledChocolates.map(piece => ({ 
            x: piece.position.x,
            z: piece.position.z
        }));
        
        // If no spills, just end the intervention
        if (spillPositions.length === 0) {
            this.supervisorIntervening = false;
            this.conveyorSlowdownFactor = 1.0;
            this.conveyorBelt.setSpeed(this.taskSpeed / 20);
            console.log("No spills to clean up!");
            return;
        }
        
        // Original position to return to
        const originalPos = {
            x: supervisor.avatar.position.x,
            z: supervisor.avatar.position.z
        };
        
        // Start with the supervisor's current position
        let currentPos = { 
            x: supervisor.avatar.position.x, 
            z: supervisor.avatar.position.z 
        };
        
        // Animation duration per spill
        const durationPerSpill = 1500; // ms
        
        // Process each spill one at a time
        const processNextSpill = (index) => {
            if (index >= spillPositions.length) {
                // All spills processed, return to original position
                this.animateSupervisorMovement(
                    currentPos,
                    originalPos,
                    durationPerSpill,
                    () => {
                        // Reset after returning
                        this.supervisorIntervening = false;
                        this.conveyorSlowdownFactor = 1.0;
                        this.conveyorBelt.setSpeed(this.taskSpeed / 20);
                        console.log("Supervisor intervention complete!");
                    }
                );
                return;
            }
            
            // Move to the next spill
            const targetPos = spillPositions[index];
            
            // Start movement animation
            this.animateSupervisorMovement(
                currentPos,
                targetPos,
                durationPerSpill,
                () => {
                    // Cleanup animation at this point
                    if (index < this.spilledChocolates.length) {
                        const piece = this.spilledChocolates[index];
                        if (piece) {
                            // Remove the piece from the scene
                            this.resetChocolatePiece(piece);
                            this.spilledChocolates.splice(index, 1);
                        }
                    }
                    
                    // Update current position
                    currentPos = targetPos;
                    
                    // Process next spill after a short delay
                    setTimeout(() => {
                        processNextSpill(index + 1);
                    }, 500);
                }
            );
        };
        
        // Start processing the first spill
        processNextSpill(0);
    }

    // Animate supervisor moving between positions
    animateSupervisorMovement(startPos, endPos, duration, onComplete) {
        const supervisor = this.avatars.supervisor;
        const startTime = Date.now();
        
        // Set supervisor to "frantic" mode during cleanup
        supervisor.setFrantic(true);
        
        const updatePosition = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Simple easing function
            const eased = progress < 0.5 
                ? 2 * progress * progress 
                : -1 + (4 - 2 * progress) * progress;
            
            // Calculate new position
            const newX = startPos.x + (endPos.x - startPos.x) * eased;
            const newZ = startPos.z + (endPos.z - startPos.z) * eased;
            
            // Update supervisor position
            supervisor.avatar.position.x = newX;
            supervisor.avatar.position.z = newZ;
            
            // Look in the direction of movement
            if (endPos.x !== startPos.x) {
                supervisor.avatar.rotation.y = endPos.x > startPos.x ? Math.PI / 2 : -Math.PI / 2;
            }
            
            // Continue animation if not complete
            if (progress < 1) {
                requestAnimationFrame(updatePosition);
            } else {
                // Animation complete
                supervisor.setFrantic(false);
                if (onComplete) onComplete();
            }
        };
        
        // Start the animation
        updatePosition();
    }

    // Add the missing updateSpillageRate method to fix the error
    updateSpillageRate() {
        // Track the rate of chocolate spillage
        const currentTime = Date.now();
        const timeSinceLastSpill = currentTime - this.lastSpillageTime;
        
        // If multiple spills happen quickly, increase spillage count
        if (timeSinceLastSpill < 5000) { // Less than 5 seconds between spills
            this.spillageCount++;
        } else {
            // Reset spillage count if enough time has passed without spills
            this.spillageCount = Math.max(0, this.spillageCount - 1);
        }
        
        // If spillage rate is high, trigger supervisor intervention
        if (this.spillageCount >= 3) {
            // Call supervisor intervention if not already intervening
            if (!this.supervisorIntervening) {
                this.triggerSupervisorIntervention();
            }
        }
        
        // Update UI with spilled count if callback exists
        if (this.callbacks && this.callbacks.onTaskSpilled) {
            this.callbacks.onTaskSpilled(this.stats.spilledChocolates);
        }
    }

    // Create particle effect for missed chocolates
    createMissedChocolateParticles(position) {
        const particleCount = 15;
        const particleGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const particleMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 }); // Brown color
        
        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.copy(position);
            
            // Give particles random velocity
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                Math.random() * 0.2,
                (Math.random() - 0.5) * 0.2
            );
            
            particle.userData = { velocity };
            this.scene.add(particle);
            
            // Animate particle
            const animateParticle = () => {
                particle.position.add(velocity);
                velocity.y -= 0.01; // Gravity
                
                // Remove particle after it falls below the floor
                if (particle.position.y < -1) {
                    this.scene.remove(particle);
                    return;
                }
                
                requestAnimationFrame(animateParticle);
            };
            
            animateParticle();
        }
    }

    // Animate chocolate to trash pile
    animateChocolateToTrash(chocolate, startPosition, endPosition, onComplete) {
        chocolate.position.copy(startPosition);
        this.scene.add(chocolate);
        
        const startTime = Date.now();
        const duration = 1000; // 1 second
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Use an easing function for more natural motion
            const easedProgress = 1 - Math.pow(1 - progress, 3);
            
            // Update position
            chocolate.position.lerpVectors(startPosition, endPosition, easedProgress);
            
            // Add some rotation for visual interest
            chocolate.rotation.x += 0.05;
            chocolate.rotation.y += 0.05;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Animation complete
                this.scene.remove(chocolate);
                if (onComplete) onComplete();
            }
        };
        
        animate();
    }

    // Create a box for packed chocolates
    createChocolateBox() {
        // Create a box geometry
        const boxGeometry = new THREE.BoxGeometry(0.8, 0.4, 0.6);
        const boxMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8B4513, // Brown
            roughness: 0.5,
            metalness: 0.2
        });
        
        const chocolateBox = new THREE.Mesh(boxGeometry, boxMaterial);
        
        // Add some details to the box
        const lidGeometry = new THREE.BoxGeometry(0.85, 0.05, 0.65);
        const lidMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xA0522D, // Darker brown
            roughness: 0.3,
            metalness: 0.3
        });
        
        const lid = new THREE.Mesh(lidGeometry, lidMaterial);
        lid.position.y = 0.225; // Position on top of the box
        chocolateBox.add(lid);
        
        // Add a logo to the box
        const logoGeometry = new THREE.PlaneGeometry(0.4, 0.2);
        const logoMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xFFD700, // Gold
            side: THREE.DoubleSide
        });
        
        const logo = new THREE.Mesh(logoGeometry, logoMaterial);
        logo.position.y = 0.251;
        logo.position.z = 0.301;
        logo.rotation.x = Math.PI / 2;
        chocolateBox.add(logo);
        
        // Position the box
        const boxIndex = this.chocolateBoxes.length;
        const boxesPerRow = 3;
        const boxSpacing = 1;
        
        const row = Math.floor(boxIndex / boxesPerRow);
        const col = boxIndex % boxesPerRow;
        
        chocolateBox.position.set(
            -3 + col * boxSpacing,
            0.2,
            -8 - row * boxSpacing
        );
        
        // Add shadow casting
        chocolateBox.castShadow = true;
        chocolateBox.receiveShadow = true;
        
        // Add to scene and tracking array
        this.scene.add(chocolateBox);
        this.chocolateBoxes.push(chocolateBox);
        
        // Create particle effect for new box
        this.createBoxCreationEffect(chocolateBox.position.clone());
        
        return chocolateBox;
    }

    // Create particle effect for box creation
    createBoxCreationEffect(position) {
        const particleCount = 20;
        const particleGeometry = new THREE.SphereGeometry(0.03, 8, 8);
        const particleMaterial = new THREE.MeshBasicMaterial({ color: 0xFFD700 }); // Gold color
        
        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.copy(position);
            
            // Give particles random velocity in an upward fountain
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.01 + Math.random() * 0.03;
            const velocity = new THREE.Vector3(
                Math.cos(angle) * speed,
                0.05 + Math.random() * 0.1,
                Math.sin(angle) * speed
            );
            
            particle.userData = { velocity, life: 1.0 };
            this.scene.add(particle);
            
            // Animate particle
            const animateParticle = () => {
                particle.position.add(velocity);
                velocity.y -= 0.002; // Gravity
                
                // Fade out
                particle.userData.life -= 0.02;
                if (particle.userData.life <= 0) {
                    this.scene.remove(particle);
                    return;
                }
                
                // Scale particle based on remaining life
                const scale = particle.userData.life * 0.03;
                particle.scale.set(scale, scale, scale);
                
                requestAnimationFrame(animateParticle);
            };
            
            animateParticle();
        }
    }
} 