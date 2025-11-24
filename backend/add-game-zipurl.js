require('dotenv').config();
const mongoose = require('mongoose');

// Define Game schema inline
const gameSchema = new mongoose.Schema({
    folder_name: String,
    game_name: String,
    zipUrl: String,
    manifestVersion: String
});

const Game = mongoose.model('Game', gameSchema);

async function addZipUrl() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Find the game by folder_name
        const game = await Game.findOne({ folder_name: 'spludbuster' });

        if (!game) {
            console.log('❌ Game "spludbuster" not found');
            process.exit(1);
        }

        console.log(`Found game: ${game.game_name}`);

        // Update with a Cloudinary URL for the game ZIP
        // NOTE: This is a placeholder URL - you'll need to upload your actual game ZIP to Cloudinary
        // and replace this with the real URL
        const zipUrl = 'https://res.cloudinary.com/dp2ehihtw/raw/upload/v1/games/dev/spludbuster/game.zip';

        game.zipUrl = zipUrl;
        game.manifestVersion = '1.0.0'; // Set initial version
        await game.save();

        console.log('✅ Updated game with zipUrl:', zipUrl);
        console.log('✅ Set manifestVersion to: 1.0.0');

        console.log('\n⚠️  IMPORTANT: This is a placeholder URL!');
        console.log('You need to:');
        console.log('1. Create a ZIP file of your game (spludbuster)');
        console.log('2. Upload it to Cloudinary');
        console.log('3. Update the zipUrl in the database with the real Cloudinary URL');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

addZipUrl();
