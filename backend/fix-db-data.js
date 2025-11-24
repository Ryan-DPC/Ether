const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

// Models
const ownershipSchema = new mongoose.Schema({}, { strict: false });
const Ownership = mongoose.model('GameOwnership', ownershipSchema);

const gameSchema = new mongoose.Schema({}, { strict: false });
const Game = mongoose.model('Game', gameSchema);

async function fixData() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // 1. Update Game Price
        const game = await Game.findOne({ folder_name: 'spludbuster' });
        if (game) {
            console.log(`Updating price for ${game.game_name} from ${game.price} to 5`);
            await Game.updateOne({ _id: game._id }, { $set: { price: 5 } });
        } else {
            console.log('Game spludbuster not found');
        }

        // 2. Remove Ownership
        const result = await Ownership.deleteMany({ game_id: game._id });
        console.log(`Deleted ${result.deletedCount} ownership records for spludbuster`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

fixData();
