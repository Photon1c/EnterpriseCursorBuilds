import { SimState } from './main.js'; // Assuming SimState is exported from main.js or defined globally
import { preventDragPropagation } from './utils.js';

export class UIManager {
    constructor(prefix, callbacks) {
        this.prefix = prefix || '';
        this.callbacks = callbacks || {};
        this.stats = {
            wrapped: 0,
            missed: 0,
            packedChocolates: 0,
            totalGenerated: 0,
            spilledChocolates: 0
        };
        this.currentDay = 1; // Store day locally for display reset
        
        // Initialize the UI elements
        this.initUI();
        
        // Buttons will be added by initUI
    }
    
    initUI() {
        // Get UI elements
        this.startPauseResumeButton = document.getElementById(this.prefix + 'start-button'); // Reuse button, change text
        this.nextDayButton = document.getElementById(this.prefix + 'pause-button'); // Reuse button, change text/visibility
        this.speedSlider = document.getElementById(this.prefix + 'speed-slider');
        this.speedValueDisplay = document.getElementById(this.prefix + 'speed-value');
        
        // New parameter controls
        this.processTimeSlider = document.getElementById(this.prefix + 'process-time-slider');
        this.processTimeValueDisplay = document.getElementById(this.prefix + 'process-time-value');
        this.packerSpeedSlider = document.getElementById(this.prefix + 'packer-speed-slider');
        this.packerSpeedValueDisplay = document.getElementById(this.prefix + 'packer-speed-value');
        this.supervisorResponsivenessSlider = document.getElementById(this.prefix + 'supervisor-responsiveness-slider');
        this.supervisorResponsivenessValueDisplay = document.getElementById(this.prefix + 'supervisor-responsiveness-value');
        
        this.dayDisplay = document.getElementById(this.prefix + 'day-display'); // Get Day display element
        this.timeElapsedDisplay = document.getElementById(this.prefix + 'time-elapsed');
        this.packedCountDisplay = document.getElementById(this.prefix + 'packed-count');
        this.wrappedCount = document.getElementById(this.prefix + 'wrapped-count');
        this.missedCount = document.getElementById(this.prefix + 'missed-count');
        this.spilledCount = document.getElementById(this.prefix + 'spilled-count'); // New counter for spilled chocolates
        this.efficiency = document.getElementById(this.prefix + 'efficiency');
        this.taskInspector = document.getElementById(this.prefix + 'task-inspector');
        this.taskDetails = document.getElementById(this.prefix + 'task-details');
        this.closeInspectorButton = document.getElementById(this.prefix + 'close-inspector');
        this.summaryDisplay = document.getElementById(this.prefix + 'summary-display'); // Element for end-of-day summary
        
        // --- Event Listeners ---
        this.startPauseResumeButton.addEventListener('click', () => {
            const currentState = this.startPauseResumeButton.dataset.state;
            // Use SimState constants if imported/available
            if (currentState === 'idle' || currentState === 'end_of_day') {
                // Hide controls panel before starting the day
                this.hideControlsOnStart();
                if (this.callbacks.onStart) this.callbacks.onStart();
            } else if (currentState === 'working') {
                if (this.callbacks.onPause) this.callbacks.onPause();
            } else if (currentState === 'paused') {
                if (this.callbacks.onResume) this.callbacks.onResume();
            }
        });
        
        this.nextDayButton.addEventListener('click', () => {
            if (this.callbacks.onStartNextDay) {
                this.callbacks.onStartNextDay();
            }
        });
        
        // Speed slider listener
        if (this.speedSlider) {
            this.speedSlider.addEventListener('input', (event) => {
                const speed = event.target.value;
                if (this.callbacks.onSpeedChange) {
                    this.callbacks.onSpeedChange(speed);
                }
                if (this.speedValueDisplay) {
                    this.speedValueDisplay.textContent = speed; // Update the display
                }
            });
        }
        
        // Process time slider listener
        if (this.processTimeSlider) {
            this.processTimeSlider.addEventListener('input', (event) => {
                const time = event.target.value;
                if (this.callbacks.onProcessTimeChange) {
                    this.callbacks.onProcessTimeChange(time);
                }
                if (this.processTimeValueDisplay) {
                    this.processTimeValueDisplay.textContent = parseFloat(time).toFixed(1);
                }
            });
        }
        
        // Packer speed slider listener
        if (this.packerSpeedSlider) {
            this.packerSpeedSlider.addEventListener('input', (event) => {
                const speed = event.target.value;
                if (this.callbacks.onPackerSpeedChange) {
                    this.callbacks.onPackerSpeedChange(speed);
                }
                if (this.packerSpeedValueDisplay) {
                    this.packerSpeedValueDisplay.textContent = parseFloat(speed).toFixed(1);
                }
            });
        }
        
        // Supervisor responsiveness slider listener
        if (this.supervisorResponsivenessSlider) {
            this.supervisorResponsivenessSlider.addEventListener('input', (event) => {
                const responsiveness = event.target.value;
                if (this.callbacks.onSupervisorResponsivenessChange) {
                    this.callbacks.onSupervisorResponsivenessChange(responsiveness);
                }
                if (this.supervisorResponsivenessValueDisplay) {
                    this.supervisorResponsivenessValueDisplay.textContent = parseFloat(responsiveness).toFixed(1);
                }
            });
        }
        
        // Close inspector listener
         this.closeInspectorButton.addEventListener('click', () => {
             this.hideTaskInspector();
         });
        
        // Initialize slider value displays
        if (this.speedValueDisplay && this.speedSlider) {
            this.speedValueDisplay.textContent = this.speedSlider.value;
        }
        if (this.processTimeValueDisplay && this.processTimeSlider) {
            this.processTimeValueDisplay.textContent = parseFloat(this.processTimeSlider.value).toFixed(1);
        }
        if (this.packerSpeedValueDisplay && this.packerSpeedSlider) {
            this.packerSpeedValueDisplay.textContent = parseFloat(this.packerSpeedSlider.value).toFixed(1);
        }
        if (this.supervisorResponsivenessValueDisplay && this.supervisorResponsivenessSlider) {
            this.supervisorResponsivenessValueDisplay.textContent = parseFloat(this.supervisorResponsivenessSlider.value).toFixed(1);
        }

        // Prevent drag propagation on all sliders
        const sliders = document.querySelectorAll('input[type="range"]');
        sliders.forEach(slider => {
            preventDragPropagation(slider);
        });

        // Add the standalone "Show Controls" buttons
        this.addShowControlsButtons();
        
        // Make sure the other window has controls as well
        this.ensureControlButtonsExist();
    }
    
