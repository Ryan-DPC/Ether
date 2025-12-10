const { sequelize } = require('../../config/database');
const Transaction = require('./transaction.model');
const Invoice = require('./invoice.model');
const Users = require('../users/user.model'); // MongoDB User Model to sync balance
const { v4: uuidv4 } = require('uuid');

class FinanceService {
    /**
     * Get user transactions history
     */
    static async getTransactionHistory(userId) {
        return await Transaction.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']]
        });
    }

    /**
     * Process a Deposit
     * @param {string} userId - MongoDB User ID
     * @param {number} amount - Amount to deposit (positive)
     * @param {string} currency - 'CHF', 'EUR', etc.
     * @param {string} method - 'STRIPE', 'PAYPAL' (Payment Method)
     */
    static async deposit(userId, amount, currency, method = 'CREDIT_CARD') {
        const t = await sequelize.transaction();

        try {
            // 1. Create Transaction Record in MySQL
            const transaction = await Transaction.create({
                userId,
                amount,
                currency,
                type: 'DEPOSIT',
                status: 'COMPLETED', // Auto-complete for now (mock)
                description: `Deposit via ${method}`,
                referenceId: uuidv4(), // Mock payment gateway ID
                metadata: { method }
            }, { transaction: t });

            // 2. Create Invoice Record
            await Invoice.create({
                userId,
                transactionId: transaction.id,
                invoiceNumber: `INV-${Date.now()}`,
                amount,
                currency,
                billingDetails: { method }
            }, { transaction: t });

            // 3. Update User Balance in MongoDB (Source of Truth for Frontend)
            // We do this *outside* the SQL transaction, or if it fails we roll back SQL.
            // But since Mongo doesn't share the transaction, we do it last.
            await Users.incrementBalance(userId, currency, amount);

            await t.commit();
            return transaction;

        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    /**
     * Process a Withdrawal
     */
    static async withdraw(userId, amount, currency, method = 'BANK_TRANSFER') {
        const t = await sequelize.transaction();

        try {
            // 1. Check User Balance in MongoDB
            const user = await Users.getUserById(userId);
            const currentBalance = user.balances[currency.toLowerCase()] || 0;

            if (currentBalance < amount) {
                throw new Error('Insufficient funds');
            }

            // 2. Create Transaction Record (Pending until admin approves or auto-processed)
            const transaction = await Transaction.create({
                userId,
                amount: -amount, // Negative for withdrawal in logic if we want, or keep positive and use Type
                currency,
                type: 'WITHDRAWAL',
                status: 'COMPLETED', // Auto-complete for mock
                description: `Withdrawal to ${method}`,
                metadata: { method }
            }, { transaction: t });

            // 3. Create Invoice
            await Invoice.create({
                userId,
                transactionId: transaction.id,
                invoiceNumber: `INV-${Date.now()}`,
                amount: amount, // Invoice shows absolute amount
                currency
            }, { transaction: t });

            // 4. Deduct Balance in MongoDB
            await Users.decrementBalance(userId, currency, amount);

            await t.commit();
            return transaction;

        } catch (error) {
            await t.rollback();
            throw error;
        }
    }
}

module.exports = FinanceService;
