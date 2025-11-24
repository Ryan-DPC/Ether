const { Server } = require('socket.io');
const socketHandlers = require('./socket.handlers');

let io;

const initSocketServer = (server) => {
    io = new Server(server, {
        cors: {
            origin: '*', // À restreindre en production
            methods: ['GET', 'POST']
        }
    });

    console.log('WebSocket server initialized');

    io.on('connection', (socket) => {
        console.log(`Client connected: ${socket.id}`);

        // Initialiser les handlers pour ce socket
        socketHandlers(io, socket);

        socket.on('disconnect', () => {
            console.log(`Client disconnected: ${socket.id}`);
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

module.exports = { initSocketServer, getIO };
