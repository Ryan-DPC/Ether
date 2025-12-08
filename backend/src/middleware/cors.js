const cors = require('cors');

module.exports = cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173', // Whitelist production frontend
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'X-Requested-With', 'Accept', 'Origin']
});
