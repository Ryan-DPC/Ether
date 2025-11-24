const cloudinary = require('cloudinary').v2;
const fs = require('fs').promises;
const path = require('path');
const getCloudinaryCache = require('./cloudinaryCache.service');
const SlugService = require('./slug.service');

class CloudinaryService {
    constructor() {
        const cloudinaryUrl = process.env.CLOUDINARY_URL;

        if (cloudinaryUrl) {
            cloudinary.config({
                cloudinary_url: cloudinaryUrl,
            });
            this.enabled = true;
            console.log('[Cloudinary] ✅ Cloudinary configured via CLOUDINARY_URL');
        } else {
            const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
            const apiKey = process.env.CLOUDINARY_API_KEY;
            const apiSecret = process.env.CLOUDINARY_API_SECRET;

            if (cloudName && apiKey && apiSecret) {
                cloudinary.config({
                    cloud_name: cloudName,
                    api_key: apiKey,
                    api_secret: apiSecret,
                });
                this.enabled = true;
                console.log('[Cloudinary] ✅ Cloudinary configured via variables');
            } else {
                this.enabled = false;
                console.warn('[Cloudinary] ⚠️ Cloudinary not configured');
            }
        }
    }

    async uploadFile(filePath, publicId, options = {}) {
        if (!this.enabled) throw new Error('Cloudinary not configured');

        try {
            const result = await cloudinary.uploader.upload(filePath, {
                public_id: publicId,
                resource_type: 'auto',
                overwrite: true,
                ...options,
            });

            return {
                url: result.secure_url,
                publicId: result.public_id,
                version: result.version,
                format: result.format,
                bytes: result.bytes,
            };
        } catch (error) {
            console.error(`[Cloudinary] Error uploading ${filePath}:`, error);
            throw error;
        }
    }

