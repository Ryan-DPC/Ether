const express = require('express');
const router = express.Router();
const GamesController = require('./games.controller');
const verifyToken = require('../../middleware/auth');

router.get('/all', GamesController.getAllGames);
router.post('/add', verifyToken, GamesController.addGame); // Protected
router.get('/details/:folder_name', GamesController.getGameDetails);
router.get('/:folder_name/manifest', GamesController.getManifest);
router.get('/:folder_name', GamesController.getGameByName);

// TEMPORARY DEBUG: Set zipUrl for a game
router.post('/debug/set-zipurl', verifyToken, async (req, res) => {
    try {
        const { folderName, zipUrl } = req.body;
        const Game = require('./games.model');

        const game = await Game.findOneAndUpdate(
            { folder_name: folderName },
            { $set: { zipUrl, manifestVersion: '1.0.0' } },
            { new: true }
        );

        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }

        res.json({
            success: true,
            game: {
                name: game.game_name,
                zipUrl: game.zipUrl,
                manifestVersion: game.manifestVersion
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
