// Agent Earth - AI Interface Module

class EarthAgent {
    constructor(scene, camera, controls) {
        this.scene = scene;
        this.camera = camera;
        this.controls = controls;
        this.isProcessing = false;
        this.commandHistory = [];
        this.currentLocation = { lat: 0, lon: 0, alt: 0 };
        this.markers = new Map();
        
        // Initialize UI
        this.initializeUI();
    }

    initializeUI() {
        // Create chat container
        const chatContainer = document.createElement('div');
        chatContainer.id = 'agent-chat';
        chatContainer.style.cssText = `
            position: fixed;
            right: 20px;
            bottom: 20px;
            width: 300px;
            height: 400px;
            background: rgba(0, 0, 0, 0.8);
            border: 1px solid #00ff00;
            border-radius: 5px;
            color: #00ff00;
            font-family: monospace;
            display: flex;
            flex-direction: column;
            padding: 10px;
            z-index: 1000;
        `;

        // Create chat messages area
        const messagesArea = document.createElement('div');
        messagesArea.id = 'agent-messages';
        messagesArea.style.cssText = `
            flex-grow: 1;
            overflow-y: auto;
            margin-bottom: 10px;
            padding: 10px;
            border-bottom: 1px solid #00ff00;
        `;

        // Create input area
        const inputContainer = document.createElement('div');
        inputContainer.style.cssText = `
            display: flex;
            gap: 10px;
        `;

        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'agent-input';
        input.placeholder = 'Ask me about Earth...';
        input.style.cssText = `
            flex-grow: 1;
            background: rgba(0, 0, 0, 0.5);
            border: 1px solid #00ff00;
            color: #00ff00;
            padding: 5px;
            font-family: monospace;
        `;

        const sendButton = document.createElement('button');
        sendButton.textContent = 'Send';
        sendButton.style.cssText = `
            background: #00ff00;
            color: black;
            border: none;
            padding: 5px 10px;
            cursor: pointer;
            font-family: monospace;
        `;

        // Assemble UI
        inputContainer.appendChild(input);
        inputContainer.appendChild(sendButton);
        chatContainer.appendChild(messagesArea);
        chatContainer.appendChild(inputContainer);
        document.body.appendChild(chatContainer);

        // Event listeners
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleUserInput(input.value);
                input.value = '';
            }
        });

        sendButton.addEventListener('click', () => {
            this.handleUserInput(input.value);
            input.value = '';
        });

        // Add initial message
        this.addMessage('Agent', 'Hello! I can help you explore Earth. Try asking me about locations or navigation.');
    }

    async handleUserInput(input) {
        if (this.isProcessing || !input.trim()) return;
        
        this.isProcessing = true;
        this.addMessage('User', input);
        
        try {
            // TODO: Replace with actual API call when documentation is available
            await this.mockAgentResponse(input);
        } catch (error) {
            console.error('Error processing request:', error);
            this.addMessage('Agent', 'Sorry, I encountered an error processing your request.');
        } finally {
            this.isProcessing = false;
        }
    }

    // Temporary mock response function - will be replaced with actual API integration
    async mockAgentResponse(input) {
        const lowercaseInput = input.toLowerCase();
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay

        if (lowercaseInput.includes('location')) {
            const coords = this.getCurrentCoordinates();
            this.addMessage('Agent', `Current location: ${coords.lat}°N, ${coords.lon}°E, Altitude: ${coords.alt}km`);
        } else if (lowercaseInput.includes('help')) {
            this.addMessage('Agent', 'I can help you with:\n- Finding locations\n- Navigation\n- Earth information\n- Setting waypoints');
        } else if (lowercaseInput.includes('navigate')) {
            this.addMessage('Agent', 'I can help navigate to specific coordinates or landmarks. Where would you like to go?');
        } else {
            this.addMessage('Agent', 'I understand you want to know about "' + input + '". Once I have API access, I can provide more detailed information.');
        }
    }

    addMessage(sender, text) {
        const messagesArea = document.getElementById('agent-messages');
        const messageElement = document.createElement('div');
        messageElement.style.cssText = `
            margin-bottom: 10px;
            ${sender === 'User' ? 'text-align: right;' : ''}
        `;
        
        const timestamp = new Date().toLocaleTimeString();
        messageElement.innerHTML = `
            <span style="color: ${sender === 'User' ? '#00ff00' : '#00ffff'}">
                ${sender} (${timestamp}):
            </span><br>
            <span style="color: #00ff00">${text}</span>
        `;
        
        messagesArea.appendChild(messageElement);
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }

    getCurrentCoordinates() {
        // TODO: Implement actual coordinate calculation based on camera position
        return {
            lat: parseFloat((Math.random() * 180 - 90).toFixed(2)),
            lon: parseFloat((Math.random() * 360 - 180).toFixed(2)),
            alt: parseFloat((Math.random() * 1000).toFixed(2))
        };
    }

    // Navigation methods - to be implemented
    async navigateToCoordinates(lat, lon, alt) {
        // TODO: Implement smooth camera movement to coordinates
    }

    async addMarker(lat, lon, label) {
        // TODO: Implement marker creation on the globe
    }

    async removeMarker(id) {
        // TODO: Implement marker removal
    }

    // Future methods to be implemented with API integration
    async analyzeLocation(lat, lon) {
        // TODO: Implement location analysis using external APIs
    }

    async getWeatherData(lat, lon) {
        // TODO: Implement weather data fetching
    }

    async planRoute(startCoords, endCoords) {
        // TODO: Implement route planning
    }
}

export default EarthAgent; 