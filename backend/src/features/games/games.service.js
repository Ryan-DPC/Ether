const Games = require('./games.model');
const CloudinaryService = require('../../services/cloudinary.service');

class GamesService {
    static async getAllGames() {
        try {
            const cloudinaryService = new CloudinaryService();

            if (cloudinaryService.isEnabled()) {
                try {
                    console.log('[Games] Fetching games from Cloudinary...');
                    return await cloudinaryService.getAllGames();
                } catch (cloudinaryError) {
                    console.warn('[Games] ⚠️ Cloudinary error, fallback to MongoDB:', cloudinaryError.message);
                }
            }

            console.log('[Games] Fetching games from MongoDB...');
            return await Games.getAllGames();
        } catch (err) {
            console.error('Error in GamesService.getAllGames :', err);
            throw new Error('Error fetching games.');
        }
    }

    static async addGame(game) {
        return await Games.addGame(game);
    }

    static async getGameByName(folderName) {
        const game = await Games.getGameByName(folderName);
        if (!game) {
            throw new Error('Game not found.');
        }

        // Sign ZIP URL if needed (for private/authenticated resources)
        if (game.zipUrl && game.zipUrl.includes('cloudinary.com')) {
            console.log('[GamesService] Attempting to sign URL:', game.zipUrl);
            const cloudinaryService = new CloudinaryService();

            if (cloudinaryService.isEnabled()) {
                // Extract public ID: everything after /upload/ and optional version
                const match = game.zipUrl.match(/\/upload\/(?:v\d+\/)?(.+)$/);

                if (match && match[1]) {
                    const publicId = match[1];
                    console.log('[GamesService] Extracted Public ID:', publicId);

                    // DEBUG: Get resource details
                    const details = await cloudinaryService.getResourceDetails(publicId, 'raw');
                    console.log('[GamesService] Resource Details:', JSON.stringify(details, null, 2));

                    // Generate signed URL with correct version
                    const version = details ? details.version : null;
                    const signedUrl = cloudinaryService.getSignedUrl(publicId, 'raw', version);
                    console.log('[GamesService] Signed URL result:', signedUrl);

                    if (signedUrl) {
                        game.zipUrl = signedUrl;
                    }
                } else {
                    console.log('[GamesService] Regex match failed for URL');
                }
            } else {
                console.log('[GamesService] CloudinaryService is NOT enabled');
            }
        }

        return game;
    }

    static async getGameDetails(folderName, userId) {
        const game = await Games.getGameByName(folderName);
        if (!game) {
            throw new Error('Game not found.');
        }

        let userOwnsGame = false;
        let ownershipInfo = null;

        // Note: Ownership logic omitted to avoid circular dependency for now.
        // Will be re-integrated when Library feature is migrated.

        return {
            game,
            userOwnsGame,
            ownershipInfo
        };
    }

    static async getManifest(folderName) {
        const cloudinaryService = new CloudinaryService();

        if (cloudinaryService.isEnabled()) {
            try {
                return await cloudinaryService.getManifest(folderName);
            } catch (cloudinaryError) {
                console.warn(`[Manifest] ⚠️ Manifest ${folderName} not found on Cloudinary, fallback local...`);
            }
        }

        // Fallback to local file system logic would go here if needed, 
        // but for now we rely on Cloudinary or return error if not found.
        // The legacy code had a GameManifestService fallback which we can migrate later if needed.

        throw new Error('Manifest not found');
    }
}

module.exports = GamesService;
