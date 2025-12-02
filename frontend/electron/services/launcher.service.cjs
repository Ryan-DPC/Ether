const { BrowserWindow, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');

class LauncherService {
    constructor() {
        this.activeGames = new Map();
    }

    /**
     * Launch a game strictly using manifest.json
     */
    async launchGame(installPath, gameFolderName, userData = null, onStatusChange = null) {
        try {
            const gamePath = path.join(installPath, 'Ether', gameFolderName);
            const manifestPath = path.join(gamePath, 'manifest.json');

            // 1. Verify Manifest
            let manifest;
            try {
                const data = await fs.readFile(manifestPath, 'utf8');
                manifest = JSON.parse(data);
            } catch (e) {
                throw new Error(`CRITICAL: manifest.json missing or invalid in ${gamePath}`);
            }

            // Check if game is already running
            const gameId = manifest.id || manifest.name;
            if (this.activeGames.has(gameId)) {
                const activeGame = this.activeGames.get(gameId);
                if (activeGame.window && !activeGame.window.isDestroyed()) {
                    activeGame.window.focus();
                    return { success: true, message: 'Game already running, window focused.' };
                }
                // For executables, we might not have a window handle to focus, but we know it's running
                if (activeGame.process && activeGame.process.exitCode === null) {
                    return { success: true, message: 'Game already running.' };
                }

                // If we get here, the reference is stale
                this.activeGames.delete(gameId);
            }

            // 2. Check for Entry Point
            const entryFile = manifest.entry || manifest.entryPoint || manifest.mainFile;
            if (!entryFile) {
                throw new Error(`CRITICAL: No 'entry' defined in manifest.json for ${gameFolderName}`);
            }

            const entryPath = path.join(gamePath, entryFile);

            // 3. Verify Entry File Exists
            try {
                await fs.access(entryPath);
            } catch (e) {
                throw new Error(`CRITICAL: Entry file '${entryFile}' not found in game folder.`);
            }

            // 4. Launch based on type
            let handle;
            if (entryFile.endsWith('.html')) {
                handle = await this.launchHTMLGame(entryPath, manifest, userData);
            } else if (entryFile.endsWith('.exe')) {
                handle = await this.launchExecutable(entryPath, gamePath, manifest, userData);
            } else {
                throw new Error(`Unsupported entry file type: ${entryFile}`);
            }

            // Track game and notify status
            this.trackGame(gameId, handle, onStatusChange, gameFolderName);
            if (onStatusChange) onStatusChange(gameFolderName, 'running');

            return { success: true, message: 'Game Launched' };

        } catch (error) {
            console.error('[Launcher] Error:', error.message);
            throw error;
        }
    }

    async launchHTMLGame(htmlPath, manifest, userData) {
        const gameWindow = new BrowserWindow({
            width: 1280, height: 720,
            title: manifest.name || 'Game',
            backgroundColor: '#000000',
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, '../game-preload.js')
            },
            autoHideMenuBar: true
        });

        await gameWindow.loadFile(htmlPath);

        if (userData) {
            gameWindow.webContents.executeJavaScript(`
                if (window.etherAPI) {
                    window.etherAPI.user = ${JSON.stringify(userData.user || null)};
                    window.etherAPI.token = ${JSON.stringify(userData.token || null)};
                }
            `);
        }

        return { window: gameWindow };
    }

    async launchExecutable(exePath, workingDir, manifest, userData) {
        console.log(`[Launcher] Spawning: ${exePath}`);
        console.log(`[Launcher] UserData:`, JSON.stringify(userData));

        const env = { ...process.env };
        // Sanitize Electron env
        Object.keys(env).forEach(k => { if (k.startsWith('ELECTRON_')) delete env[k]; });

        if (userData) {
            env.ETHER_USER = JSON.stringify(userData.user);
            env.ETHER_TOKEN = userData.token;
        }

        const gameProcess = spawn(exePath, [], {
            cwd: workingDir,
            detached: true,
            env: env,
            stdio: 'ignore'
        });

        gameProcess.unref();

        return { process: gameProcess };
    }

    trackGame(id, handle, onStatusChange, folderName) {
        this.activeGames.set(id, handle);

        const cleanup = () => {
            console.log(`[Launcher] Game ${id} stopped.`);
            this.activeGames.delete(id);
            if (onStatusChange) onStatusChange(folderName, 'stopped');
        };

        if (handle.window) {
            handle.window.on('closed', cleanup);
        }
        if (handle.process) {
            handle.process.on('exit', cleanup);
            handle.process.on('error', (err) => {
                console.error(`[Launcher] Process error for ${id}:`, err);
                cleanup();
            });
        }
    }
}

module.exports = new LauncherService();
