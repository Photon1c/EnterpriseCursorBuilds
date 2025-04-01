# 🍫 I Love Lucy-Inspired Workflow Visualizer

![ILL](src/assets/media/live-demo.gif)

An interactive 3D visualization inspired by the classic "I Love Lucy" chocolate factory scene, demonstrating workplace expectations vs. reality through parallel simulations.

## ✨ Features

- 🎮 Twin interactive 3D visualizations showing "Expectation" vs "Reality" scenarios
- 🏭 Realistic factory environment with conveyor belt mechanics
- 👥 Character avatars (Lucy, Ethel, Supervisor, Packer) with dynamic behaviors
- 📊 Real-time performance statistics and end-of-day summaries
- 🕹️ Adjustable parameters to experiment with different workflow conditions
- 💥 Chocolate spill animations and supervisor interventions
- 📦 Visual chocolate packaging and trash pile accumulation
- ✅ Boxed chocolates (5 chocolates make 1 box) with visual feedback
- 📄 Interactive instructions modal (press "i" key)
- 🔄 Reset functionality for starting over
- 🎭 Distress and cheering animations based on efficiency levels
- 📆 Multi-day simulation capabilities with progress tracking

## 🚀 Getting Started

1. Clone this repository
2. Open `visualizer/index.html` in your browser 
3. No build process required - it runs directly in modern browsers!
4. Press the "i" key for detailed instructions

## 🧩 Usage Tips

### 🔧 Controls & Parameters

- **⚙️ Button:** Show/hide control panel in each window
- **Start Day:** Begin the simulation
- **Pause/Resume:** Control the simulation flow
- **Speed Slider:** Controls how many chocolates per hour arrive on the conveyor belt (higher values = more chaos!)
- **Wrap Time:** How many seconds it takes workers to process each chocolate
- **Packer Speed:** How quickly the end-of-line worker can box the wrapped chocolates
- **Supervisor Button:** Call for help when there are too many spills
- **Reset Button:** Start over from day 1

### 💡 Best Practices

- **Start with lower rates:** Begin with 15-20 chocolates/hour to observe normal operations
- **Find the tipping point:** Gradually increase until you see the system break down
- **Observe worker behavior:** Watch how characters become frantic at high speeds
- **Compare scenarios:** Notice how different parameter combinations affect outcomes
- **Monitor spills:** Too many spilled chocolates trigger supervisor interventions
- **Watch for animations:** Workers show distress below 35% efficiency and cheer above 90%
- **See visual feedback:** Wrapped chocolates form boxes, missed chocolates create a trash pile
- **Click on chocolates:** Inspect individual tasks for detailed information
- **Complete multiple days:** See how efficiency changes over time

### 🎯 Learning Objectives

This visualization demonstrates several important workplace concepts:
- The gap between planned processes and real-world execution
- How small changes in parameters can lead to system breakdown
- The importance of realistic expectations and adequate resources
- Supervisor responsiveness and its impact on workflow
- Metrics for measuring workplace efficiency and productivity
- Visual representation of success (boxes) and failures (trash pile)

## 🛠️ Technical Details

Built using:
- Three.js for 3D visualization
- Vanilla JavaScript for logic and interactions
- CSS for UI styling and animations
- Particle effects for visual feedback

## 📝 Implementation Notes

The visualization uses a time-scaled simulation where:
- Each workday runs from 8:00 AM to 5:00 PM (with a 7-hour work limit)
- 1 second of real time = approximately 1 minute of simulation time
- Worker fatigue and experience factors are modeled over multiple days
- Spill mechanics include physical simulation and cleanup logic
- Chocolate packaging creates visual boxes after every 5 chocolates
- Missed chocolates accumulate in a trash pile
- Workers display animated reactions based on efficiency levels

## 🎬 Inspiration

This visualization is inspired by the famous chocolate factory scene from the 1952 "I Love Lucy" episode "Job Switching," which humorously demonstrated the challenges of assembly line work and the gap between expectations and reality.

## 🙏 Acknowledgements

- Three.js community for the excellent 3D web library
- The timeless comedy of Lucille Ball for the inspiration
- Cursor, GPT-4o, Claude, and Gemini working in sync together to process hundreds of conversations (orchestrated by user)

## 🎯 Features

- **Dynamic Conveyor Belt**: Tasks flow along a 3D conveyor belt with realistic movement and physics.
- **Interactive Chocolates**: Click on chocolates to wrap them and view task details.
- **Avatar Workers**: Lucy and Ethel attempt to wrap chocolates with animated arms.
- **AI/ML Simulation**: Workers learn and improve over time, but get tired with increased workload.
- **Speed Controls**: Adjust the task flow rate to see how the system handles different loads.
- **Performance Statistics**: Track wrapped vs. missed tasks and overall efficiency.

## 🎮 How to Use

- Click the **Start** button to begin the simulation
- Use the **Speed** slider to adjust how quickly tasks appear on the conveyor
- Click on any chocolate to manually wrap it and see its details
- Watch as Lucy and Ethel automatically attempt to wrap chocolates
- Click **Pause** to stop the simulation

## 🧠 Learning and Fatigue Simulation

The visualizer includes a simple AI/ML simulation where:

- Workers gain experience over time, improving their wrapping success rate
- Workers accumulate fatigue when the speed is too high, decreasing performance
- Thought bubbles appear when workers are learning
- Visual indicators show fatigue through posture changes
- Performance metrics adjust based on both learning and fatigue

## 🏗️ Project Structure

```
/visualizer/
├── index.html       # Main HTML file with UI structure
├── styles.css       # CSS styling with retro factory aesthetic
├── README.md        # Documentation
└── /src/            # JavaScript modules
    ├── main.js      # Entry point, sets up Three.js scene
    ├── conveyor.js  # Conveyor belt mechanics
    ├── avatars.js   # Character controls and animations
    ├── tasks.js     # Task/chocolate logic and packaging
    ├── ui.js        # User interface controls
    └── utils.js     # Utility functions for UI management
```

## 🔨 Technologies Used

- **Three.js**: 3D rendering engine
- **JavaScript (ES6+)**: Core programming language
- **HTML5/CSS3**: Structure and styling

## 🎬 Inspiration

This project draws inspiration from the classic "I Love Lucy" episode "Job Switching" (Season 2, Episode 1, 1952), featuring the iconic chocolate factory scene where Lucy and Ethel struggle to keep up with an increasingly fast conveyor belt of chocolates.

## 📜 License

MIT License - Feel free to use and modify for your own projects! 
