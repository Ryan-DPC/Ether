const { BrowserWindow, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');

class LauncherService {
    constructor() {
        // Track active game windows and processes
        this.activeGames = new Map(); // gameId -> { window: BrowserWindow, process: ChildProcess }
    }

    /**
     * Launch a game by reading its manifest and determining launch method
     * @param {string} installPath - Base installation directory
     * @param {string} gameFolderName - Game folder name
     * @param {object} userData - User authentication data to pass to game
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async launchGame(installPath, gameFolderName, userData = null) {
        try {
            // Match the installation service path structure: installPath/Ether/gameFolderName
            const gamePath = path.join(installPath, 'Ether', gameFolderName);

            // Check if game directory exists
            try {
                await fs.access(gamePath);
            } catch (error) {
                throw new Error(`Le jeu n'est pas installé dans: ${gamePath}`);
            }

            // Read manifest.json
            const manifestPath = path.join(gamePath, 'manifest.json');
            let manifest;

            try {
                const manifestData = await fs.readFile(manifestPath, 'utf8');
                manifest = JSON.parse(manifestData);
            } catch (error) {
                throw new Error(`Impossible de lire le manifest.json: ${error.message}`);
            }

            // Check if game is already running
            if (this.activeGames.has(manifest.gameId)) {
                const activeGame = this.activeGames.get(manifest.gameId);
                if (activeGame.window && !activeGame.window.isDestroyed()) {
                    activeGame.window.focus();
                    return { success: true, message: 'Jeu déjà lancé, focus restauré' };
                } else {
                    // Clean up stale reference
                    this.activeGames.delete(manifest.gameId);
                }
            }

            // Determine launch method based on platform/entryPoint
            if (manifest.platform === 'web' || manifest.platform === 'html' ||
                manifest.entryPoint?.endsWith('.html') ||
                manifest.mainFile?.endsWith('.html')) {
                // HTML-based game - launch in new window
                return await this.launchHTMLGame(gamePath, manifest, userData);
            } else if (manifest.platform === 'exe' && manifest.entryPoint?.endsWith('.exe')) {
                // Native executable
                return await this.launchExecutable(gamePath, manifest, userData);
            } else {
                throw new Error(`Type de jeu non supporté: ${manifest.platform}`);
            }
        } catch (error) {
            console.error('[Launcher] Error launching game:', error);
            throw error;
        }
    }

    /**
     * Launch an HTML-based game in a new BrowserWindow
     */
    async launchHTMLGame(gamePath, manifest, userData) {
        const entryFile = manifest.entryPoint || manifest.mainFile || 'index.html';
        const htmlPath = path.join(gamePath, entryFile);

        // Check if entry file exists
        try {
            await fs.access(htmlPath);
        } catch (error) {
            throw new Error(`Fichier d'entrée introuvable: ${entryFile}`);
        }

        // Create game window with manifest settings
        const gameWindow = new BrowserWindow({
            width: manifest.minWidth || 1280,
            height: manifest.minHeight || 720,
            minWidth: manifest.minWidth || 800,
            minHeight: manifest.minHeight || 600,
            title: manifest.gameName || manifest.gameId,
            backgroundColor: '#000000',
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                webSecurity: false, // Disable to allow loading local files (node_modules, etc.)
                preload: path.join(__dirname, '../game-preload.js'), // Inject game preload
                enableRemoteModule: false
            },
            autoHideMenuBar: true,
            frame: true
        });

        // Load the game HTML file
        await gameWindow.loadFile(htmlPath);

        // Inject user data into the game window after page loads
        if (userData) {
            gameWindow.webContents.executeJavaScript(`
                if (window.etherAPI) {
                    window.etherAPI.user = ${JSON.stringify(userData.user || null)};
                    window.etherAPI.token = ${JSON.stringify(userData.token || null)};
                    console.log('[Ether] User data injected:', window.etherAPI.user);
                }
            `);
        }

        // Track the game window
        this.activeGames.set(manifest.gameId, {
            window: gameWindow,
            manifest,
            startTime: Date.now()
        });

        // Clean up when window is closed
        gameWindow.on('closed', () => {
            this.activeGames.delete(manifest.gameId);
            console.log(`[Launcher] Game window closed: ${manifest.gameName}`);
        });

        // Handle external links (open in default browser)
        gameWindow.webContents.setWindowOpenHandler(({ url }) => {
            shell.openExternal(url);
            return { action: 'deny' };
        });

        console.log(`[Launcher] Launched HTML game: ${manifest.gameName}`);
        return {
            success: true,
            message: `${manifest.gameName} lancé avec succès`,
            gameId: manifest.gameId
        };
    }

    /**
     * Launch a native executable game
     */
    async launchExecutable(gamePath, manifest, userData) {
        const exePath = path.join(gamePath, manifest.entryPoint);

        // Check if executable exists
        try {
            await fs.access(exePath);
        } catch (error) {
            throw new Error(`Exécutable introuvable: ${manifest.entryPoint}`);
        }

        // Spawn the game process
        const gameProcess = spawn(exePath, [], {
            cwd: gamePath, // Set working directory to game folder
            detached: true, // Allow game to continue running independently
            stdio: 'ignore'
        });

        // Unref so parent process can exit
        gameProcess.unref();

        // Track the process
        this.activeGames.set(manifest.gameId, {
            process: gameProcess,
            manifest,
            startTime: Date.now()
        });

        // Clean up when process exits
        gameProcess.on('exit', (code) => {
            this.activeGames.delete(manifest.gameId);
            console.log(`[Launcher] Game process exited: ${manifest.gameName} (code: ${code})`);
        });

        console.log(`[Launcher] Launched executable: ${manifest.gameName}`);
        return {
            success: true,
            message: `${manifest.gameName} lancé avec succès`,
            gameId: manifest.gameId
        };
    }

    /**
     * Get list of currently running games
     */
    getActiveGames() {
        const games = [];
        for (const [gameId, data] of this.activeGames.entries()) {
            games.push({
                gameId,
                gameName: data.manifest.gameName,
                startTime: data.startTime,
                type: data.window ? 'window' : 'process'
            });
        }
        return games;
    }

    /**
     * Close a running game
     */
    closeGame(gameId) {
        if (!this.activeGames.has(gameId)) {
            return { success: false, message: 'Jeu non lancé' };
        }

        const game = this.activeGames.get(gameId);

        if (game.window && !game.window.isDestroyed()) {
            game.window.close();
        } else if (game.process) {
            game.process.kill();
        }

        this.activeGames.delete(gameId);
        return { success: true, message: 'Jeu fermé' };
    }
}

module.exports = new LauncherService();
