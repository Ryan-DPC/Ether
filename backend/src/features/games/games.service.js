const Games = require('./games.model');
const CloudinaryService = require('../../services/cloudinary.service');

class GamesService {
    static async getAllGames() {
        try {
            const cloudinaryService = new CloudinaryService();

            if (!cloudinaryService.isEnabled()) {
                console.warn('[Games] Cloudinary is disabled. No games will be listed.');
                return [];
            }

            console.log('[Games] Fetching games from Cloudinary (Source of Truth)...');
            const cloudGames = await cloudinaryService.getAllGames();

            // Map Cloudinary results to Game objects
            const mappedGames = cloudGames.map(game => {
                let downloadUrl = game.zipUrl;

                // OVERRIDE: Serve Ether Chess locally due to Cloudinary 10MB limit
                if (game.folder_name === 'ether-chess') {
                    const baseUrl = process.env.API_URL || 'http://localhost:3001';
                    downloadUrl = `${baseUrl}/public/games/etherchess.zip`;
                    game.image_url = `${baseUrl}/public/games/etherchess.png`;
                    console.log('[Games] Overriding URLs for Ether Chess to local');
                }

                return {
                    id: game.folder_name,
                    name: game.game_name || game.folder_name,
                    slug: game.folder_name,
                    description: game.description || '',
                    logoUrl: game.image_url,
                    downloadUrl: downloadUrl,
                    version: game.version || '1.0.0',
                    isMultiplayer: game.is_multiplayer || false
                };
            });

            // HYBRID INJECTION: Ensure Ether Chess exists even if not on Cloudinary
            const etherChessExists = mappedGames.some(g => g.slug === 'ether-chess');
            if (!etherChessExists) {
                console.log('[Games] Injecting local Ether Chess into game list');
                const baseUrl = process.env.API_URL || 'http://localhost:3001';
                mappedGames.push({
                    id: 'ether-chess',
                    name: 'Ether Chess',
                    slug: 'ether-chess',
                    description: 'A classic chess game for Ether.',
                    logoUrl: `${baseUrl}/public/games/default-game.png`,
                    downloadUrl: `${baseUrl}/public/games/etherchess.zip`,
                    version: '1.0.0',
                    isMultiplayer: false
                });
            }

            return mappedGames;

        } catch (err) {
            console.error('Error in GamesService.getAllGames :', err);
            throw new Error('Error fetching games from Cloudinary.');
        }
    }

    static async addGame(game) {
        return await Games.addGame(game);
    }

    static async getGameByName(idOrName) {
        // Handle Cloudinary IDs
        if (idOrName && idOrName.startsWith('cloudinary_')) {
            const folderName = idOrName.replace('cloudinary_', '');
            const cloudinaryService = new CloudinaryService();
            if (cloudinaryService.isEnabled()) {
                const games = await cloudinaryService.getAllGames();
                const game = games.find(g => g.folder_name === folderName);
                if (game) {
                    let downloadUrl = game.manifest?.downloadUrl || game.zipUrl;

                    // OVERRIDE: Serve Ether Chess locally
                    if (folderName === 'ether-chess') {
                        const baseUrl = process.env.API_URL || 'http://localhost:3001';
                        downloadUrl = `${baseUrl}/public/games/etherchess.zip`;
                        game.image_url = `${baseUrl}/public/games/etherchess.png`;
                    }

                    return {
                        ...game,
                        _id: game.id,
                        slug: game.folder_name,
                        downloadUrl: downloadUrl,
                        logoUrl: game.image_url, // Ensure this is mapped
                        version: game.version || game.manifestVersion
                    };
                }
            }
        }

        // Handle MongoDB ObjectIds
        const mongoose = require('mongoose');
        let game = null;
        if (mongoose.Types.ObjectId.isValid(idOrName)) {
            game = await Games.getGameById(idOrName);
        } else {
            game = await Games.getGameByName(idOrName);
        }

        if (!game) {
            // If not found in DB, try Cloudinary direct lookup as fallback
            const cloudinaryService = new CloudinaryService();
            if (cloudinaryService.isEnabled()) {
                try {
                    const manifest = await cloudinaryService.getManifest(idOrName);
                    if (manifest) {
                        return {
                            id: idOrName,
                            name: manifest.name,
                            slug: idOrName,
                            version: manifest.version,
                            downloadUrl: manifest.downloadUrl
                        };
                    }
                } catch (e) { }
            }
            throw new Error('Game not found.');
        }

        return {
            ...game,
            _id: game.id,
            slug: game.folder_name,
            downloadUrl: game.zipUrl,
            version: game.manifestVersion
        };
    }

    static async getGameDetails(folderName, userId) {
        const game = await Games.getGameByName(folderName);
        if (!game) {
            // Try Cloudinary
            const cloudinaryService = new CloudinaryService();
            if (cloudinaryService.isEnabled()) {
                const games = await cloudinaryService.getAllGames();
                const cloudGame = games.find(g => g.folder_name === folderName);
                if (cloudGame) {
                    return {
                        game: {
                            ...cloudGame,
                            slug: cloudGame.folder_name,
                            name: cloudGame.game_name
                        },
                        userOwnsGame: true, // Free games for now
                        ownershipInfo: null
                    };
                }
            }
            throw new Error('Game not found.');
        }

        return {
            game,
            userOwnsGame: true, // Simplified for now
            ownershipInfo: null
        };
    }

    static async getManifest(idOrName) {
        let folderName = idOrName;

        // Handle Cloudinary IDs
        if (idOrName && idOrName.startsWith('cloudinary_')) {
            folderName = idOrName.replace('cloudinary_', '');
        }

        const cloudinaryService = new CloudinaryService();

        if (cloudinaryService.isEnabled()) {
            try {
                return await cloudinaryService.getManifest(folderName);
            } catch (cloudinaryError) {
                console.warn(`[Manifest] ⚠️ Manifest ${folderName} not found on Cloudinary.`);
            }
        }

        throw new Error('Manifest not found');
    }

    static async updateGameVersion(gameId, version, manifestUrl, zipUrl) {
        // 1. Verify game exists
        let game = null;
        const mongoose = require('mongoose');
        if (mongoose.Types.ObjectId.isValid(gameId)) {
            game = await Games.getGameById(gameId);
        } else {
            game = await Games.getGameByName(gameId);
        }

        if (!game) {
            throw new Error(`Game not found with ID/Name: ${gameId}`);
        }

        // 2. Update game
        const success = await Games.updateGameVersion(gameId, version, manifestUrl, zipUrl);
        if (!success) {
            throw new Error('Failed to update game version in database.');
        }

        return true;
    }

    static async getManifestUrl(idOrName) {
        const cloudinaryService = new CloudinaryService();
        if (cloudinaryService.isEnabled()) {
            // Try standard naming convention: manifests/{folderName}.json
            const publicId = `manifests/${idOrName}.json`;
            const url = cloudinaryService.getPublicUrl(publicId, 'raw');
            if (url) return url;
        }

        throw new Error('Manifest URL not found.');
    }
}

module.exports = GamesService;
