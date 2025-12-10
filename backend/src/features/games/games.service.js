const Games = require('./games.model');
const CloudinaryService = require('../../services/cloudinary.service');
const GitHubService = require('../../services/github.service');
const fs = require('fs').promises;
const path = require('path');
const unzipper = require('unzipper'); // ensure this is installed
const { createReadStream } = require('fs');

class GamesService {
    static async getAllGames() {
        try {
            const cloudinaryService = new CloudinaryService();
            // Cloudinary now returns the "metadata" based list
            // We assume CloudinaryService.getAllGames() is already updated to return the clean object with github_url
            if (cloudinaryService.isEnabled()) {
                console.log('[Games] Fetching games metadata from Cloudinary...');
                return await cloudinaryService.getAllGames();
            }

            // Fallback to DB if Cloudinary disabled (though user specified Cloudinary is source of truth for list)
            console.warn('[Games] Cloudinary disabled, returning DB games only.');
            return await Games.getAllGames();

        } catch (err) {
            console.error('Error in GamesService.getAllGames :', err);
            throw new Error('Error fetching games list.');
        }
    }

    static async getGameDetails(folderName, userId) {
        // 1. Get Metadata (Cloudinary or DB)
        let game = await this.getGameByName(folderName);

        if (!game) {
            throw new Error('Game not found.');
        }

        // 2. Enhance with GitHub Info (Version, Download URL)
        let latestRelease = null;
        if (game.github_url) {
            try {
                const ghService = new GitHubService();
                const repoInfo = ghService.parseUrl(game.github_url);
                if (repoInfo) {
                    latestRelease = await ghService.getLatestRelease(repoInfo.owner, repoInfo.repo);
                }
            } catch (ghError) {
                console.warn(`[Games] Failed to fetch GitHub info for ${folderName}:`, ghError.message);
            }
        }

        // Merge info
        const enhancedGame = {
            ...game,
            latestVersion: latestRelease ? latestRelease.version : game.version,
            downloadUrl: latestRelease ? latestRelease.downloadUrl : game.downloadUrl,
            releaseNotes: latestRelease ? latestRelease.changelog : '',
            publishedAt: latestRelease ? latestRelease.publishedAt : game.updated_at
        };

        // 3. User Ownership (Simplified)
        return {
            game: enhancedGame,
            userOwnsGame: true, // simplified
            ownershipInfo: null
        };
    }

    static async getGameByName(idOrName) {
        // Logic similar to before but simplified
        // Try finding in Cloudinary list first
        const allGames = await this.getAllGames();
        const game = allGames.find(g => g.id === idOrName || g.folder_name === idOrName);
        if (game) return game;

        // Fallback to DB
        return await Games.getGameByName(idOrName);
    }

