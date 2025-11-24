const cors = require('cors');

module.exports = cors({
    origin: '*', // Configure as needed
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
});
