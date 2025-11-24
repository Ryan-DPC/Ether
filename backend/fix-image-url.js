const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

const gameSchema = new mongoose.Schema({}, { strict: false });
const Game = mongoose.model('Game', gameSchema);

async function fixImageUrl() {
    try {
        await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
        console.log('Connected to MongoDB');

        const result = await Game.updateOne(
            { folder_name: 'spludbuster' },
            {
                $set: {
                    image_url: 'https://res.cloudinary.com/dp2ehihtw/image/upload/games/dev/spludbuster/image.png'
                }
            }
        );

        console.log(`Updated ${result.modifiedCount} game(s)`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

fixImageUrl();
