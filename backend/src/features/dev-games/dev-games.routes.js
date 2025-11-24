const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;

/**
 * @route GET /api/dev-games
 * @desc Get list of development games with their manifests from Cloudinary
 */
router.get('/', async (req, res) => {
    try {
        // Read slug.json from local filesystem to get dev games list
        const fs = require('fs').promises;
        const path = require('path');

        // Check if running in Docker or locally
        const isDocker = require('fs').existsSync('/usr/src/me');
        const slugPath = isDocker
            ? '/usr/src/me/slug.json'
            : path.join(__dirname, '../../../me/slug.json');

        const slugData = await fs.readFile(slugPath, 'utf8');
        const data = JSON.parse(slugData);
        const devGamesData = data.games || {};

        const games = [];

        // For each game in slug.json, fetch manifest and construct URLs
        for (const [slug, gameInfo] of Object.entries(devGamesData)) {
            try {
                // Construct manifest URL: games/dev/{slug}/manifest.json
                const manifestUrl = cloudinary.url(`games/dev/${slug}/manifest.json`, {
                    resource_type: 'raw'
                });

                // Fetch manifest content
                const manifestResponse = await fetch(manifestUrl);
                if (manifestResponse.ok) {
                    const manifest = await manifestResponse.json();

                    // Add URLs and metadata
                    manifest.manifestUrl = manifestUrl;
                    manifest.zipUrl = cloudinary.url(`games/dev/${slug}/${slug}.zip`, {
                        resource_type: 'raw'
                    });
                    manifest.imageUrl = cloudinary.url(`games/dev/${slug}/image.png`, {
                        resource_type: 'image'
                    });
                    manifest.defaultImageUrl = cloudinary.url('games/default-game', {
                        resource_type: 'image',
                        format: 'png'
                    });
                    manifest.price = gameInfo.price;
                    manifest.enabled = gameInfo.enabled;
                    manifest.slug = slug; // Add slug

                    games.push(manifest);
                } else {
                    console.log(`Manifest not found for ${slug} (${manifestResponse.status})`);
                }
            } catch (error) {
                console.error(`Error fetching manifest for ${slug}:`, error.message);
            }
        }

        res.json({
            success: true,
            count: games.length,
            games
        });
    } catch (error) {
        console.error('Error fetching dev games:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route GET /api/dev-games/:gameId
 * @desc Get a specific dev game's manifest
 */
router.get('/:gameId', async (req, res) => {
    try {
        const { gameId } = req.params;

        const manifestUrl = cloudinary.url(`games/dev/${gameId}/manifest.json`, {
            resource_type: 'raw'
        });

        const manifestResponse = await fetch(manifestUrl);

        if (!manifestResponse.ok) {
            return res.status(404).json({
                success: false,
                error: 'Game not found'
            });
        }

        const manifest = await manifestResponse.json();

        // Read slug.json to get extra metadata (price, enabled, etc.)
        const fs = require('fs').promises;
        const path = require('path');
        const isDocker = require('fs').existsSync('/usr/src/me');
        const slugPath = isDocker
            ? '/usr/src/me/slug.json'
            : path.join(__dirname, '../../../me/slug.json');

        let gameInfo = {};
        try {
            const slugData = await fs.readFile(slugPath, 'utf8');
            const data = JSON.parse(slugData);
            if (data.games && data.games[gameId]) {
                gameInfo = data.games[gameId];
            }
        } catch (e) {
            console.warn('Could not read slug.json for game details:', e);
        }

        // Add URLs
        manifest.manifestUrl = manifestUrl;
        manifest.zipUrl = cloudinary.url(`games/dev/${gameId}/${gameId}.zip`, {
            resource_type: 'raw'
        });
        manifest.imageUrl = cloudinary.url(`games/dev/${gameId}/image`, {
            resource_type: 'image',
            format: 'png'
        });
        manifest.defaultImageUrl = cloudinary.url('games/default-game', {
            resource_type: 'image',
            format: 'png'
        });

        // Merge slug.json info
        manifest.price = gameInfo.price !== undefined ? gameInfo.price : manifest.price;
        manifest.enabled = gameInfo.enabled !== undefined ? gameInfo.enabled : manifest.enabled;
        manifest.gameName = gameInfo.gameName || manifest.gameName;
        manifest.slug = gameId; // Add slug

        res.json({
            success: true,
            game: manifest
        });
    } catch (error) {
        console.error('Error fetching dev game:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
