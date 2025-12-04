require('dotenv').config();
const { Server } = require('socket.io');
const { createClient } = require('redis');
const connectDB = require('./config/db');
const socketHandlers = require('./socket.handlers');
const authMiddleware = require('./middleware/auth.middleware');
const UsersService = require('./services/users.service');

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
const { createAdapter } = require('@socket.io/redis-adapter');

// Redis Client
const redisClient = createClient({
    url: process.env.REDIS_PRIVATE_URL || process.env.REDIS_URL || 'redis://:J3SuisEmanais2Reglets762@@containers-us-west-123.railway.app:6379',
    socket: {
        reconnectStrategy: false // Fail fast for testing if not available
    }
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

(async () => {
    try {
        await redisClient.connect();
        // Create subClient for adapter
        const subClient = redisClient.duplicate();
        await subClient.connect();
        io.adapter(createAdapter(redisClient, subClient));
        console.log('✅ Redis adapter initialized');
    } catch (err) {
        console.warn('⚠️ Redis connection failed, falling back to in-memory adapter:', err.message);
    }
})();

// Initialize Version Checker Job
const VersionCheckerJob = require('./jobs/version-checker.job');
const versionChecker = new VersionCheckerJob(io);
versionChecker.start();
console.log('🔄 Version checker job initialized');

// Rate Limiter Map
const rateLimiter = new Map();

io.on('connection', (socket) => {
    console.log(`\n🔌 [${new Date().toISOString()}] Client connected: ${socket.id} (${socket.username})`);
    console.log(`📊 Total clients: ${io.engine.clientsCount}`);

    // Anti-flood / Rate Limiting
    socket.use((packet, next) => {
        const now = Date.now();
        const lastRequest = rateLimiter.get(socket.id) || 0;
        // console.log(`[RateLimit] ${socket.id} diff: ${now - lastRequest}ms`);
        if (now - lastRequest < 100) { // 10 requests per second max
            // console.log(`[RateLimit] Triggered for ${socket.id}`);
            socket.emit('error', { message: "Rate limit exceeded" });
            return next(new Error("Rate limit exceeded"));
        }
        rateLimiter.set(socket.id, now);
        next();
    });

    if (socket.userId) {
        socket.join(`user:${socket.userId}`);

        // Save socket ID to DB
        UsersService.saveSocketId(socket.userId, socket.id)
            .then(() => console.log(`✅ Socket ID saved for user ${socket.username}`))
            .catch(err => console.error(`❌ Failed to save socket ID for user ${socket.username}:`, err));

        // Mock Friends Logic for Status Updates (Connection)
        const mockFriends = {
            "user1": ["user2"],
            "user2": ["user1"]
        };
        const friends = mockFriends[socket.userId] || [];
        friends.forEach(friendId => {
            io.to(`user:${friendId}`).emit("friend:status-changed", {
                userId: socket.userId,
                status: "online"
            });
        });

        socket.on('disconnect', () => {
            rateLimiter.delete(socket.id);
            // Remove socket ID from DB
            UsersService.removeSocketId(socket.id)
                .then(() => console.log(`✅ Socket ID removed for user ${socket.username}`))
                .catch(err => console.error(`❌ Failed to remove socket ID for user ${socket.username}:`, err));

            friends.forEach(friendId => {
                io.to(`user:${friendId}`).emit("friend:status-changed", {
                    userId: socket.userId,
                    status: "offline"
                });
            });
            console.log(`\n❌ [${new Date().toISOString()}] Client disconnected: ${socket.id}`);
            console.log(`📊 Total clients: ${io.engine.clientsCount}`);
        });
    }

    // Initialize handlers
    socketHandlers(io, socket);

    socket.onAny((eventName, ...args) => {
        console.log(`📡 Event received: ${eventName}`, args.length > 0 ? args[0] : '');
    });
});
