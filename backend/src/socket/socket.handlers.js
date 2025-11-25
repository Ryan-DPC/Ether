const userHandler = require('./handlers/user.handler');
const lobbyHandler = require('./handlers/lobby.handler');
const friendsHandler = require('./handlers/friends.handler');
const stickArenaHandler = require('../features/stick-arena/stick-arena.socket');

module.exports = (io, socket) => {
    // Register handlers
    userHandler(io, socket);
    lobbyHandler(io, socket);
    friendsHandler(io, socket);
    stickArenaHandler(io, socket);

    // Add other handlers here (e.g. chat, game specific events)
};
