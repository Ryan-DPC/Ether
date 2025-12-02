const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const installationService = require('./services/installation.service.cjs');
const launcherService = require('./services/launcher.service.cjs');

const isDev = process.env.NODE_ENV === 'development';
let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.cjs')
        },
        autoHideMenuBar: true,
        icon: path.join(__dirname, '../public/favicon.ico')
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

// IPC Handler for directory selection
ipcMain.handle('dialog:openDirectory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    if (canceled) {
        return null;
    } else {
        return filePaths[0];
    }
});

// IPC Handlers for Installation
ipcMain.handle('game:install', async (event, downloadUrl, installPath, folderName, gameId, gameName, version, manifest) => {
    try {
        console.log(`[Main] Installing game: ${gameName} (${gameId})`);

        // Setup progress listener
        const onProgress = (data) => {
            mainWindow.webContents.send('install:progress', {
                gameId,
                gameName,
                ...data
            });
        };

        const result = await installationService.installGame(downloadUrl, installPath, folderName, version, manifest, onProgress);

        mainWindow.webContents.send('install:complete', {
            gameId,
            gameName,
            path: result.path
        });

        return result;
    } catch (error) {
        console.error('[Main] Install error:', error);
        mainWindow.webContents.send('install:error', {
            gameId,
            gameName,
            error: error.message
        });
        throw error;
    }
});

ipcMain.handle('game:checkInstalled', async (event, installPath, folderName) => {
    return await installationService.isGameInstalled(installPath, folderName);
});

ipcMain.handle('game:uninstall', async (event, installPath, folderName) => {
    return await installationService.uninstallGame(installPath, folderName);
});

// IPC Handlers for Launcher
ipcMain.handle('game:launch', async (event, { installPath, folderName, userData }) => {
    const onStatusChange = (gameFolderName, status) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('game:status', { folderName: gameFolderName, status });
        }
    };
    return await launcherService.launchGame(installPath, folderName, userData, onStatusChange);
});

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