    async uploadBuffer(buffer, publicId, options = {}) {
        if (!this.enabled) throw new Error('Cloudinary not configured');

        return new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                {
                    public_id: publicId,
                    resource_type: 'auto',
                    overwrite: true,
                    ...options,
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve({
                        url: result.secure_url,
                        publicId: result.public_id,
                        version: result.version,
                        format: result.format,
                        bytes: result.bytes,
                    });
                }
            ).end(buffer);
        });
    }

    async getBaseUrl() {
        if (!this.enabled) return null;
        const config = cloudinary.config();
        const cloudName = config.cloud_name || this.extractCloudNameFromUrl();
        if (!cloudName) return null;
        return `https://res.cloudinary.com/${cloudName}`;
    }

    extractCloudNameFromUrl() {
        const cloudinaryUrl = process.env.CLOUDINARY_URL;
        if (!cloudinaryUrl) return null;
        const match = cloudinaryUrl.match(/@([^/]+)/);
        return match ? match[1] : null;
    }

    getPublicUrl(publicId, resourceType = 'raw') {
        if (!this.enabled) return null;
        const config = cloudinary.config();
        const cloudName = config.cloud_name || process.env.CLOUDINARY_CLOUD_NAME || this.extractCloudNameFromUrl();
        if (!cloudName) return null;
        return `https://res.cloudinary.com/${cloudName}/${resourceType}/upload/${publicId}`;
    }

    getSignedUrl(publicId, resourceType = 'raw', version = null) {
        if (!this.enabled) return null;
        try {
            const config = cloudinary.config();
            const apiKey = config.api_key || process.env.CLOUDINARY_API_KEY;
            const apiSecret = config.api_secret || process.env.CLOUDINARY_API_SECRET;

            if (!apiKey || !apiSecret) {
                console.error('[Cloudinary] Missing API Key or Secret for signing');
                return null;
            }

            // Strategy 4: Use private_download_url for raw files
            // This generates a URL to the API download endpoint which handles the auth and redirect
            if (resourceType === 'raw') {
                // Extract format from publicId if present (e.g. 'game.zip' -> 'zip')
                const extension = publicId.split('.').pop();
                const format = extension !== publicId ? extension : '';

                const url = cloudinary.utils.private_download_url(publicId, format, {
                    resource_type: resourceType,
                    type: 'upload',
                    expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour
                    attachment: true // Force download
                });

                return url;
            }

            // Fallback for non-raw resources (images etc) - use standard signing
            const options = {
                resource_type: resourceType,
                type: 'upload',
                sign_url: true,
                secure: true
            };

            if (version) {
                options.version = version;
            }

            return cloudinary.url(publicId, options);
        } catch (error) {
            console.error('[Cloudinary] Error signing URL:', error);
            return null;
        }
    }

    async getResourceDetails(publicId, resourceType = 'raw') {
        if (!this.enabled) return null;
        try {
            // Use Admin API to get details
            const result = await cloudinary.api.resource(publicId, {
                resource_type: resourceType
            });
            return result;
        } catch (error) {
            console.error('[Cloudinary] Error getting resource details:', error.message);
            return null;
        }
    }

    async listManifests(clearCache = false) {
        if (!this.enabled) throw new Error('Cloudinary not configured');

        const cache = getCloudinaryCache();
        if (!clearCache && cache.isEnabled()) {
            const cached = await cache.getManifestsList();
            if (cached) return cached;
        }

        if (clearCache && cache.isEnabled()) {
            await cache.clearAll();
        }

        try {
            const result = await cloudinary.api.resources({
                type: 'upload',
                resource_type: 'raw',
                prefix: 'manifests/',
                max_results: 500,
            });

            const manifests = result.resources.map(resource => {
                let folderName = resource.public_id;
                while (folderName.startsWith('manifests/')) {
                    folderName = folderName.substring('manifests/'.length);
                }
                if (folderName.endsWith('.json')) {
                    folderName = folderName.substring(0, folderName.length - '.json'.length);
                }
                folderName = folderName.replace(/\/$/, '');

                return {
                    folderName,
                    publicId: resource.public_id,
                    url: resource.secure_url,
                    version: resource.version,
                    createdAt: resource.created_at,
                    updatedAt: resource.updated_at,
                    bytes: resource.bytes,
                };
            });

            if (cache.isEnabled()) {
                await cache.setManifestsList(manifests);
            }

            return manifests;
        } catch (error) {
            console.error('[Cloudinary] Error listing manifests:', error);
            throw error;
        }
    }

    async getManifest(folderName) {
        if (!this.enabled) throw new Error('Cloudinary not configured');

        const cache = getCloudinaryCache();
        if (cache.isEnabled()) {
            const cached = await cache.getManifest(folderName);
            if (cached) return cached;
        }

        try {
            let manifestUrl = null;
            try {
                const manifestsList = await this.listManifests();
                const found = manifestsList.find(m => m.folderName === folderName);
                if (found) manifestUrl = found.url;
            } catch (listError) {
                // Ignore
            }

            if (!manifestUrl) {
                const publicId = `manifests/${folderName}`;
                manifestUrl = this.getPublicUrl(publicId, 'raw');
                if (!manifestUrl) throw new Error('Cannot construct manifest URL');
            }

            const response = await fetch(manifestUrl);
            if (!response.ok) throw new Error(`Manifest not found: ${response.status}`);

            const manifest = await response.json();

            if (cache.isEnabled()) {
                await cache.setManifest(folderName, manifest);
            }

            return manifest;
        } catch (error) {
            console.error(`[Cloudinary] Error getting manifest ${folderName}:`, error);
            throw error;
        }
    }

    async getAllGames(clearCache = false) {
        if (!this.enabled) throw new Error('Cloudinary not configured');

        const cache = getCloudinaryCache();
        if (!clearCache && cache.isEnabled()) {
            const cachedGames = await cache.getGamesList();
            if (cachedGames && Array.isArray(cachedGames) && cachedGames.length > 0) {
                return cachedGames;
            }
        }

        if (clearCache && cache.isEnabled()) {
            await cache.clearAll();
        }

        try {
            const slugService = new SlugService();
            const slugPrices = await slugService.getAllPrices();

            let mongoGames = [];
            try {
                const Games = require('../features/games/games.model');
                mongoGames = await Games.getAllGames();
                const gamesMap = new Map();
                mongoGames.forEach(game => {
                    gamesMap.set(game.folder_name, game);
                });
                this.mongoGamesMap = gamesMap;
            } catch (mongoError) {
                console.warn('[Cloudinary] ⚠️ Cannot fetch games from MongoDB:', mongoError.message);
                this.mongoGamesMap = new Map();
            }

            this.slugPrices = slugPrices;

            const manifestsList = await this.listManifests(clearCache);

            const games = await Promise.all(
                manifestsList.map(async (manifestInfo) => {
                    try {
                        const syncManifest = await fetch(manifestInfo.url).then(r => r.ok ? r.json() : null).catch(() => null);

                        let gameManifest = null;
                        const gameManifestUrl = this.getPublicUrl(`games/${manifestInfo.folderName}/manifest.json`, 'raw');
                        if (gameManifestUrl) {
                            try {
                                const gameManifestResponse = await fetch(gameManifestUrl);
                                if (gameManifestResponse.ok) {
                                    gameManifest = await gameManifestResponse.json();
                                }
                            } catch (err) { }
                        }

                        if (!gameManifest) {
                            try {
                                let cleanFolderName = manifestInfo.folderName.replace(/^manifests\//, '').replace(/\/$/, '');
                                const gamesPath = process.env.GAMES_PATH || path.join(__dirname, '../../../../games');
                                const manifestPath = path.join(gamesPath, cleanFolderName, 'manifest.json');
                                const manifestContent = await fs.readFile(manifestPath, 'utf8');
                                gameManifest = JSON.parse(manifestContent);
                            } catch (err) { }
                        }

                        if (cache.isEnabled() && syncManifest) {
                            await cache.setManifest(manifestInfo.folderName, syncManifest);
                        }

                        const mongoGame = this.mongoGamesMap?.get(manifestInfo.folderName);

                        return {
                            id: mongoGame?.id || `cloudinary_${manifestInfo.folderName}`,
                            game_name: gameManifest?.gameName || mongoGame?.game_name || manifestInfo.folderName,
                            folder_name: manifestInfo.folderName,
                            description: gameManifest?.description || mongoGame?.description || '',
                            image_url: mongoGame?.image_url || gameManifest?.imageUrl || gameManifest?.bannerUrl || '/assets/images/default-game.png',
                            status: mongoGame?.status || 'disponible',
                            genre: gameManifest?.genre || mongoGame?.genre || 'Undefined',
                            max_players: gameManifest?.maxPlayers || mongoGame?.max_players || 1,
                            is_multiplayer: gameManifest?.isMultiplayer || mongoGame?.is_multiplayer || false,
                            developer: gameManifest?.developer || mongoGame?.developer || 'Inconnu',
                            price: this.slugPrices?.[manifestInfo.folderName] !== undefined
                                ? this.slugPrices[manifestInfo.folderName]
                                : (mongoGame?.price !== undefined && mongoGame.price > 0
                                    ? mongoGame.price
                                    : (gameManifest?.price !== undefined ? gameManifest.price : 0)),
                            version: gameManifest?.version || syncManifest?.version || manifestInfo.version,
                            manifestUrl: manifestInfo.url,
                            manifestVersion: syncManifest?.version || manifestInfo.version,
                            manifestUpdatedAt: manifestInfo.updatedAt,
                            created_at: mongoGame?.created_at || manifestInfo.createdAt || new Date(),
                            updated_at: mongoGame?.updated_at || manifestInfo.updatedAt || new Date(),
                            manifest: syncManifest,
                            gameManifest: gameManifest,
                        };
                    } catch (error) {
                        const mongoGame = this.mongoGamesMap?.get(manifestInfo.folderName);
                        return {
                            id: mongoGame?.id || `cloudinary_${manifestInfo.folderName}`,
                            game_name: mongoGame?.game_name || manifestInfo.folderName,
                            folder_name: manifestInfo.folderName,
                            description: mongoGame?.description || '',
                            image_url: mongoGame?.image_url || '/assets/images/default-game.png',
                            status: mongoGame?.status || 'disponible',
                            genre: mongoGame?.genre || 'Undefined',
                            max_players: mongoGame?.max_players || 1,
                            is_multiplayer: mongoGame?.is_multiplayer || false,
                            developer: mongoGame?.developer || 'Inconnu',
                            price: this.slugPrices?.[manifestInfo.folderName] !== undefined
                                ? this.slugPrices[manifestInfo.folderName]
                                : (mongoGame?.price !== undefined ? mongoGame.price : 0),
                            version: manifestInfo.version,
                            manifestUrl: manifestInfo.url,
                            manifestVersion: manifestInfo.version,
                            manifestUpdatedAt: manifestInfo.updatedAt,
                            created_at: mongoGame?.created_at || manifestInfo.createdAt || new Date(),
                            updated_at: mongoGame?.updated_at || manifestInfo.updatedAt || new Date(),
                        };
                    }
                })
            );

            if (cache.isEnabled()) {
                await cache.setGamesList(games, 3600);
            }

            return games;
        } catch (error) {
            console.error('[Cloudinary] Error fetching all games:', error);
            throw error;
        }
    }

    isEnabled() {
        return this.enabled;
    }
}

module.exports = CloudinaryService;
