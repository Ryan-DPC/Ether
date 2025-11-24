const Users = require('../models/user.model');

module.exports = (io, socket) => {
    // User joins (set status) 
    socket.on('user:status-update', async (data) => {
        try {
            const { status, lobbyId } = data;
            const userId = socket.userId; // Assuming set during auth

            if (!userId) return;

            // Broadcast status change to all friends
            socket.broadcast.emit('friend:status-changed', {
                userId,
                status,
                lobbyId
            });

            console.log(`[Socket] User ${userId} status: ${status}${lobbyId ? ` (lobby: ${lobbyId})` : ''}`);
        } catch (error) {
            console.error('[Socket] Error updating status:', error);
        }
    });

    // Friend request sent notification
    socket.on('friend:request-sent', (data) => {
        const { toUserId } = data;
        io.to(toUserId).emit('friend:request-received');
    });

    // Friend request accepted notification
    socket.on('friend:request-accepted-notification', (data) => {
        const { toUserId } = data;
        io.to(toUserId).emit('friend:request-accepted');
    });
};
