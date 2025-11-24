const mongoose = require('mongoose');
require('dotenv').config();
const Items = require('./src/features/items/items.model');

console.log('Starting script...');
console.log('URI:', process.env.MONGODB_URI ? 'Found' : 'Missing');

async function checkItems() {
    try {
        console.log('Connecting...');
        await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
        console.log('Connected to MongoDB');

        const items = await Items.find({}).lean();
        console.log(`Found ${items.length} items in MongoDB:`);
        items.forEach(item => {
            console.log(`- ID: ${item._id}`);
            console.log(`  Name: ${item.name}`);
            console.log(`  Desc: ${item.description}`);
            console.log(`  Price: ${item.price}`);
            console.log(`  Image: ${item.image_url}`);
            console.log(`  Cloudinary ID: ${item.cloudinary_id}`);
            console.log('---');
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected');
        process.exit(0);
    }
}

checkItems();
