const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    selectFolder: () => ipcRenderer.invoke('dialog:openDirectory'),
    isElectron: () => Promise.resolve(true),

    // Installation
    installGame: (downloadUrl, installPath, folderName, gameId, gameName, version, manifest) =>
        ipcRenderer.invoke('game:install', downloadUrl, installPath, folderName, gameId, gameName, version, manifest),

    checkGameInstalled: (installPath, folderName) =>
        ipcRenderer.invoke('game:checkInstalled', installPath, folderName),

    uninstallGame: (installPath, folderName) =>
        ipcRenderer.invoke('game:uninstall', installPath, folderName),

    onInstallProgress: (callback) => ipcRenderer.on('install:progress', (event, data) => callback(data)),
    onInstallComplete: (callback) => ipcRenderer.on('install:complete', (event, data) => callback(data)),
    onInstallError: (callback) => ipcRenderer.on('install:error', (event, data) => callback(data)),

    // Launcher
    launchGame: (installPath, folderName, userData) =>
        ipcRenderer.invoke('game:launch', { installPath, folderName, userData }),

    onGameStatus: (callback) => ipcRenderer.on('game:status', (event, data) => callback(data))
});
