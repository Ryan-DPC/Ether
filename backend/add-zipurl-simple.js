require('dotenv').config();
const mongoose = require('mongoose');

async function addZipUrl() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected');

        // Get the games collection directly
        const db = mongoose.connection.db;
        const gamesCollection = db.collection('games');

        // Find and update the game with correct Cloudinary URL
        const result = await gamesCollection.findOneAndUpdate(
            { folder_name: 'spludbuster' },
            {
                $set: {
                    zipUrl: 'https://res.cloudinary.com/dp2ehihtw/raw/upload/games/dev/spludbuster/spludbuster.zip',
                    manifestVersion: '1.0.0'
                }
            },
            { returnDocument: 'after' }
        );

        if (result) {
            console.log('✅ Updated game:', result.game_name);
            console.log('   zipUrl:', result.zipUrl);
            console.log('   manifestVersion:', result.manifestVersion);
        } else {
            console.log('❌ Game not found');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected');
        process.exit(0);
    }
}

addZipUrl();
