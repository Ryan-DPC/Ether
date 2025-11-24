const express = require('express');
const connectDB = require('./config/db');
const { connectRedis } = require('./config/redis');
const CronService = require('./services/cron.service');
const DefaultImageService = require('./services/defaultImage.service');

// Middleware imports
const helmetMiddleware = require('./middleware/helmet');
const corsMiddleware = require('./middleware/cors');
const { generalLimiter, authLimiter } = require('./middleware/rateLimit');
const sanitizerMiddleware = require('./middleware/sanitizer');
const xssCleanMiddleware = require('./middleware/xssClean');
const errorHandler = require('./utils/errorHandler');

// Route imports
const authRoutes = require('./features/auth/auth.routes');
const usersRoutes = require('./features/users/users.routes');
const gamesRoutes = require('./features/games/games.routes');
const libraryRoutes = require('./features/library/library.routes');
const friendsRoutes = require('./features/friends/friends.routes');
const chatRoutes = require('./features/chat/chat.routes');
const lobbyRoutes = require('./features/lobby/lobby.routes');
const itemsRoutes = require('./features/items/items.routes');
const adminRoutes = require('./features/admin/admin.routes');
const devGamesRoutes = require('./features/dev-games/dev-games.routes');
const gameCategoriesRoutes = require('./features/game-categories/game-categories.routes');
const gameOwnershipRoutes = require('./features/game-ownership/game-ownership.routes');
const installationRoutes = require('./features/installation/installation.routes');

const app = express();

// Connect to Database
connectDB();

// Connect to Redis
connectRedis();

// Ensure default game image exists on Cloudinary
DefaultImageService.ensureDefaultImage();

// Start Cron Jobs
const cronService = new CronService();
cronService.start();

// Start Game Sync Scheduler
const gameSyncScheduler = require('./schedulers/gameSyncScheduler');
gameSyncScheduler.start();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(generalLimiter);
app.use(sanitizerMiddleware);
app.use(xssCleanMiddleware);

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/lobby', lobbyRoutes);
app.use('/api/items', itemsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dev-games', devGamesRoutes);
app.use('/api/game-categories', gameCategoriesRoutes);
app.use('/api/game-ownership', gameOwnershipRoutes);
app.use('/api/installation', installationRoutes);

// Health Check
app.get('/api/ping', (req, res) => {
    res.status(200).json({ success: true, message: 'pong' });
});

// Error Handler
app.use(errorHandler);

module.exports = app;
