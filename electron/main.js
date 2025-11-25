const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

// Keep a global reference of the window object
let mainWindow;

function createWindow() {
    // Create the browser window
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 1024,
        minHeight: 600,
        frame: true,
        backgroundColor: '#1a1a1a',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: true
        },
        icon: path.join(__dirname, '../frontend/public/logo.png')
    });

    // Load the app
    const isDev = !app.isPackaged;

    if (isDev) {
        // Development mode - load from Vite dev server
        console.log('🔧 Development mode - Loading from http://localhost:5173');
        mainWindow.loadURL('http://localhost:5173')
            .catch(err => {
                console.error('❌ Failed to load dev server:', err);
                console.log('💡 Make sure frontend dev server is running: npm run dev --prefix frontend');
            });
        mainWindow.webContents.openDevTools();
    } else {
        // Production mode - load from built files
        const indexPath = path.join(__dirname, '../frontend/dist/index.html');
        console.log('📦 Production mode - Loading from:', indexPath);
        mainWindow.loadFile(indexPath);
    }

    // Emitted when the window is closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        // On macOS it's common to re-create a window when dock icon is clicked
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
    // On macOS, stay active until user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// IPC Handlers

// Handle folder selection dialog
ipcMain.handle('dialog:selectFolder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory', 'createDirectory'],
        title: 'Select Installation Folder',
        buttonLabel: 'Select Folder'
    });

    if (result.canceled) {
        return null;
    }

    // Return the selected folder path
    return result.filePaths[0];
});

// Get app version
ipcMain.handle('app:getVersion', () => {
    return app.getVersion();
});

// Get app path
ipcMain.handle('app:getPath', (event, name) => {
    return app.getPath(name);
});

// Check if running in Electron
ipcMain.handle('app:isElectron', () => {
    return true;
});

// ========================================
// Installation IPC Handlers
// ========================================
const installationService = require('./services/installation.service');
const activeInstallations = new Map(); // Track active installations

// Start game installation
ipcMain.handle('installation:start', async (event, { zipUrl, installPath, gameFolderName, gameId, gameName }) => {
    try {
        console.log('[IPC] Starting installation for ' + gameName);

        // Check if already installing
        if (activeInstallations.has(gameId)) {
            throw new Error('Installation already in progress for this game');
        }

        // Mark as installing
        activeInstallations.set(gameId, { status: 'installing', gameName });

        // Progress callback
        const onProgress = (progressData) => {
            // Send progress to renderer
            mainWindow.webContents.send('installation:progress', {
                gameId,
                gameName,
                ...progressData
            });
        };

        // Start installation (async)
        installationService
            .installGame(zipUrl, installPath, gameFolderName, onProgress)
            .then((result) => {
                activeInstallations.delete(gameId);
                mainWindow.webContents.send('installation:complete', {
                    gameId,
                    gameName,
                    path: result.path
                });
                console.log('[IPC] Installation complete for ' + gameName);
            })
            .catch((error) => {
                activeInstallations.delete(gameId);
                mainWindow.webContents.send('installation:error', {
                    gameId,
                    gameName,
                    error: error.message
                });
                console.error('[IPC] Installation failed for ' + gameName + ': ', error);
            });

        // Return immediately
        return { success: true, message: 'Installation started' };
    } catch (error) {
        console.error('[IPC] Failed to start installation:', error);
        throw error;
    }
});

// Get installation status
ipcMain.handle('installation:getStatus', (event, gameId) => {
    return activeInstallations.get(gameId) || { status: 'idle' };
});

// Cancel installation (TODO: implement cancel functionality)
ipcMain.handle('installation:cancel', (event, gameId) => {
    if (activeInstallations.has(gameId)) {
        activeInstallations.delete(gameId);
        return { success: true };
    }
    return { success: false, error: 'No active installation' };

});

// Check if game is installed
ipcMain.handle('installation:check', async (event, { installPath, gameFolderName }) => {
    return await installationService.isGameInstalled(installPath, gameFolderName);
});

// Uninstall game
ipcMain.handle('installation:uninstall', async (event, { installPath, gameFolderName }) => {
    return await installationService.uninstallGame(installPath, gameFolderName);
});

// ========================================
// Game Launcher IPC Handlers
// ========================================
const launcherService = require('./services/launcher.service');

// Launch a game
ipcMain.handle('game:launch', async (event, { installPath, gameFolderName }) => {
    try {
        console.log('[IPC] Launching game:', gameFolderName);
        const result = await launcherService.launchGame(installPath, gameFolderName);
        return result;
    } catch (error) {
        console.error('[IPC] Failed to launch game:', error);
        throw error;
    }
});

// Get active games
ipcMain.handle('game:getActive', () => {
    return launcherService.getActiveGames();
});

// Close a running game
ipcMain.handle('game:close', (event, gameId) => {
    return launcherService.closeGame(gameId);
});

