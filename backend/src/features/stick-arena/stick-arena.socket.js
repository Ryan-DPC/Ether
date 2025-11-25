// Stick Fighting Arena - Socket Handler
// Manages matchmaking, game rooms, and real-time game state synchronization

const StickArenaStatsService = require('./stick-arena-stats.service');

const rooms = new Map();
let waitingPlayers = new Map(); // playerId -> socket

class GameRoom {
    constructor(player1Socket, player2Socket, player1Id, player2Id) {
        this.id = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.player1 = {
            socket: player1Socket,
            id: player1Id,
            ready: false,
            score: 0
        };
        this.player2 = {
            socket: player2Socket,
            id: player2Id,
            ready: false,
            score: 0
        };
        this.gameState = {
            players: {},
            projectiles: [],
            powerups: [],
            roundActive: false
        };
        this.createdAt = Date.now();
    }

    broadcast(event, data) {
        this.player1.socket.emit(event, data);
        this.player2.socket.emit(event, data);
    }

    updatePlayerState(playerId, state) {
        this.gameState.players[playerId] = state;
        // Broadcast to both players
        this.broadcast('gameState', this.gameState);
    }

    getOpponent(socket) {
        return this.player1.socket === socket ? this.player2 : this.player1;
    }
}

const handleStickArena = (io, socket) => {
    console.log(`[Stick Arena] Player ${socket.id} connected to stick arena`);

    // Join stick arena namespace
    socket.on('stick-arena:join', (data) => {
        const userId = data.userId || socket.id;
        socket.userId = userId;
        console.log(`[Stick Arena] Player ${userId} joined stick arena`);
        socket.emit('stick-arena:joined', { userId });
    });

    // Matchmaking - Find opponent
    socket.on('stick-arena:findMatch', (data) => {
        const userId = data.userId || socket.id;
        console.log(`[Stick Arena] Player ${userId} looking for match`);

        // Check if player is already waiting
        if (waitingPlayers.has(userId)) {
            socket.emit('stick-arena:error', { message: 'Already in matchmaking queue' });
            return;
        }

        // Try to find a waiting player
        const waitingEntries = Array.from(waitingPlayers.entries());
        if (waitingEntries.length === 0) {
            // No one waiting, add this player to queue
            waitingPlayers.set(userId, socket);
            socket.emit('stick-arena:waiting', { message: 'Waiting for opponent...' });
            console.log(`[Stick Arena] Player ${userId} added to queue`);
        } else {
            // Match with first waiting player
            const [opponentId, opponentSocket] = waitingEntries[0];
            waitingPlayers.delete(opponentId);

            // Create game room
            const room = new GameRoom(opponentSocket, socket, opponentId, userId);
            rooms.set(room.id, room);

            // Join both players to the room
            opponentSocket.join(room.id);
            socket.join(room.id);

            // Notify both players
            opponentSocket.emit('stick-arena:matchFound', {
                roomId: room.id,
                playerId: 1,
                opponentId: userId,
                opponentSocket: socket.id
            });

            socket.emit('stick-arena:matchFound', {
                roomId: room.id,
                playerId: 2,
                opponentId: opponentId,
                opponentSocket: opponentSocket.id
            });

            console.log(`[Stick Arena] Match created: ${opponentId} vs ${userId} in room ${room.id}`);
        }
    });

    // Cancel matchmaking
    socket.on('stick-arena:cancelMatch', (data) => {
        const userId = data.userId || socket.id;
        waitingPlayers.delete(userId);
        console.log(`[Stick Arena] Player ${userId} cancelled matchmaking`);
    });

    // Player state update
    socket.on('stick-arena:playerUpdate', (data) => {
        const room = findRoomBySocket(socket);
        if (room) {
            room.updatePlayerState(data.playerId, data.state);
        }
    });

    // Shoot projectile
    socket.on('stick-arena:shoot', (data) => {
        const room = findRoomBySocket(socket);
        if (room) {
            room.gameState.projectiles.push(data.projectile);
            room.broadcast('stick-arena:projectileCreated', data.projectile);
        }
    });

    // Melee attack
    socket.on('stick-arena:melee', (data) => {
        const room = findRoomBySocket(socket);
        if (room) {
            room.broadcast('stick-arena:playerMelee', data);
        }
    });

    // Player damaged
    socket.on('stick-arena:playerDamaged', (data) => {
        const room = findRoomBySocket(socket);
        if (room) {
            room.broadcast('stick-arena:playerDamaged', data);
        }
    });

    // Power-up spawned
    socket.on('stick-arena:powerupSpawned', (data) => {
        const room = findRoomBySocket(socket);
        if (room) {
            room.gameState.powerups.push(data.powerup);
            room.broadcast('stick-arena:powerupSpawned', data.powerup);
        }
    });

    // Power-up collected
    socket.on('stick-arena:powerupCollected', (data) => {
        const room = findRoomBySocket(socket);
        if (room) {
            room.gameState.powerups = room.gameState.powerups.filter(p => p.id !== data.powerupId);
            room.broadcast('stick-arena:powerupCollected', data);
        }
    });

    // Chat message
    socket.on('stick-arena:chat', (data) => {
        const room = findRoomBySocket(socket);
        if (room) {
            room.broadcast('stick-arena:chat', {
                senderId: socket.userId || 'Anonymous',
                message: data.message,
                timestamp: Date.now()
            });
        }
    });

    // Round end
    socket.on('stick-arena:roundEnd', async (data) => {
        const room = findRoomBySocket(socket);
        if (room) {
            if (data.winnerId === 1) {
                room.player1.score++;
            } else if (data.winnerId === 2) {
                room.player2.score++;
            }

            room.broadcast('stick-arena:roundEnd', {
                winnerId: data.winnerId,
                scores: {
                    player1: room.player1.score,
                    player2: room.player2.score
                }
            });

            // Update stats if players are authenticated
            try {
                const winner = data.winnerId === 1 ? room.player1 : room.player2;
                const loser = data.winnerId === 1 ? room.player2 : room.player1;

                if (winner.userId && loser.userId) {
                    await StickArenaStatsService.recordMatch({
                        winnerId: winner.userId,
                        loserId: loser.userId,
                        winnerScore: winner.score,
                        loserScore: loser.score,
                        duration: (Date.now() - room.createdAt) / 1000,
                        winnerStats: {
                            kills: data.kills || 1,
                            deaths: data.deaths || 0,
                            damageDealt: data.damageDealt || 0,
                            damageTaken: data.damageTaken || 0,
                            powerupsCollected: data.powerupsCollected || 0,
                            weaponUsed: data.weaponUsed || 'SWORD'
                        },
                        loserStats: {
                            kills: 0,
                            deaths: 1,
                            damageDealt: 0, // Simplified for now
                            damageTaken: 100
                        }
                    });
                }
            } catch (error) {
                console.error('[Stick Arena] Error updating stats:', error.message);
            }
        }
    });

    // Match end (player quits or disconnects)
    socket.on('stick-arena:leaveMatch', () => {
        handlePlayerLeave(socket);
    });

    // Get match history
    socket.on('stick-arena:getMatchHistory', async (data) => {
        try {
            const userId = data.userId || socket.userId;
            if (userId) {
                const history = await StickArenaStatsService.getMatchHistory(userId);
                socket.emit('stick-arena:matchHistory', history);
            }
        } catch (error) {
            console.error('Error getting match history:', error);
        }
    });

    // Disconnect handler
    socket.on('disconnect', () => {
        console.log(`[Stick Arena] Player ${socket.id} disconnected`);

        // Remove from waiting queue
        const userId = socket.userId || socket.id;
        waitingPlayers.delete(userId);

        // Handle room cleanup
        handlePlayerLeave(socket);
    });
};

// Helper function to find room by socket
function findRoomBySocket(socket) {
    for (const room of rooms.values()) {
        if (room.player1.socket === socket || room.player2.socket === socket) {
            return room;
        }
    }
    return null;
}

// Helper function to handle player leaving
function handlePlayerLeave(socket) {
    const room = findRoomBySocket(socket);
    if (room) {
        const opponent = room.getOpponent(socket);
        opponent.socket.emit('stick-arena:opponentDisconnected', {
            message: 'Your opponent has disconnected'
        });

        // Leave the room
        socket.leave(room.id);
        opponent.socket.leave(room.id);

        // Delete the room
        rooms.delete(room.id);
        console.log(`[Stick Arena] Room ${room.id} closed`);
    }
}

module.exports = handleStickArena;
