const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
require('../models/user.model');
const User = mongoose.model('User');
const connectDB = require('../config/db');

const addFunds = async () => {
    try {
        await connectDB();


        console.log('Connected to DB');

        const amount = 100;
        const users = await User.find({});

        console.log(`Found ${users.length} users to update.`);

        for (const user of users) {
            if (!user.balances) {
                user.balances = { chf: 0 };
            }
            if (user.balances.chf === undefined) {
                user.balances.chf = 0;
            }

            user.balances.chf += amount;
            await user.save();
            console.log(`Added ${amount} CHF to ${user.username}. New balance: ${user.balances.chf}`);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error adding funds:', error);
        process.exit(1);
    }
};

addFunds();
