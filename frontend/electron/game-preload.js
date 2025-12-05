const { contextBridge } = require('electron');

// This preload is injected into game windows
// It provides access to user authentication data
contextBridge.exposeInMainWorld('etherAPI', {
    // User data will be injected by the launcher
    user: null,
    token: null,

    // Initialize with user data (called by launcher)
    init: (userData, authToken) => {
        window.etherAPI.user = userData;
        window.etherAPI.token = authToken;
    }
});