    // --- Display Update Methods ---
    
    updateDayDisplay(day) {
        this.currentDay = day;
        if (this.dayDisplay) {
            this.dayDisplay.textContent = `Day: ${day}`;
        }
    }
    
    updateTimeDisplay(simulatedTimeOfDaySeconds) {
         if (!this.timeElapsedDisplay) return;
         const hours = Math.floor(simulatedTimeOfDaySeconds / 3600);
         const minutes = Math.floor((simulatedTimeOfDaySeconds % 3600) / 60);
         const displayHours = String(hours).padStart(2, '0');
         const displayMinutes = String(minutes).padStart(2, '0');
         this.timeElapsedDisplay.textContent = `Time: ${displayHours}:${displayMinutes}`;

         // Reset color unless end of day state handles it
          if (this.timeElapsedDisplay.style.color !== 'red') { // Don't reset if already red (end of day)
             this.timeElapsedDisplay.style.color = '';
         }
    }
    
    // Accepts 'reset', 'wrapped', 'missed', 'spilled'. 'packed' handled by updatePackedCount
    updateStats(type, taskStats = null) { 
        if (type === 'reset') {
            if(taskStats) { // If main simulation passes its stats on reset
                this.stats = { 
                    wrapped: taskStats.wrapped || 0,
                    missed: taskStats.missed || 0,
                    packedChocolates: taskStats.packedChocolates || 0,
                    totalGenerated: taskStats.totalGenerated || 0,
                    spilledChocolates: taskStats.spilledChocolates || 0 // Include spilled chocolates
                 }; 
            } else { // Default reset
                 this.stats = { wrapped: 0, missed: 0, packedChocolates: 0, totalGenerated: 0, spilledChocolates: 0 };
            }
            // Update displays from internal stats
            if(this.packedCountDisplay) this.packedCountDisplay.textContent = `Packed: ${this.stats.packedChocolates}`;
            if(this.wrappedCount) this.wrappedCount.textContent = `Wrapped: ${this.stats.wrapped}`;
            if(this.missedCount) this.missedCount.textContent = `Missed: ${this.stats.missed}`;
            if(this.spilledCount) this.spilledCount.textContent = `Spilled: ${this.stats.spilledChocolates}`;
            
            // Reset any visual indicators
            if (this.spilledCount) {
                this.spilledCount.classList.remove('stat-warning', 'stat-danger');
            }
        } else if (type === 'wrapped') { 
            this.stats.wrapped++; // Increment success count
            if(this.wrappedCount) this.wrappedCount.textContent = `Wrapped: ${this.stats.wrapped}`;
        } else if (type === 'missed') {
            this.stats.missed++; // Increment missed count
            if(this.missedCount) this.missedCount.textContent = `Missed: ${this.stats.missed}`;
        } else if (type === 'spilled') {
            this.stats.spilledChocolates++; // Increment spilled count
            if(this.spilledCount) {
                this.spilledCount.textContent = `Spilled: ${this.stats.spilledChocolates}`;
                
                // Add visual indicators based on spillage level
                if (this.stats.spilledChocolates > 10) {
                    this.spilledCount.classList.add('stat-danger');
                    this.spilledCount.classList.remove('stat-warning');
                } else if (this.stats.spilledChocolates > 5) {
                    this.spilledCount.classList.add('stat-warning');
                    this.spilledCount.classList.remove('stat-danger');
                }
            }
        }
        // Note: packed count display is updated via updatePackedCount

        // Update efficiency (based on wrapped/packed vs total processed for the day/session?)
        const totalProcessed = this.stats.wrapped + this.stats.missed; // Use wrapped as success count
        if (totalProcessed > 0) {
            const efficiencyValue = Math.round((this.stats.wrapped / totalProcessed) * 100);
            this.efficiency.textContent = `Efficiency: ${efficiencyValue}%`;
            // Color coding for efficiency
            if (efficiencyValue > 80) this.efficiency.style.color = '#4CAF50';
            else if (efficiencyValue > 60) this.efficiency.style.color = '#FFC107';
            else this.efficiency.style.color = '#F44336';
        } else {
             this.efficiency.textContent = `Efficiency: N/A`;
             this.efficiency.style.color = '';
        }
    }
    
