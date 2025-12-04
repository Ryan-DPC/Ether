const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/user.model');
const connectDB = require('../config/db');

const addFunds = async () => {
    try {
        await connectDB();


        console.log('Connected to DB');

        const usernames = ['test#test', 'Ryan#Test'];
        const amount = 100;

        for (const username of usernames) {
            const user = await User.findOne({ username });
            if (user) {
                user.balances.chf += amount;
                await user.save();
                console.log(`Added ${amount} CHF to ${username}. New balance: ${user.balances.chf}`);
            } else {
                console.log(`User ${username} not found`);
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('Error adding funds:', error);
        process.exit(1);
    }
};

addFunds();
