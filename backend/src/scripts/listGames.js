require('dotenv').config();
const mongoose = require('mongoose');
const Game = require('../features/games/games.model');

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGO_URL);
        console.log('Connected to DB');

        // Access the model directly since the export is a class wrapper
        const GameModel = mongoose.model('Game');
        const games = await GameModel.find({});

        console.log(`Found ${games.length} games:`);
        games.forEach(g => {
            console.log(`- ${g.game_name} (${g.folder_name}) [Status: ${g.status}]`);
        });

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
