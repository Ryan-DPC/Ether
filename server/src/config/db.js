const mongoose = require('mongoose');

async function connectDB() {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/ether';

    try {
        mongoose.set('strictQuery', true);
        await mongoose.connect(uri, {
            autoIndex: true,
            serverSelectionTimeoutMS: 10000,
            maxPoolSize: 10,
        });
        console.log('MongoDB Connected (WebSocket Server)');
    } catch (err) {
        console.error('MongoDB Connection Error:', err);
        process.exit(1);
    }
}

module.exports = connectDB;
