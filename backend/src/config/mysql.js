const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const sequelize = new Sequelize(
    process.env.MYSQL_DATABASE || 'ether_finance',
    process.env.MYSQL_USER || 'root',
    process.env.MYSQL_PASSWORD || '',
    {
        host: process.env.MYSQL_HOST || 'localhost',
        dialect: 'mysql',
        logging: false, // Set to console.log to see SQL queries
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
);

const connectMySQL = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ MySQL Connection established successfully.');

        // Return the connection
        return sequelize;
    } catch (error) {
        console.error('❌ Unable to connect to MySQL:', error);
        // We might not want to crash the whole server if MySQL allows optional features
        // but for financial core features, it's typically critical.
        // process.exit(1); 
    }
};

module.exports = { sequelize, connectMySQL };
