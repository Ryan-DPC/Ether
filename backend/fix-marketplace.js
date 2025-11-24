const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

// Models
const marketplaceSchema = new mongoose.Schema({}, { strict: false });
const MarketplaceListing = mongoose.model('MarketplaceListing', marketplaceSchema);

const blockchainTxSchema = new mongoose.Schema({}, { strict: false });
const BlockchainTx = mongoose.model('BlockchainTransaction', blockchainTxSchema);

const gameSchema = new mongoose.Schema({}, { strict: false });
const Game = mongoose.model('Game', gameSchema);

async function fixMarketplace() {
    try {
        await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
        console.log('Connected to MongoDB');

        const user = await mongoose.connection.db.collection('users').findOne({ username: 'RyanDPC' });
        if (!user) { console.log('User not found'); return; }

        // 1. Delete Listings
        const deleteResult = await MarketplaceListing.deleteMany({ seller_id: user._id });
        console.log(`Deleted ${deleteResult.deletedCount} marketplace listings for user.`);

        // 2. Fix Transactions
        const game = await Game.findOne({ folder_name: 'spludbuster' });
        if (game) {
            // Find transactions with amount 5 and missing game_id
            // We look for transactions where game_id is missing or null
            const txs = await BlockchainTx.find({
                $or: [{ from_address: `user_${user._id}` }, { to_address: `user_${user._id}` }],
                amount: 5,
                game_id: null
            });

            console.log(`Found ${txs.length} transactions to fix.`);

            for (const tx of txs) {
                await BlockchainTx.updateOne({ _id: tx._id }, { $set: { game_id: game._id } });
                console.log(`Updated transaction ${tx._id} with game_id ${game._id}`);
            }
        } else {
            console.log('Game spludbuster not found');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

fixMarketplace();
