const LobbyService = require('../services/lobby.service');

module.exports = (io, socket) => {
    // Créer un nouveau lobby
    socket.on('createGame', () => {
        if (!socket.data.name) {
            socket.emit('error', { message: 'You must set your name before creating a game.' });
            return;
        }

        const code = LobbyService.createLobby(socket.id);
        socket.join(code);
        console.log(`Game created by ${socket.data.name} with code: ${code}`);
        // Note: Les jeux sont maintenant dans /games/ - adapter l'URL selon le type de jeu
        socket.emit('gameCreated', { code, creator: socket.data.name, url: `/games/chessmulti/${code}` });
    });

    // Rejoindre un lobby
    socket.on('joinGame', (code) => {
        if (!socket.data.name) {
            socket.emit('error', { message: 'You must set your name before joining a game.' });
            return;
        }

        const success = LobbyService.joinLobby(code, socket.id);
        if (success) {
            socket.join(code);
            let players = LobbyService.getPlayers(code);
            console.log(`Players in lobby ${code}:`, players);

            const playerNames = players.map(id => io.sockets.sockets.get(id)?.data.name || `Player_${id}`);
            io.to(code).emit('playerJoined', { code, player: socket.data.name, players: playerNames });
        } else {
            socket.emit('error', { message: 'Lobby is full or does not exist.' });
        }
    });

    socket.on('joinLobby', ({ lobbyId }) => {
        console.log(`Socket ${socket.id} is trying to join lobby ${lobbyId}`);

        const success = LobbyService.joinLobby(lobbyId, socket.id);
        if (success) {
            socket.join(lobbyId);
            const players = LobbyService.getPlayers(lobbyId);
            console.log(`Players in lobby ${lobbyId}:`, players);

            io.to(lobbyId).emit('playerList', players);
        } else {
            socket.emit('error', { message: 'Failed to join lobby. Lobby not found.' });
        }
    });

    // Quitter un lobby
    socket.on('leaveGame', (code) => {
        const lobby = LobbyService.leaveLobby(socket.id);
        socket.leave(code);
        console.log(`${socket.data.name} left game ${code}`);

        if (lobby) {
            let players = LobbyService.getPlayers(code);
            const playerNames = players.map(id => io.sockets.sockets.get(id)?.data.name || `Player_${id}`);
            io.to(code).emit('playerLeft', { code, player: socket.data.name, players: playerNames });
        }
    });

    // Obtenir la liste des joueurs d'un lobby
    socket.on('requestPlayerList', (code) => {
        let players = LobbyService.getPlayers(code);
        if (!Array.isArray(players)) players = [];
        const playerNames = players.map(id => io.sockets.sockets.get(id)?.data.name || `Player_${id}`);
        socket.emit('playerList', playerNames);
    });

    // Lobby invite
    socket.on('lobby:invite', ({ friendId, lobbyId }) => {
        console.log(`[Socket] Lobby invite from ${socket.id} to friend ${friendId} for lobby ${lobbyId}`);
        // Send invite to friend
        io.to(friendId).emit('lobby:invite', {
            lobbyId,
            fromUserId: socket.id,
            fromUsername: socket.data.name || 'Unknown'
        });
    });

    // Déconnexion (nettoyage lobby)
    socket.on('disconnect', () => {
        const lobby = LobbyService.leaveLobby(socket.id);
        if (lobby) {
            let players = LobbyService.getPlayers(lobby);
            const playerNames = players.map(id => io.sockets.sockets.get(id)?.data.name || `Player_${id}`);
            io.to(lobby).emit('playerLeft', { message: `${socket.data.name || 'A player'} has left the game.`, players: playerNames });
        }
    });
};
