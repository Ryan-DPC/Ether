require('dotenv').config();
const http = require('http');
const app = require('./app');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Connect to central WebSocket server (handled separately)
const { connectToCentralServer } = require('./socket/socket.server');
connectToCentralServer();

const logger = require('./utils/logger');

// ...

server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    logger.error(`Error: ${err.message}`);
    // Close server & exit process
    // server.close(() => process.exit(1));
});
