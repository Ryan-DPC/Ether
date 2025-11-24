require('dotenv').config();
const { Server } = require('socket.io');
const { createClient } = require('redis');
const connectDB = require('./config/db');
const socketHandlers = require('./socket.handlers');
const authMiddleware = require('./middleware/auth.middleware');

const PORT = process.env.WS_PORT || 4000;

// Connect to Database
connectDB();

const io = new Server(PORT, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

console.log(`WebSocket server running on port ${PORT}`);

// Authentication middleware
io.use(authMiddleware);

// Redis Client
const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.on('connect', () => console.log('Redis Client Connected'));

(async () => {
    await redisClient.connect();
})();

// Initialize Version Checker Job
const VersionCheckerJob = require('./jobs/version-checker.job');
const versionChecker = new VersionCheckerJob(io);
versionChecker.start();
console.log('🔄 Version checker job initialized');

io.on('connection', (socket) => {
    console.log(`\n🔌 [${new Date().toISOString()}] Client connected: ${socket.id}`);
    console.log(`📊 Total clients: ${io.engine.clientsCount}`);

    // Initialize handlers
    socketHandlers(io, socket);

    socket.on('disconnect', (reason) => {
        console.log(`\n❌ [${new Date().toISOString()}] Client disconnected: ${socket.id}`);
        console.log(`📊 Reason: ${reason}`);
        console.log(`📊 Total clients: ${io.engine.clientsCount}`);
    });

    socket.onAny((eventName, ...args) => {
        console.log(`📡 Event received: ${eventName}`, args.length > 0 ? args[0] : '');
    });
});
