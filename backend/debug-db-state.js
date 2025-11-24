const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

// Models
const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema);

const gameSchema = new mongoose.Schema({}, { strict: false });
const Game = mongoose.model('Game', gameSchema);

const ownershipSchema = new mongoose.Schema({}, { strict: false });
const Ownership = mongoose.model('GameOwnership', ownershipSchema);

async function debugState() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // 1. Find User
        const user = await User.findOne({ username: 'RyanDPC' });
        if (!user) {
            console.log('User RyanDPC not found');
            return;
        }
        console.log('User found:', {
            _id: user._id,
            username: user.username,
            balances: user.balances
        });

        // 2. Find Game
        const games = await Game.find({ folder_name: 'spludbuster' });
        console.log(`Found ${games.length} games with folder_name "spludbuster":`);
        games.forEach(g => {
            console.log({
                _id: g._id,
                game_name: g.game_name,
                folder_name: g.folder_name,
                price: g.price
            });
        });

        if (games.length === 0) {
            console.log('No game found with folder_name "spludbuster"');
        }

        // 3. Find Ownership
        const ownerships = await Ownership.find({ user_id: user._id });
        console.log(`Found ${ownerships.length} ownerships for user:`);

        for (const o of ownerships) {
            console.log({
                _id: o._id,
                game_id: o.game_id,
                game_key: o.game_key,
                status: o.status,
                purchase_price: o.purchase_price,
                game_type: o.game_type
            });

            // Check if game_id refers to an existing game
            if (o.game_id) {
                const linkedGame = await Game.findById(o.game_id);
                console.log(`   -> Linked Game: ${linkedGame ? linkedGame.game_name : 'NULL (Orphaned)'}`);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

debugState();
