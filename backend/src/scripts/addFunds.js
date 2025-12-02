const mongoose = require('mongoose');
require('../features/users/user.model'); // Register the model
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const User = mongoose.model('User'); // Retrieve the model
    const username = process.argv[2];
    const amount = parseFloat(process.argv[3]);

    if (!username || isNaN(amount)) {
        console.log('Usage: node src/scripts/addFunds.js <username> <amount>');
        process.exit(1);
    }

    try {
        const user = await User.findOne({ username });
        if (!user) {
            console.error(`User ${username} not found`);
            process.exit(1);
        }

        if (!user.balances) user.balances = { chf: 0 };
        user.balances.chf = (user.balances.chf || 0) + amount;

        await user.save();
        console.log(`✅ Added ${amount} CHF to ${username}. New balance: ${user.balances.chf}`);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
});