    /**
     * Install or Update a game from GitHub
     * @param {string} gameId - The ID/Folder Name of the game (e.g. "ether-game-chess")
     */
    static async installGame(gameId) {
        console.log(`[Games] Starting installation for ${gameId}...`);

        // 1. Get Game Metadata to find GitHub URL
        const game = await this.getGameByName(gameId);
        if (!game || !game.github_url) {
            throw new Error(`Game ${gameId} not found or missing GitHub URL.`);
        }

        // 2. Fetch Latest Release from GitHub
        const ghService = new GitHubService();
        const repoInfo = ghService.parseUrl(game.github_url);
        if (!repoInfo) throw new Error(`Invalid GitHub URL: ${game.github_url}`);

        const release = await ghService.getLatestRelease(repoInfo.owner, repoInfo.repo);
        if (!release || !release.downloadUrl) {
            throw new Error(`No release or download URL found for ${gameId}`);
        }

        console.log(`[Games] Found release ${release.version} for ${gameId}. Downloading...`);

        // 3. Download the Zip
        const gamesPath = process.env.GAMES_PATH || path.join(__dirname, '../../../../games');
        const tempPath = path.join(gamesPath, 'temp', `${gameId}_${release.version}.zip`);

        await ghService.downloadFile(release.downloadUrl, tempPath);
        console.log(`[Games] Downloaded to ${tempPath}`);

        // 4. Extract
        const gameDir = path.join(gamesPath, gameId);

        // Clean existing directory logic could be adding backup here, but for now strictly overwrite
        // We'll trust unzipper to overwrite or we check/empty first.
        // Safer to empty first.
        try {
            await fs.rm(gameDir, { recursive: true, force: true });
        } catch (e) { /* ignore */ }

        await fs.mkdir(gameDir, { recursive: true });

        console.log(`[Games] Extracting to ${gameDir}...`);

        // Unzip logic
        // Using unzipper stream
        await new Promise((resolve, reject) => {
            createReadStream(tempPath)
                .pipe(unzipper.Extract({ path: gameDir }))
                .on('close', resolve)
                .on('error', reject);
        });

        // 5. Cleanup Temp
        await fs.unlink(tempPath);

        console.log(`[Games] Installation complete for ${gameId} v${release.version}`);

        // 6. Update Local Database (Optional but good for tracking)
        // We might want to store "installed_version" in a local SQLite/JSON/Mongo
        // For now, we assume filesystem is source of truth for "installed"

        // Return success info
        return {
            success: true,
            version: release.version,
            path: gameDir
        };
    }

    // Keep legacy methods if needed or stubs
    static async getManifest(id) {
        // 1. Get Metadata (Cloudinary/DB) logic re-used from getGameByName
        const game = await this.getGameByName(id);
        if (!game) {
            throw new Error('Game not found');
        }

        // 2. If no GitHub URL, return basic metadata (legacy compatibility)
        if (!game.github_url) {
            return {
                gameName: game.game_name || game.name,
                version: game.version || '1.0.0',
                description: game.description,
                platform: 'windows',
                entryPoint: game.entryPoint || 'Game.exe',
                downloadUrl: game.zipUrl || game.downloadUrl
            };
        }

        // 3. Fetch Latest Release from GitHub
        try {
            const ghService = new GitHubService();
            const repoInfo = ghService.parseUrl(game.github_url);

            if (!repoInfo) {
                console.warn(`[Manifest] Invalid GitHub URL for ${id}: ${game.github_url}`);
                // Return what we have
                return {
                    gameName: game.game_name || game.name,
                    version: game.version || '0.0.0',
                    description: game.description,
                    platform: 'windows',
                    entryPoint: game.entryPoint || 'Game.exe',
                    downloadUrl: null
                };
            }

            const release = await ghService.getLatestRelease(repoInfo.owner, repoInfo.repo);

            // 4. Construct Composite Manifest
            // Prioritize GitHub Release data for version and downloadUrl
            return {
                gameName: game.game_name || game.name,
                version: release.version, // Tag name from GitHub
                description: game.description,
                platform: 'windows', // Defaulting to windows for now
                entryPoint: game.entryPoint || 'Game.exe', // From metadata or default
                downloadUrl: release.downloadUrl, // Asset browser_download_url
                zipUrl: release.downloadUrl, // Backward compatibility
                releaseNotes: release.changelog,
                publishedAt: release.publishedAt
            };

        } catch (error) {
            console.error(`[Manifest] Failed to fetch GitHub release for ${id}:`, error.message);
            // Fallback: return metadata values if available, otherwise error
            return {
                gameName: game.game_name || game.name,
                version: game.version || '0.0.0',
                description: game.description,
                platform: 'windows',
                entryPoint: game.entryPoint || 'Game.exe',
                downloadUrl: game.zipUrl || null,
                error: 'Failed to fetch latest release info'
            };
        }
    }

    static async updateGameVersion(gameId, version, manifestUrl, zipUrl) {
        // This might be used by the Admin webhook still? 
        // Or we can deprecate it. Leaving as wrapper to DB.
        return Games.updateGameVersion(gameId, version, manifestUrl, zipUrl);
    }
}

module.exports = GamesService;
