const GamesService = require('./games.service');

class GamesController {
    static async getAllGames(req, res) {
        try {
            const games = await GamesService.getAllGames();
            res.status(200).json(games);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }

    static async addGame(req, res) {
        try {
            const gameId = await GamesService.addGame(req.body);
            res.status(201).json({ message: 'Game added successfully.', id: gameId });
        } catch (err) {
            res.status(500).json({ message: 'Error adding game.' });
        }
    }

    static async getGameByName(req, res) {
        try {
            const { folder_name } = req.params;
            const game = await GamesService.getGameByName(folder_name);
            res.json(game);
        } catch (err) {
            res.status(404).json({ message: err.message });
        }
    }

    static async getGameDetails(req, res) {
        try {
            const { folder_name } = req.params;
            const userId = req.user?.id;
            const details = await GamesService.getGameDetails(folder_name, userId);
            res.json(details);
        } catch (err) {
            res.status(404).json({ message: err.message });
        }
    }

    static async getManifest(req, res) {
        try {
            const { folder_name } = req.params;
            const manifest = await GamesService.getManifest(folder_name);
            res.json(manifest);
        } catch (error) {
            res.status(404).json({ error: error.message });
        }
    }
}

module.exports = GamesController;
