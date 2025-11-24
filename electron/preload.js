const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Folder picker
    selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),

    // App info
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getPath: (name) => ipcRenderer.invoke('app:getPath', name),
    isElectron: () => ipcRenderer.invoke('app:isElectron'),

    // Installation
    installGame: (zipUrl, installPath, gameFolderName, gameId, gameName) =>
        ipcRenderer.invoke('installation:start', { zipUrl, installPath, gameFolderName, gameId, gameName }),
    getInstallStatus: (gameId) => ipcRenderer.invoke('installation:getStatus', gameId),
    cancelInstall: (gameId) => ipcRenderer.invoke('installation:cancel', gameId),

    // Installation events
    onInstallProgress: (callback) => ipcRenderer.on('installation:progress', (_event, value) => callback(value)),
    onInstallComplete: (callback) => ipcRenderer.on('installation:complete', (_event, value) => callback(value)),
    onInstallError: (callback) => ipcRenderer.on('installation:error', (_event, value) => callback(value)),
    onInstallError: (callback) => ipcRenderer.on('installation:error', (_event, value) => callback(value)),
    checkGameInstalled: (installPath, gameFolderName) => ipcRenderer.invoke('installation:check', { installPath, gameFolderName }),
    uninstallGame: (installPath, gameFolderName) => ipcRenderer.invoke('installation:uninstall', { installPath, gameFolderName }),

    // Platform info
    platform: process.platform,

    // Environment
    isDevelopment: process.env.NODE_ENV === 'development'
});
