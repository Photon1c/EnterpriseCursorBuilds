import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.132.2/examples/jsm/controls/OrbitControls.js';
import { ConveyorBelt } from './conveyor.js';
import { Avatar } from './avatars.js';
import { TaskManager } from './tasks.js';
import { UIManager } from './ui.js';
import { makeElementDraggable, setupPanelControls } from './utils.js';

// Define states at the top level or within the class
export const SimState = {
    IDLE: 'idle',       // Before first start
    WORKING: 'working', // Simulation running during work hours
    PAUSED: 'paused',     // User paused during work hours
    END_OF_DAY: 'end_of_day' // Workday finished, waiting for next day
};

class Visualizer {
    constructor(config) {
        this.config = config;
        
        // Initialize callbacks object
        this.callbacks = {
            onEndOfDay: null
        };
        
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x112233); // Dark blue background
        
        // Get container dimensions
        this.container = document.getElementById(this.config.containerId);
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: document.getElementById(this.config.canvasId),
            antialias: true 
        });
        this.renderer.setSize(width, height);
        this.renderer.shadowMap.enabled = true;
        
        // Camera position
        this.camera.position.set(0, 5, 10);
        this.camera.lookAt(0, 0, 0);
        
        // Controls for camera movement
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        
        // Lighting
        this.setupLighting();
        
        // Factory environment
        this.setupEnvironment();
        
        // Game components
        this.conveyorBelt = new ConveyorBelt(this.scene);
        
        // Create avatars (Lucy, Ethel, Supervisor, Packer)
        this.avatars = {
            lucy: new Avatar(this.scene, 'Lucy', new THREE.Vector3(-2, 0, this.conveyorBelt.getZoneCenterZ('subprocess1_start', 'subprocess1_end'))),
            ethel: new Avatar(this.scene, 'Ethel', new THREE.Vector3(2, 0, this.conveyorBelt.getZoneCenterZ('subprocess1_start', 'subprocess1_end'))),
            supervisor: new Avatar(this.scene, 'Supervisor', new THREE.Vector3(-3, 0, this.conveyorBelt.getZoneCenterZ('subprocess2_start', 'subprocess2_end')), true), // isSupervisor = true
            packer: new Avatar(this.scene, 'Packer', new THREE.Vector3(3, 0, this.conveyorBelt.getZoneCenterZ('endZone_start', 'end')))
        };
        
        // Create UI Manager first before TaskManager, so the callbacks can reference it
        // UI Manager - Pass the UI prefix
        this.ui = new UIManager(this.config.uiPrefix, {
            onStart: () => this.startDay(),
            onPause: () => this.pauseDay(),
            onResume: () => this.resumeDay(),
            onStartNextDay: () => this.startNextDay(),
            onSpeedChange: (value) => this.setSpeed(value),
            onProcessTimeChange: (value) => this.setProcessTime(value),
            onPackerSpeedChange: (value) => this.setPackerSpeed(value),
            onSupervisorResponsivenessChange: (value) => this.setSupervisorResponsiveness(value),
            onInspect: (taskId) => this.inspectTask(taskId),
            onSupervisorIntervention: () => this.supervisorIntervention(),
            onReset: () => this.resetSimulation()
        });
        
        // Task management
        this.taskManager = new TaskManager(
            this,
            this.scene, 
            this.conveyorBelt,
            this.avatars,
            {
                onTaskWrapped: () => this.ui.updateStats('wrapped'),
                onTaskMissed: () => this.ui.updateStats('missed'),
                onTaskSpilled: (spilledCount) => this.ui.updateStats('spilled'),
                onTaskPacked: (taskId, packedCount) => this.ui.updatePackedCount(packedCount),
                onTimeLimitReached: () => this.handleTimeLimitReached()
            }
        );
        
        // Add Completion Boxes
        this.createCompletionBoxes();
        
        // Raycasting for object interaction
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.boundOnMouseClick = (event) => this.onMouseClick(event); // Bind the method
        
        // Animation
        this.clock = new THREE.Clock();
        this.isRunning = false;
        this.timeLimitReached = false; // Flag for time limit
        
        // Event listeners - Attach to the specific container
        this.container.addEventListener('resize', (e) => {
            e.preventDefault(); // Prevent default behavior
            this.onWindowResize();
        });

        this.container.addEventListener('click', (e) => {
            // Only process clicks if simulation is running
            if (this.isRunning || this.simulationState === SimState.PAUSED) {
                this.boundOnMouseClick(e);
            }
        });
        
        // Set initial speed from config
        this.setSpeed(this.config.initialSpeed);
        this.ui.speedSlider.value = this.config.initialSpeed;
        if (this.ui.speedValueDisplay) { // Update initial speed display
            this.ui.speedValueDisplay.textContent = this.config.initialSpeed;
        }
        
        // Set initial values for new parameters
        this.setProcessTime(this.config.initialProcessTime || 2.0);
        this.setPackerSpeed(this.config.initialPackerSpeed || 1.0);
        this.setSupervisorResponsiveness(this.config.initialSupervisorResponsiveness || 0.5);
        
        // State Management Properties
        this.WORK_START_HOUR = 8;
        this.WORK_END_HOUR = 17; // 5 PM (9 hours total, but 7 hour cap applies)
        this.MAX_WORK_SECONDS_PER_DAY = 7 * 3600; // 7 hours in seconds
        this.simulationTimeScale = 3600 / 60; // 1 real sec = 1 sim minute (slower than before)

        this.simulationState = SimState.IDLE;
        this.currentDay = 1;
        this.simulatedTimeOfDay = this.WORK_START_HOUR * 3600; // Start at 8 AM (in seconds)
        this.simulatedWorkSecondsToday = 0; // Track actual work time towards 7hr cap

        this.ui.updateDayDisplay(this.currentDay); // Initial day display
        this.ui.updateTimeDisplay(this.simulatedTimeOfDay); // Initial time display
        this.ui.updateControlState(this.simulationState); // Initial state
        
        // Do draggable controls setup only after everything else is initialized
        // Make controls panel draggable
        this.initDraggableControls();
        
        // Initialize callbacks for task events - do this last
        this.initCallbacks();
        
        // Initial render
        this.render();

        // Set the expectation simulation starting parameters
        this.setSpeed(20); // 10 chocolates every 3 minutes = 10 chocolates per 180 seconds = 1 chocolate every 18 seconds
        this.setProcessTime(3 * 60); // 3 minutes in seconds

        // Adjust the spill animation to occur when missed chocolates leave the conveyor belt
        this.taskManager.onMissedChocolateLeaveBelt = (chocolate) => {
            this.taskManager.createChocolateSpill(chocolate.position);
        };

        // Modify the "Workflow Simulator" title to be smaller, italicized, bold, and bright white
        const topContainer = document.getElementById('expectation-container');
        if (topContainer) {
            const title = document.createElement('div');
            title.className = 'workflow-title';
            title.textContent = 'Workflow Simulator';
            title.style.position = 'absolute';
            title.style.top = '10px';
            title.style.left = '50px';
            title.style.zIndex = '30';
            title.style.fontSize = '1rem'; // Smaller font size
            title.style.fontStyle = 'italic'; // Italicized
            title.style.fontWeight = 'bold'; // Bold
            title.style.color = '#FFFFFF'; // Bright white color
            topContainer.appendChild(title);

            // Hide the title after 15 seconds
            setTimeout(() => {
                title.style.display = 'none';
            }, 15000);
            
            // Add instructions prompt at the bottom of first simulation
            const instructionsPrompt = document.createElement('div');
            instructionsPrompt.className = 'instructions-prompt';
            instructionsPrompt.textContent = 'Press "i" for instructions';
            instructionsPrompt.style.position = 'absolute';
            instructionsPrompt.style.bottom = '10px';
            instructionsPrompt.style.left = '50%';
            instructionsPrompt.style.transform = 'translateX(-50%)';
            instructionsPrompt.style.zIndex = '30';
            instructionsPrompt.style.fontSize = '0.8rem';
            instructionsPrompt.style.color = '#FFFFFF'; // Bright white
            instructionsPrompt.style.textAlign = 'center';
            instructionsPrompt.style.fontWeight = 'bold';
            topContainer.appendChild(instructionsPrompt);
            
            // Make the instructions prompt blink
            let visible = true;
            setInterval(() => {
                visible = !visible;
                instructionsPrompt.style.opacity = visible ? '1' : '0';
            }, 1000); // Toggle every second
            
            // Add event listener for "i" key to show instructions
            document.addEventListener('keydown', (e) => {
                if (e.key.toLowerCase() === 'i') {
                    this.showInstructions();
                }
            });
        }
    }
    
    setupLighting() {
        // Ambient light for general illumination
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);
        
        // Add a HemisphereLight for basic global illumination
        const hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.6); // Sky, Ground, Intensity
        this.scene.add(hemisphereLight);
        
        // Main light above the conveyor
        const mainLight = new THREE.DirectionalLight(0xffffeb, 0.8);
        mainLight.position.set(0, 10, 5);
        mainLight.castShadow = true;
        
        // Better shadow quality
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.camera.near = 0.5;
        mainLight.shadow.camera.far = 50;
        mainLight.shadow.camera.left = -10;
        mainLight.shadow.camera.right = 10;
        mainLight.shadow.camera.top = 10;
        mainLight.shadow.camera.bottom = -10;
        
        this.scene.add(mainLight);
        
        // Additional fill light from the front
        const fillLight = new THREE.DirectionalLight(0xffffeb, 0.3);
        fillLight.position.set(0, 5, 8);
        this.scene.add(fillLight);
    }
    
    setupEnvironment() {
        // Factory floor
        const floorGeometry = new THREE.PlaneGeometry(30, 30);
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x333333,
            roughness: 0.8,
            metalness: 0.2
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -1;
        floor.receiveShadow = true;
        this.scene.add(floor);
        
        // Factory walls (simple background)
        const wallGeometry = new THREE.PlaneGeometry(30, 15);
        const wallMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x5c5c5c,
            roughness: 0.7,
            metalness: 0.1
        });
        
        // Back wall
        const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
        backWall.position.z = -10;
        backWall.position.y = 6.5;
        this.scene.add(backWall);
        
        // Optional: add some factory decoration items
        this.addFactoryDecorations();
    }
    
    addFactoryDecorations() {
        // Factory equipment (simple boxes/cylinders to represent machinery)
        const machineryGeometry = new THREE.BoxGeometry(2, 3, 2);
        const machineryMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x3a7ca5,
            roughness: 0.6
        });
        
        // Left machinery
        const leftMachinery = new THREE.Mesh(machineryGeometry, machineryMaterial);
        leftMachinery.position.set(-6, 0.5, -5);
        leftMachinery.castShadow = true;
        leftMachinery.receiveShadow = true;
        this.scene.add(leftMachinery);
        
        // Right machinery
        const rightMachinery = new THREE.Mesh(machineryGeometry, machineryMaterial);
        rightMachinery.position.set(6, 0.5, -5);
        rightMachinery.castShadow = true;
        rightMachinery.receiveShadow = true;
        this.scene.add(rightMachinery);
        
        // Ceiling lights (simple cylinders)
        const lightFixtureGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16);
        const lightFixtureMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffffff,
            emissive: 0xffffcc,
            emissiveIntensity: 0.5
        });
        
        for (let x = -8; x <= 8; x += 4) {
            const lightFixture = new THREE.Mesh(lightFixtureGeometry, lightFixtureMaterial);
            lightFixture.position.set(x, 8, 0);
            this.scene.add(lightFixture);
            
            // Add a pointlight below each fixture
            const pointLight = new THREE.PointLight(0xffffeb, 0.5, 15);
            pointLight.position.set(x, 7.8, 0);
            this.scene.add(pointLight);
        }
    }
    
    onWindowResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        if (!width || !height) return; // Avoid errors if container isn't sized yet

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
    
    onMouseClick(event) {
        // Get mouse position relative to the container
        const rect = this.container.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Calculate mouse position in normalized device coordinates
        this.mouse.x = (x / this.container.clientWidth) * 2 - 1;
        this.mouse.y = -(y / this.container.clientHeight) * 2 + 1;
        
        // Update the picking ray with the camera and mouse position
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Get all chocolates/tasks that we can click on
        const intersects = this.raycaster.intersectObjects(this.taskManager.getInteractiveTasks());
        
        if (intersects.length > 0) {
            const taskObject = intersects[0].object;
            const taskId = taskObject.userData.taskId;
            
            // Manual wrapping on click (if not already wrapped)
            if (!taskObject.userData.isWrapped) {
                this.taskManager.wrapTask(taskId);
            }
            
            // Show task inspector with details
            this.inspectTask(taskId);
        }
    }
    
    inspectTask(taskId) {
        const taskDetails = this.taskManager.getTaskDetails(taskId);
        this.ui.showTaskInspector(taskDetails);
    }
    
    startDay() {
        if (this.simulationState !== SimState.IDLE && this.simulationState !== SimState.END_OF_DAY) return;

        console.log(`${this.config.uiPrefix} Starting Day ${this.currentDay}`);
        this.simulationState = SimState.WORKING;
        if (!this.clock.running) this.clock.start();
        this.taskManager.startTaskGeneration();
        this.ui.updateControlState(this.simulationState);

        // Reset daily work timer
        this.simulatedWorkSecondsToday = 0;

        // Make workers appear/activate
        this.setWorkerVisibility(true);
    }
    
    pauseDay() {
        if (this.simulationState !== SimState.WORKING) return;

        console.log(`${this.config.uiPrefix} Pausing Day ${this.currentDay}`);
        this.simulationState = SimState.PAUSED;
        // Keep clock running for time of day, but stop task generation/movement via isRunning flag?
        // OR stop clock entirely? Let's stop updates by checking state in render loop.
        // if (this.clock.running) this.clock.stop(); // Optional: Stop clock?
        this.taskManager.stopTaskGeneration();
        this.ui.updateControlState(this.simulationState);
    }
    
    resumeDay() {
        if (this.simulationState !== SimState.PAUSED) return;

        console.log(`${this.config.uiPrefix} Resuming Day ${this.currentDay}`);
        this.simulationState = SimState.WORKING;
        // if (!this.clock.running) this.clock.start(); // Optional: Restart clock if stopped
        this.taskManager.startTaskGeneration();
        this.ui.updateControlState(this.simulationState);
    }
    
    endDay() {
        // End day if working or paused
        if (this.simulationState !== SimState.WORKING && this.simulationState !== SimState.PAUSED) return; 

        console.log(`${this.config.uiPrefix} Ending Day ${this.currentDay}`);
        this.simulationState = SimState.END_OF_DAY;
        this.taskManager.stopTaskGeneration();
        
        // Allow time for tasks on belt to finish? Add grace period later.
        this.ui.updateControlState(this.simulationState);
        
        // Display end of day summary through UI
        this.ui.displayEndOfDaySummary(this.currentDay, this.taskManager.stats);
        
        // Call onEndOfDay callback if set
        if (this.callbacks && typeof this.callbacks.onEndOfDay === 'function') {
            this.callbacks.onEndOfDay(this.currentDay);
        }

        // Make workers disappear/deactivate
        this.setWorkerVisibility(false);
    }
    
    startNextDay() {
        if (this.simulationState !== SimState.END_OF_DAY) return;

        this.currentDay++;
        console.log(`${this.config.uiPrefix} Preparing for Day ${this.currentDay}`);
        this.simulatedTimeOfDay = this.WORK_START_HOUR * 3600; // Reset time
        this.simulatedWorkSecondsToday = 0;
        this.ui.updateDayDisplay(this.currentDay);
        this.ui.updateTimeDisplay(this.simulatedTimeOfDay);

        // Reset parts of the simulation (keep learning?)
        this.resetForNextDay();

        // Start the new day automatically
        this.startDay();
    }
    
    setWorkerVisibility(isVisible) {
        Object.values(this.avatars).forEach(avatar => {
            avatar.avatar.visible = isVisible;
            // Could add leaving/returning animation later
        });
        // Also hide/show completion boxes?
        this.completionBoxes.forEach(box => box.visible = isVisible);
    }
    
    resetForNextDay() {
        console.log(`${this.config.uiPrefix} Resetting for next day...`);
        // Clear remaining tasks visually and internally
        this.taskManager.tasks.forEach(task => {
            if (task.object) this.scene.remove(task.object);
        });
        this.taskManager.tasks.clear();
        this.taskManager.taskObjects = [];
        // Don't reset *all* stats, just daily? Or keep cumulative? Let's keep cumulative for now.
        // Reset packed count for the new day if needed by UI display logic
        this.ui.updatePackedCount(this.taskManager.stats.packedChocolates); // Reflect total packed so far

        // Reset avatar fatigue (partially?)
        Object.values(this.avatars).forEach(avatar => {
            avatar.fatigue = Math.max(0, avatar.fatigue - 0.5); // Recover some fatigue overnight
            // Keep experience
            avatar.frantic = false;
            // Reset visual fatigue state
            avatar.body.position.y = 1.05;
            avatar.head.position.y = 1.6;
            if (avatar.isSupervisor) avatar.avatar.position.x = avatar.position.x; // Reset supervisor pacing
        });

        // Reset UI? (Efficiency might carry over or reset daily)
        this.ui.updateStats('reset'); // Add a reset mode to UI stats update? Or handle in UI's reset method

        this.timeLimitReached = false; // Clear 7hr flag
    }
    
    setSpeed(value) {
        const speed = parseFloat(value);
        
        // Convert the slider value (chocolates per hour) to our internal taskSpeed
        // With our default ranges:
        // - 15 chocolates/hour ≈ 1 chocolate every 4 minutes of sim time or 240 seconds
        // - 1 chocolate every 4 seconds of real time with the adjusted time scale
        
        this.taskManager.setTaskSpeed(speed);
        
        // Slower conveyor speed to match
        this.conveyorBelt.setSpeed(speed / 20); // Scale down for visual effect
        
        // Update avatar behavior based on speed
        const franticThreshold = 30; // Speed above which workers become frantic (adjusted for new scale)
        
        Object.entries(this.avatars).forEach(([name, avatar]) => {
            // Regular workers get frantic at different speeds
            if (name === 'lucy' || name === 'ethel') {
                avatar.setFrantic(speed > franticThreshold);
            }
            // Packer has higher tolerance
            else if (name === 'packer') {
                avatar.setFrantic(speed > franticThreshold + 10);
            }
            // Supervisor gets frantic at extremes
            else if (name === 'supervisor') {
                avatar.setFrantic(speed > franticThreshold + 5 || speed < 10);
            }
        });
        
        // Update UI display
        if (this.ui.speedValueDisplay) {
            this.ui.speedValueDisplay.textContent = speed;
        }
    }
    
    render() {
        requestAnimationFrame(() => this.render());
        
        const delta = this.clock.getDelta();
        
        // Only update simulation logic if in the WORKING state
        if (this.simulationState === SimState.WORKING) {
            // Advance simulated time of day
            const timeIncrement = delta * this.simulationTimeScale;
            this.simulatedTimeOfDay += timeIncrement;
            this.simulatedWorkSecondsToday += timeIncrement; // Track actual work time

            // Update UI display for time
            this.ui.updateTimeDisplay(this.simulatedTimeOfDay);

            // --- Update Game Components ---
            this.conveyorBelt.update(delta);
            this.taskManager.update(delta);
            Object.values(this.avatars).forEach(avatar => avatar.update(delta));

            // --- Check for End of Day --- (Work End Hour OR 7hr Cap)
            const currentHour = this.simulatedTimeOfDay / 3600;
            const hitTimeCap = this.simulatedWorkSecondsToday >= this.MAX_WORK_SECONDS_PER_DAY;

            if (currentHour >= this.WORK_END_HOUR || hitTimeCap) {
                if(hitTimeCap) console.log(`${this.config.uiPrefix} Hit 7-hour work limit.`);
                this.endDay();
            }
        } else if (this.simulationState === SimState.PAUSED) {
            // Time does not advance when paused in this model
        }
        
        // Update controls
        this.controls.update();
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
    
    createCompletionBoxes() {
        // Create visual indicator boxes for completion zones
        this.completionBoxes = [];

        // Create box for the packing station
        const packingBox = new THREE.Mesh(
            new THREE.BoxGeometry(6, 0.5, 2),
            new THREE.MeshStandardMaterial({
                color: 0x2196F3,
                transparent: true,
                opacity: 0.3
            })
        );
        
        // Position at the end of the conveyor (adjust as needed)
        packingBox.position.set(0, 0, this.conveyorBelt.getZoneCenterZ('endZone_start', 'end'));
        packingBox.receiveShadow = true;
        this.scene.add(packingBox);
        this.completionBoxes.push(packingBox);
        
        // Create box for the subprocess completion zone
        const subprocessBox = new THREE.Mesh(
            new THREE.BoxGeometry(6, 0.5, 2),
            new THREE.MeshStandardMaterial({
                color: 0x4CAF50,
                transparent: true,
                opacity: 0.3
            })
        );
        
        // Position at the first subprocess area
        subprocessBox.position.set(0, 0, this.conveyorBelt.getZoneCenterZ('subprocess1_start', 'subprocess1_end'));
        subprocessBox.receiveShadow = true;
        this.scene.add(subprocessBox);
        this.completionBoxes.push(subprocessBox);
    }
    
    handleTimeLimitReached() {
        // Called when 7-hour work limit is reached
        this.timeLimitReached = true;
        console.log(`${this.config.uiPrefix} Time limit reached for the day!`);
        // End of day handling now in render loop
    }
    
    // New methods for handling parameter changes
    setProcessTime(value) {
        const processTime = parseFloat(value);
        this.taskManager.setChocolateProcessTime(processTime);
        
        // Update UI display
        if (this.ui.processTimeValueDisplay) {
            this.ui.processTimeValueDisplay.textContent = processTime.toFixed(1);
        }
    }
    
    setPackerSpeed(value) {
        const packerSpeed = parseFloat(value);
        this.taskManager.setPackerSpeed(packerSpeed);
        
        // Update UI display
        if (this.ui.packerSpeedValueDisplay) {
            this.ui.packerSpeedValueDisplay.textContent = packerSpeed.toFixed(1);
        }
    }
    
    setSupervisorResponsiveness(value) {
        const responsiveness = parseFloat(value);
        this.taskManager.setSupervisorResponsiveness(responsiveness);
        
        // Update UI display
        if (this.ui.supervisorResponsivenessValueDisplay) {
            this.ui.supervisorResponsivenessValueDisplay.textContent = responsiveness.toFixed(1);
        }
    }

    initDraggableControls() {
        const expectationControls = document.getElementById('expectation-controls');
        const realityControls = document.getElementById('reality-controls');
        
        // Check if controls exist before proceeding
        if (!expectationControls || !realityControls) {
            console.warn('Controls panels not found in the DOM. Skipping draggable controls setup.');
            return;
        }
        
        const expHeader = expectationControls.querySelector('.controls-header');
        const realHeader = realityControls.querySelector('.controls-header');
        
        // Don't need minimize buttons from utils.js anymore
        // const expMinButton = expectationControls.querySelector('.minimize-button');
        // const realMinButton = realityControls.querySelector('.minimize-button');
        
        // Make controls draggable using the header if headers exist
        if (expHeader) {
            makeElementDraggable(expectationControls, expHeader);
        } else {
            console.warn('Header not found for expectation controls. Using panel as drag handle.');
            makeElementDraggable(expectationControls);
        }
        
        if (realHeader) {
            makeElementDraggable(realityControls, realHeader);
        } else {
            console.warn('Header not found for reality controls. Using panel as drag handle.');
            makeElementDraggable(realityControls);
        }
        
        // REMOVED: Calls to setupPanelControls to avoid duplicate buttons
        // setupPanelControls(expectationControls, expHeader, expMinButton);
        // setupPanelControls(realityControls, realHeader, realMinButton);
        
        // REMOVED: Initial positioning, as panels now start hidden
        // expectationControls.style.position = 'absolute';
        // expectationControls.style.left = '10px';
        // expectationControls.style.top = '10px';
        // 
        // realityControls.style.position = 'absolute';
        // realityControls.style.right = '10px';
        // realityControls.style.top = '10px';
    }

    initCallbacks() {
        // Set up callback for task generated
        this.taskManager.callbacks.onTaskGenerated = (taskId) => {
            // Update UI if needed when task is generated
            console.log(`Task ${taskId} generated`);
        };
        
        // Set up callback for task wrapped
        this.taskManager.callbacks.onTaskWrapped = (taskId) => {
            // Update UI when task is wrapped
            if (this.ui) {
                this.ui.updateStats('wrapped');
            }
        };
        
        // Set up callback for task missed
        this.taskManager.callbacks.onTaskMissed = (taskId) => {
            // Update UI when task is missed
            if (this.ui) {
                this.ui.updateStats('missed');
                
                // Update spilled count separately since not all missed chocolates have an animation
                this.ui.updateStats('spilled');
            }
        };
        
        // Set up callback for task packed
        this.taskManager.callbacks.onTaskPacked = (taskId, packedCount) => {
            // Update packed count in UI
            if (this.ui) {
                this.ui.updatePackedCount(packedCount);
            }
        };
        
        // Set up callback for end of day
        // Make sure the callbacks object exists
        if (!this.callbacks) {
            this.callbacks = {};
        }
        
        this.callbacks.onEndOfDay = (day) => {
            // Call end-of-day summary in UI
            if (this.ui) {
                this.ui.displayEndOfDaySummary(day, this.taskManager.stats);
                
                // Reset stats for next day
                this.taskManager.resetStats();
                this.ui.updateStats('reset', this.taskManager.stats);
            }
        };
    }

    supervisorIntervention() {
        // Forward to task manager
        if (this.taskManager) {
            console.log(`${this.config.uiPrefix} Supervisor intervention triggered`);
            return this.taskManager.supervisorIntervention();
        }
        return false;
    }

    resetSimulation() {
        console.log(`${this.config.uiPrefix} Resetting Simulation`);
        this.currentDay = 1;
        this.simulatedTimeOfDay = this.WORK_START_HOUR * 3600;
        this.simulatedWorkSecondsToday = 0;
        this.ui.updateDayDisplay(this.currentDay);
        this.ui.updateTimeDisplay(this.simulatedTimeOfDay);
        this.ui.updateStats('reset');
        this.taskManager.resetStats();
        this.setWorkerVisibility(false);
        this.setSpeed(this.config.initialSpeed);
        this.setProcessTime(this.config.initialProcessTime);
        this.setPackerSpeed(this.config.initialPackerSpeed);
        this.setSupervisorResponsiveness(this.config.initialSupervisorResponsiveness);
        this.ui.resetUI();
        this.render();
    }

    // Add method to show instructions - completely rewritten with simpler, more reliable approach
    showInstructions() {
        // Remove any existing instructions modal first
        const existingModal = document.querySelector('.instructions-modal');
        if (existingModal) {
            document.body.removeChild(existingModal);
        }
        
        // Create a container div for the modal
        const modalContainer = document.createElement('div');
        modalContainer.className = 'instructions-modal';
        modalContainer.style.position = 'fixed';
        modalContainer.style.top = '0';
        modalContainer.style.left = '0';
        modalContainer.style.width = '100%';
        modalContainer.style.height = '100%';
        modalContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        modalContainer.style.display = 'flex';
        modalContainer.style.justifyContent = 'center';
        modalContainer.style.alignItems = 'center';
        modalContainer.style.zIndex = '1000';
        
        // Create the modal content
        const modalContent = document.createElement('div');
        modalContent.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        modalContent.style.color = '#FFFFFF';
        modalContent.style.padding = '20px';
        modalContent.style.borderRadius = '8px';
        modalContent.style.maxWidth = '600px';
        modalContent.style.width = '80%';
        modalContent.style.boxShadow = '0 0 20px rgba(255, 255, 255, 0.3)';
        modalContent.style.position = 'relative';
        
        // Add the instructions content
        modalContent.innerHTML = `
            <h2 style="text-align: center; color: #f64c72;">Chocolate Factory Workflow Simulator</h2>
            <p><strong>Goal:</strong> Manage the chocolate wrapping and packing process efficiently.</p>
            <h3>Controls:</h3>
            <ul>
                <li><strong>⚙️ Button:</strong> Show/hide control panel</li>
                <li><strong>Start Day:</strong> Begin the simulation</li>
                <li><strong>Pause/Resume:</strong> Control the simulation flow</li>
                <li><strong>Speed Slider:</strong> Adjust chocolate production rate</li>
                <li><strong>Supervisor Button:</strong> Call for help when there are too many spills</li>
                <li><strong>Reset Button:</strong> Start over from day 1</li>
            </ul>
            <h3>Chocolates:</h3>
            <ul>
                <li><strong>Wrapped:</strong> Successfully processed chocolates</li>
                <li><strong>Missed:</strong> Unwrapped chocolates fall off the belt and spill</li>
                <li><strong>Spilled:</strong> Count of chocolate spills on the floor</li>
                <li><strong>Packed:</strong> Wrapped chocolates packed into boxes</li>
            </ul>
            <p><strong>Tip:</strong> Watch your efficiency rate and call the supervisor when needed!</p>
        `;
        
        // Create the close button separately
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.style.marginTop = '15px';
        closeButton.style.padding = '8px 16px';
        closeButton.style.backgroundColor = '#f64c72';
        closeButton.style.color = 'white';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '4px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.display = 'block';
        closeButton.style.margin = '15px auto 0 auto';
        
        // Add the close button to the modal content
        modalContent.appendChild(closeButton);
        
        // Add the modal content to the container
        modalContainer.appendChild(modalContent);
        
        // Add the container to the body
        document.body.appendChild(modalContainer);
        
        // Simple close function
        const closeModal = function() {
            document.body.removeChild(modalContainer);
        };
        
        // Add click event to close button
        closeButton.onclick = closeModal;
        
        // Close when clicking outside the modal content
        modalContainer.addEventListener('click', function(e) {
            if (e.target === modalContainer) {
                closeModal();
            }
        });
        
        // Close when pressing Escape
        document.addEventListener('keydown', function handleEscape(e) {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleEscape);
            }
        });
    }
}

// Initialize our visualizers when the page is loaded
window.addEventListener('DOMContentLoaded', () => {
    const expectationConfig = {
        containerId: 'expectation-container',
        canvasId: 'expectation-scene',
        uiPrefix: 'expectation-',
        initialSpeed: 15, // 15 chocolates/hour (≈ 1 every 4 seconds with our timeScale)
        initialProcessTime: 1.5, // Faster processing in the "expectation" scenario
        initialPackerSpeed: 1.2, // Slightly faster packer
        initialSupervisorResponsiveness: 0.8 // More responsive supervisor
    };

    const realityConfig = {
        containerId: 'reality-container',
        canvasId: 'reality-scene',
        uiPrefix: 'reality-',
        initialSpeed: 30, // 30 chocolates/hour (≈ 1 every 2 seconds with our timeScale)
        initialProcessTime: 2.5, // Slower processing in the "reality" scenario
        initialPackerSpeed: 0.8, // Slower, more realistic packer
        initialSupervisorResponsiveness: 0.4 // Less responsive supervisor
    };

    const expectationVisualizer = new Visualizer(expectationConfig);
    const realityVisualizer = new Visualizer(realityConfig);
}); 