    updatePackedCount(count) {
         this.stats.packedChocolates = count; // Update internal state too
         if (this.packedCountDisplay) {
            this.packedCountDisplay.textContent = `Packed: ${count}`;
         }
     }
    
    displayEndOfDaySummary(day, finalStats) {
        if(!this.summaryDisplay) {
            console.warn('Summary display element not found for prefix:', this.prefix);
            return;
        }
        
        // Use provided stats, assuming they are cumulative for the session
        const total = finalStats.wrapped + finalStats.missed; 
        const efficiency = total > 0 ? Math.round((finalStats.wrapped / total) * 100) : 'N/A';
        
        // Calculate productivity metrics
        const packedPerHour = finalStats.packedChocolates / 8; // Assuming 8-hour work day
        
        // Determine performance rating
        let performanceRating = 'Poor';
        if (efficiency > 90) performanceRating = 'Excellent';
        else if (efficiency > 75) performanceRating = 'Good';
        else if (efficiency > 60) performanceRating = 'Average';
        
        // Calculate bonus based on performance
        const hasBonus = efficiency > 80;
        const bonusText = hasBonus ? 
            `<span class="bonus-indicator">+$${Math.floor(efficiency / 10)}.00 Bonus!</span>` : '';
        
        this.summaryDisplay.innerHTML = `
            <strong class="summary-title">End of Day ${day}</strong><br>
            <div class="summary-metrics">
                <div class="summary-row">
                    <span>Packed:</span> <span class="summary-value">${finalStats.packedChocolates}</span>
                </div>
                <div class="summary-row">
                    <span>Wrapped:</span> <span class="summary-value">${finalStats.wrapped}</span>
                </div>
                <div class="summary-row">
                    <span>Missed:</span> <span class="summary-value">${finalStats.missed}</span>
                </div>
                <div class="summary-row">
                    <span>Spilled:</span> <span class="summary-value">${finalStats.spilledChocolates || 0}</span>
                </div>
                <div class="summary-row">
                    <span>Efficiency:</span> <span class="summary-value">${efficiency}%</span>
                </div>
                <div class="summary-row">
                    <span>Chocolates/Hour:</span> <span class="summary-value">${packedPerHour.toFixed(1)}</span>
                </div>
                <div class="summary-row performance-rating">
                    Rating: <span class="rating-${performanceRating.toLowerCase()}">${performanceRating}</span>
                </div>
                ${bonusText}
            </div>
            <button class="summary-close-btn">Continue</button>
        `;
        
        // Add click handler for the close button
        const closeBtn = this.summaryDisplay.querySelector('.summary-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.summaryDisplay.classList.remove('summary-animate');
                this.summaryDisplay.style.display = 'none';
            });
        }
        
        // Show and animate the summary
        this.summaryDisplay.style.display = 'block';
        this.summaryDisplay.classList.add('summary-animate');
    }
    
    hideEndOfDaySummary() {
          if(this.summaryDisplay) this.summaryDisplay.classList.add('hidden');
     }

    // --- State and Control Updates --- 
    
    hideControlsOnStart() {
        // Get the controls panel for this UI instance
        const controlsId = `${this.prefix}controls`;
        const controlsPanel = document.getElementById(controlsId);
        
        if (controlsPanel) {
            console.log(`Hiding controls panel: ${controlsId}`);
            controlsPanel.style.display = 'none';
        }
    }

    updateControlState(state) {
        this.startPauseResumeButton.dataset.state = state; // Store state on button
        this.hideEndOfDaySummary(); // Hide summary by default

        // Define SimState locally if not imported
        const localSimState = { IDLE: 'idle', WORKING: 'working', PAUSED: 'paused', END_OF_DAY: 'end_of_day' }; 

        switch (state) {
            case localSimState.IDLE:
                this.startPauseResumeButton.textContent = 'Start Day';
                this.startPauseResumeButton.disabled = false;
                this.nextDayButton.style.display = 'none'; // Hide next day button
                this.speedSlider.disabled = false; // Allow setting speed before start
                break;
            case localSimState.WORKING:
                this.startPauseResumeButton.textContent = 'Pause';
                this.startPauseResumeButton.disabled = false;
                this.nextDayButton.style.display = 'none';
                this.speedSlider.disabled = false; // Allow speed changes while working
                // Hide controls panel when the day starts
                this.hideControlsOnStart();
                break;
            case localSimState.PAUSED:
                this.startPauseResumeButton.textContent = 'Resume';
                this.startPauseResumeButton.disabled = false;
                this.nextDayButton.style.display = 'none';
                this.speedSlider.disabled = true; // Don't change speed while paused
                break;
            case localSimState.END_OF_DAY:
                this.startPauseResumeButton.textContent = 'Day Ended';
                this.startPauseResumeButton.disabled = true; // Can't pause/resume
                this.nextDayButton.textContent = 'Start Next Day';
                this.nextDayButton.style.display = 'inline-block'; // Show next day button
                this.nextDayButton.disabled = false;
                this.speedSlider.disabled = true; // Can't change speed after day ends
                if (this.timeElapsedDisplay) this.timeElapsedDisplay.style.color = '#F44336'; // Keep time red
                break;
            default:
                 console.warn("Unknown simulation state received:", state);
        }
    }

    // --- Task Inspector --- 
    showTaskInspector(taskDetails) {
       // ... (previous implementation seems okay, ensures Packed At is handled)
       if (!taskDetails) return;

       // Create HTML content more dynamically
       this.taskDetails.innerHTML = ''; // Clear previous details
       const detailMap = {
           'Task ID': taskDetails.id,
           'Status': taskDetails.status,
           'Progress': taskDetails.progress,
           'Elapsed Time': taskDetails.elapsedTime,
           'Wrapped At': taskDetails.wrappedTime,
           'Packed At': taskDetails.packedTime, // Use the correct key from getTaskDetails
           'Missed At': taskDetails.missedTime,
           'Belt Speed (at creation)': taskDetails.speed // Clarify speed
       };

       for (const [label, value] of Object.entries(detailMap)) {
           const row = document.createElement('div');
           row.className = 'detail-row';
           const labelSpan = document.createElement('span');
           labelSpan.textContent = `${label}:`;
           const valueSpan = document.createElement('span');
            valueSpan.textContent = value !== null ? value : 'N/A'; // Handle null values
            row.appendChild(labelSpan);
            row.appendChild(valueSpan);
            this.taskDetails.appendChild(row);
       }

       this.taskInspector.classList.remove('hidden');

       // Apply status-specific styling (include Packed)
       if (taskDetails.status === 'Packed') {
            this.taskInspector.style.borderColor = '#00BCD4'; // Cyan for Packed
       } else if (taskDetails.status === 'Wrapped (Awaiting Packing)') {
            this.taskInspector.style.borderColor = '#4CAF50'; // Green for Wrapped
       } else if (taskDetails.status === 'Missed') {
           this.taskInspector.style.borderColor = '#F44336'; // Red for Missed
       } else { // In Progress
           this.taskInspector.style.borderColor = '#3F51B5'; // Blue for In Progress
       }
   }

    hideTaskInspector() {
        this.taskInspector.classList.add('hidden');
    }

    // --- Reset --- 
    resetUI() {
         // Reset stats display (use updateStats for consistency)
          this.updateStats('reset'); // Pass no specific stats, just reset display

         // Reset day/time display
         this.updateDayDisplay(1); // Reset to day 1
         this.updateTimeDisplay(8 * 3600); // Reset to 8:00 AM
          if(this.timeElapsedDisplay) this.timeElapsedDisplay.style.color = ''; // Reset color

         // Reset buttons to initial state
         this.updateControlState('idle'); // Use string directly if SimState not imported

         // Hide inspector & summary
         this.hideTaskInspector();
         this.hideEndOfDaySummary();

         // Reset speed slider display? (Handled by main.js setting initial speed)
    }

    // Add toggle controls buttons
    addToggleControlsButtons() {
        const prefix = this.prefix;
        const controlsId = `${prefix}controls`;
        const controlsPanel = document.getElementById(controlsId);
        
        if (!controlsPanel) {
            console.warn(`Controls panel not found: ${controlsId}`);
            return;
        }
        
        // Start the panel hidden
        controlsPanel.style.display = 'none';
        
        // Ensure the panel has absolute positioning for proper placement
        controlsPanel.style.position = 'absolute';
        controlsPanel.style.zIndex = '10';
        controlsPanel.style.left = prefix.includes('expectation') ? '15px' : 'auto';
        controlsPanel.style.right = prefix.includes('expectation') ? 'auto' : '15px';
        controlsPanel.style.top = '65px'; // Below the toggle button
        
        // Get the container ID
        const containerId = prefix.includes('expectation') ? 'expectation-container' : 'reality-container';
        const container = document.getElementById(containerId);
        
        if (!container) {
            console.warn(`Container not found: ${containerId}`);
            return;
        }
        
        // Create the toggle button with clear text
        const toggleButton = document.createElement('button');
        toggleButton.className = `toggle-controls-button ${prefix.includes('expectation') ? 'left' : 'right'}`;
        toggleButton.innerHTML = '<span>⚙️</span>'; // Gear icon for settings
        toggleButton.setAttribute('title', 'Show Controls'); // Use title for better browser tooltip
        toggleButton.style.display = 'block'; // Ensure it's visible
        
        // Add to the container
        container.appendChild(toggleButton);
        
        // Store for reference
        this.toggleControlsButton = toggleButton;
        
        // Log for debugging
        console.log(`Added toggle button to ${containerId}`);
        
        // Handle toggle click
        toggleButton.addEventListener('click', () => {
            const isVisible = controlsPanel.style.display !== 'none';
            if (isVisible) {
                // Hide panel
                controlsPanel.style.display = 'none';
                toggleButton.innerHTML = '<span>⚙️</span>';
                toggleButton.setAttribute('title', 'Show Controls');
            } else {
                // Show panel
                controlsPanel.style.display = 'block';
                toggleButton.innerHTML = '<span>✕</span>';
                toggleButton.setAttribute('title', 'Hide Controls');
            }
        });
        
        // Add hide button directly to controls panel header
        const hideButton = document.createElement('button');
        hideButton.className = 'hide-controls-button';
        hideButton.innerHTML = '✕';
        hideButton.style.marginLeft = 'auto';
        hideButton.style.background = 'none';
        hideButton.style.border = 'none';
        hideButton.style.color = 'var(--secondary-color)';
        hideButton.style.fontSize = '1.2rem';
        hideButton.style.cursor = 'pointer';
        hideButton.setAttribute('title', 'Hide Controls');
        
        // Find or create the header
        let header = controlsPanel.querySelector('.controls-header');
        if (!header) {
            header = document.createElement('div');
            header.className = 'controls-header';
            
            const title = document.createElement('h2');
            title.textContent = prefix.includes('expectation') ? 'Expectation Controls' : 'Reality Controls';
            header.appendChild(title);
            
            // Add the header to the top of the panel
            controlsPanel.insertBefore(header, controlsPanel.firstChild);
        }
        
        // Append the hide button to the header
        header.appendChild(hideButton);
        
        // Handle hide button click (to hide panel and show toggle button)
        hideButton.addEventListener('click', () => {
            controlsPanel.style.display = 'none';
            toggleButton.style.display = 'block';
            toggleButton.innerHTML = '<span>⚙️</span>';
            toggleButton.setAttribute('title', 'Show Controls');
        });
        
        // Add supervisor intervention button in the controls panel
        this.addSupervisorInterventionButton(controlsPanel);
    }

    addSupervisorInterventionButton(controlsPanel) {
        // Check if there's already a supervisor section
        const existingSection = controlsPanel.querySelector('.supervisor-controls');
        if (existingSection) {
            console.log("Supervisor controls already added");
            return;
        }
        
        // Create the intervention button
        const interventionButton = document.createElement('button');
        interventionButton.className = 'controls-button supervisor-intervention';
        interventionButton.textContent = 'Supervisor';
        interventionButton.setAttribute('title', 'Have supervisor clean up spills');
        
        // Find the start button and insert the intervention button next to it
        const startButton = controlsPanel.querySelector('.controls-button.start-button');
        if (startButton) {
            startButton.insertAdjacentElement('afterend', interventionButton);
        } else {
            controlsPanel.appendChild(interventionButton); // Fallback if start button not found
        }

        // Handle click - will need to connect to task manager
        interventionButton.addEventListener('click', () => {
            if (this.callbacks && typeof this.callbacks.onSupervisorIntervention === 'function') {
                this.callbacks.onSupervisorIntervention();
            }
        });
    }

    // Add a new method for creating and positioning the standalone buttons
    addShowControlsButtons() {
        // Check if we already added the button to prevent duplicates
        if (this.showControlsButton) {
            console.log(`Show controls button already exists for ${this.prefix}`);
            return;
        }

        const prefix = this.prefix;
        const controlsId = `${prefix}controls`;
        const controlsPanel = document.getElementById(controlsId);
        
        if (!controlsPanel) {
            console.warn(`Controls panel not found: ${controlsId}`);
            return;
        }
        
        // Start with the panel hidden
        controlsPanel.style.display = 'none';
        
        // Find the container ID
        const containerId = prefix.includes('expectation') ? 'expectation-container' : 'reality-container';
        const container = document.getElementById(containerId);
        
        if (!container) {
            console.warn(`Container not found: ${containerId}`);
            return;
        }
        
        // Check if a show controls button already exists
        const existingButton = container.querySelector('.show-controls-button');
        if (existingButton) {
            console.log(`Using existing show controls button for ${containerId}`);
            this.showControlsButton = existingButton;
            return;
        }
        
        // Create the show controls button
        const showButton = document.createElement('button');
        // Position all buttons on the left side
        showButton.className = `show-controls-button left`;
        showButton.innerHTML = '⚙️'; // Gear icon for settings
        showButton.title = 'Show Controls';
        
        // Add the button to the container
        container.appendChild(showButton);
        
        // Store reference
        this.showControlsButton = showButton;
        
        console.log(`Added show controls button to ${containerId}`);
        
        // Add click handler to show the controls panel
        showButton.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent default button behavior
            e.stopPropagation(); // Stop event propagation
            
            // Show the controls panel and place it
            controlsPanel.style.display = 'block';
            controlsPanel.style.position = 'absolute';
            controlsPanel.style.zIndex = '25';
            
            // Ensure controls are fully visible with appropriate overflow
            controlsPanel.style.overflowY = 'auto';
            controlsPanel.style.maxHeight = '70vh';
            
            // Always position on the left side for both windows
            controlsPanel.style.left = '10px';
            controlsPanel.style.top = '50px';
            controlsPanel.style.right = 'auto';
            
            // Ensure text is fully visible inside control panel
            const labels = controlsPanel.querySelectorAll('label');
            labels.forEach(label => {
                label.style.whiteSpace = 'normal';
                label.style.overflow = 'visible';
                label.style.textOverflow = 'clip';
            });
            
            // Keep the button visible even when panel is shown
            showButton.style.display = 'block';
        });
        
        // Add hide button to the controls panel header
        let header = controlsPanel.querySelector('.controls-header');
        
        if (header) {
            // Get existing minimize button if present
            const existingButton = header.querySelector('.controls-action');
            if (existingButton) {
                // Safer approach: modify the existing button instead of replacing it
                existingButton.title = 'Hide Controls';
                existingButton.textContent = '×';
                
                // Remove existing event listeners by setting onclick to null
                existingButton.onclick = null;
                
                // Add new click listener
                existingButton.addEventListener('click', (e) => {
                    e.preventDefault(); // Prevent default button behavior
                    e.stopPropagation(); // Stop event propagation
                    controlsPanel.style.display = 'none';
                });
            } else {
                // Create a new hide button
                const hideButton = document.createElement('button');
                hideButton.className = 'controls-action';
                hideButton.title = 'Hide Controls';
                hideButton.textContent = '×';
                hideButton.addEventListener('click', (e) => {
                    e.preventDefault(); // Prevent default button behavior
                    e.stopPropagation(); // Stop event propagation
                    controlsPanel.style.display = 'none';
                });
                header.appendChild(hideButton);
            }
        }
        
        // Add supervisor intervention button to the controls
        this.addSupervisorInterventionButton(controlsPanel);

        // Add reset button to the controls panel
        this.addResetButton(controlsPanel);

        // Ensure buttons are added to both windows
        this.ensureControlButtonsExist();
    }

    // Make sure "Show Controls" buttons exist for both windows
    ensureControlButtonsExist() {
        // For the current window (default)
        if (!this.showControlsButton) {
            this.addShowControlsButtons();
        }
        
        // For the other window (check if we're expectation or reality)
        const otherPrefix = this.prefix.includes('expectation') ? 'reality-' : 'expectation-';
        const otherId = `${otherPrefix}controls`;
        const otherPanel = document.getElementById(otherId);
        
        if (otherPanel) {
            // Find the container for the other window
            const otherContainerId = this.prefix.includes('expectation') ? 'reality-container' : 'expectation-container';
            const otherContainer = document.getElementById(otherContainerId);
            
            if (otherContainer) {
                // Check if there's already a button
                const existingButton = otherContainer.querySelector('.show-controls-button');
                if (!existingButton) {
                    console.log(`Adding missing control button for ${otherContainerId}`);
                    
                    // Create the button for the other window - BOTH windows should have left-side buttons
                    const otherButton = document.createElement('button');
                    otherButton.className = `show-controls-button left`; // Always position on left
                    otherButton.innerHTML = '⚙️';
                    otherButton.title = 'Show Controls';
                    
                    // Add the button to the container
                    otherContainer.appendChild(otherButton);
                    
                    // Add click handler
                    otherButton.addEventListener('click', () => {
                        // Show and position the controls panel
                        otherPanel.style.display = 'block';
                        otherPanel.style.position = 'absolute';
                        otherPanel.style.zIndex = '25';
                        otherPanel.style.overflowY = 'auto';
                        otherPanel.style.maxHeight = '70vh';
                        
                        // Both windows should have controls on the left
                        otherPanel.style.left = '10px';
                        otherPanel.style.top = '50px';
                        otherPanel.style.right = 'auto';
                    });
                    
                    // Add hide functionality to the close button
                    const otherHeader = otherPanel.querySelector('.controls-header');
                    if (otherHeader) {
                        const closeButton = otherHeader.querySelector('.controls-action');
                        if (closeButton) {
                            closeButton.onclick = null;
                            closeButton.addEventListener('click', () => {
                                otherPanel.style.display = 'none';
                                otherButton.style.display = 'block';
                            });
                        }
                    }

                    // Add supervisor intervention button in the controls panel
                    this.addSupervisorInterventionButton(otherPanel);

                    // Add reset button to the controls panel
                    this.addResetButton(otherPanel);
                }
            }
        }
    }

    // Add a reset button to each control window
    addResetButton(controlsPanel) {
        const resetButton = document.createElement('button');
        resetButton.className = 'controls-button reset-button';
        resetButton.textContent = 'Reset';
        resetButton.setAttribute('title', 'Reset Simulation');
        
        // Find the start button and insert the reset button next to it
        const startButton = controlsPanel.querySelector('.controls-button.start-button');
        if (startButton) {
            startButton.insertAdjacentElement('afterend', resetButton);
        } else {
            controlsPanel.appendChild(resetButton); // Fallback if start button not found
        }

        // Handle reset button click with preventDefault
        resetButton.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent default button behavior
            e.stopPropagation(); // Stop event propagation
            
            if (this.callbacks && typeof this.callbacks.onReset === 'function') {
                this.callbacks.onReset();
            }
        });
    }
}

// Note: SimState constant needs to be accessible here, either via import from main.js,
// defining it globally, or defining it locally within methods that need it (like updateControlState). 
// Using local definition for now to avoid import issues without module setup. 

// Update button styles for better visibility
const buttonStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.8)', // Lightly opaque white background
    color: '#333', // Dark text color
    border: '1px solid #ccc', // Light border
    borderRadius: '4px', // Rounded corners
    padding: '5px 10px', // Padding for better click area
    cursor: 'pointer', // Pointer cursor on hover
    margin: '5px' // Margin between buttons
};

// Apply styles to buttons
const buttons = document.querySelectorAll('.controls-button');
buttons.forEach(button => {
    Object.assign(button.style, buttonStyle);
});

// Update control panel styles for better visibility
const controlPanels = document.querySelectorAll('.controls-panel');
controlPanels.forEach(panel => {
    panel.style.backgroundColor = 'rgba(255, 255, 255, 0.8)'; // Lightly opaque white background
    panel.style.color = '#333'; // Dark text color
}); 