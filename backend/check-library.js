const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: './.env' });

// Mock Models
const ownershipSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    game_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Game' },
    status: String,
    purchase_date: Date,
    game_type: String,
    installed: Boolean
}, { strict: false });
const Ownership = mongoose.model('GameOwnership', ownershipSchema);

const gameSchema = new mongoose.Schema({}, { strict: false });
const Game = mongoose.model('Game', gameSchema);

async function checkLibrary() {
    try {
        await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
        console.log('Connected to MongoDB');

        const user = await mongoose.connection.db.collection('users').findOne({ username: 'RyanDPC' });
        if (!user) {
            console.log('User not found');
            return;
        }
        console.log('User ID:', user._id);

        // Raw query first
        const rawCount = await Ownership.countDocuments({ user_id: user._id, status: 'owned' });
        console.log(`Raw count of owned games: ${rawCount}`);

        // Simulate getUserOwnedGames query
        const rows = await Ownership.find({ user_id: user._id, status: 'owned' })
            .sort({ purchase_date: -1 })
            .populate('game_id') // Simple populate first
            .lean();

        console.log(`Query returned ${rows.length} rows`);

        if (rows.length > 0) {
            console.log('First row game_id:', rows[0].game_id);
        }

        const results = rows.map(r => {
            let gameType = r.game_type || 'web';
            const folderName = r.game_id?.folder_name;

            // Simulate the file check (simplified)
            if (folderName) {
                console.log(`Checking manifest for ${folderName}...`);
                // We can't easily replicate the __dirname path here without exact structure, 
                // but we can see if the rest of the mapping works.
            }

            return {
                id: r._id,
                game_name: r.game_id?.game_name || r.game_name,
                folder_name: r.game_id?.folder_name,
                status: r.status,
                installed: r.installed
            };
        });

        console.log('Mapped Results:', results);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkLibrary();
