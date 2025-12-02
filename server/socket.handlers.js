const userHandler = require('./handlers/user.handler');
const friendsHandler = require('./handlers/friends.handler');
const lobbyHandler = require('./handlers/lobby.handler');
const chatHandler = require('./handlers/chat.handler');

module.exports = (io, socket) => {
    console.log(`[socket.handlers] Registering handlers for socket ${socket.id}`);

    userHandler(io, socket);
    friendsHandler(io, socket);
    lobbyHandler(io, socket);
    chatHandler(io, socket);

    console.log(`[socket.handlers] All handlers registered for user ${socket.userId}`);
};
