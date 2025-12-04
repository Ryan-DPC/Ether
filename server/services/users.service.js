const Users = require('../models/user.model');

class UsersService {
    static async saveSocketId(userId, socketId) {
        try {
            // Update socketId for the user identified by userId
            await Users.saveSocketId(userId, socketId);
        } catch (error) {
            console.error('Erreur dans UserService.saveSocketId :', error);
            throw error;
        }
    }

    static async getUserBySocketId(socketId) {
        try {
            return await Users.getUserBySocketId(socketId);
        } catch (error) {
            console.error('Erreur dans UserService.getUserBySocketId :', error);
            throw error;
        }
    }

    static async removeSocketId(socketId) {
        try {
            await Users.removeSocketId(socketId);
        } catch (error) {
            console.error('Erreur dans UserService.removeSocketId :', error);
            throw error;
        }
    }
}

module.exports = UsersService;
