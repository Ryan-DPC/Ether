const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    console.log('📦 Connected to MongoDB');

    const GameOwnership = mongoose.connection.db.collection('gameownerships');

    // Delete the item with this ownership_token
    const token = 'dddb62b110e08541a6276af86a9d6db3';

    const result = await GameOwnership.deleteOne({ ownership_token: token });

    if (result.deletedCount > 0) {
        console.log(`✅ Successfully deleted item with token: ${token}`);
    } else {
        console.log(`⚠️ No item found with token: ${token}`);
    }

    process.exit(0);
}).catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
