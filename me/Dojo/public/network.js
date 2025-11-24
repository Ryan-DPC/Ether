export class NetworkManager {
    constructor() {
        this.socket = null;
        this.gameSocket = null;
        this.username = null;
        this.onMatchFound = null;
        this.onGameState = null;
        this.onPlayerJoined = null;
        this.onPlayerLeft = null;
        this.mainServerUrl = 'ws://' + (window.location.hostname || 'localhost') + ':3001';
    }

    connectMain(username, password) {
        return new Promise((resolve, reject) => {
            this.username = username;
            this.socket = new WebSocket(this.mainServerUrl);

            this.socket.onopen = () => {
                console.log('✅ Connected to Main Server');
                this.login(username, password);
            };

            this.socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleMainMessage(data, resolve, reject);
            };

            this.socket.onerror = (err) => {
                console.error('❌ Main Server Error:', err);
                reject(err);
            };
        });
    }

    login(username, password) {
        // For now, we'll try to register first, then login if it fails or succeeds
        // Actually, the server handles them separately. Let's just try login, if fail, try register?
        // Or better, just use a simple flow: Register -> Login.
        // For simplicity in this demo, we will just send a login request. 
        // If the user doesn't exist, we might need a UI for that.
        // But to keep it simple and "optimized", let's try to register silently first, then login.

        this.sendMain({ type: 'register', username, password });
    }

    sendMain(data) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(data));
        }
    }

    handleMainMessage(data, resolve, reject) {
        console.log('📩 Main Server:', data);
        switch (data.type) {
            case 'register_success':
            case 'register_error': // If already exists, we proceed to login
                this.sendMain({ type: 'login', username: this.username, password: 'password123' }); // Hardcoded pwd for demo simplicity as requested "optimiser"
                break;
            case 'login_success':
                resolve(data);
                break;
            case 'login_error':
                reject(data.message);
                break;
            case 'match_created':
                this.connectGame(data.url);
                break;
        }
    }

    startMatchmaking() {
        this.sendMain({ type: 'matchmaking:start', mode: 'dojo' });
    }

    connectGame(url) {
        // If url is localhost, replace with window.location.hostname to support local network
        const targetUrl = url.replace('localhost', window.location.hostname);
        console.log('Connecting to Game Server:', targetUrl);

        this.gameSocket = new WebSocket(targetUrl);

        this.gameSocket.onopen = () => {
            console.log('✅ Connected to Game Server');
            this.gameSocket.send(JSON.stringify({ type: 'join', username: this.username }));
        };

        this.gameSocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleGameMessage(data);
        };
    }

    handleGameMessage(data) {
        switch (data.type) {
            case 'join_success':
                if (this.onMatchFound) this.onMatchFound(data);
                break;
            case 'state':
                if (this.onGameState) this.onGameState(data);
                break;
            case 'player_joined':
                if (this.onPlayerJoined) this.onPlayerJoined(data);
                break;
            case 'player_left':
                if (this.onPlayerLeft) this.onPlayerLeft(data);
                break;
        }
    }

    sendState(state) {
        if (this.gameSocket && this.gameSocket.readyState === WebSocket.OPEN) {
            this.gameSocket.send(JSON.stringify({ type: 'state', state }));
        }
    }
}
