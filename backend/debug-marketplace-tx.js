const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

// Models
const marketplaceSchema = new mongoose.Schema({}, { strict: false });
const MarketplaceListing = mongoose.model('MarketplaceListing', marketplaceSchema);

const blockchainTxSchema = new mongoose.Schema({}, { strict: false });
const BlockchainTx = mongoose.model('BlockchainTransaction', blockchainTxSchema);

const gameSchema = new mongoose.Schema({}, { strict: false });
const Game = mongoose.model('Game', gameSchema);

async function debugMarketplaceAndTx() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // 1. Check Marketplace Listings for RyanDPC
        // We need user ID first, but let's assume we can find by seller_id if we knew it.
        // Instead, let's list ALL listings and see if we can spot the ghost.
        const listings = await MarketplaceListing.find({});
        console.log(`Found ${listings.length} marketplace listings:`);
        listings.forEach(l => {
            console.log({
                _id: l._id,
                seller_id: l.seller_id,
                game_id: l.game_id,
                asking_price: l.asking_price,
                status: l.status
            });
        });

        // 2. Check Blockchain Transactions
        const txs = await BlockchainTx.find({});
        console.log(`Found ${txs.length} blockchain transactions:`);
        for (const tx of txs) {
            console.log({
                _id: tx._id,
                transaction_type: tx.transaction_type,
                game_id: tx.game_id, // Check field name
                gameId: tx.gameId,   // Check field name
                amount: tx.amount
            });

            if (tx.game_id) {
                const game = await Game.findById(tx.game_id);
                console.log(`   -> Linked Game (game_id): ${game ? game.game_name : 'NULL'}`);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

debugMarketplaceAndTx();
