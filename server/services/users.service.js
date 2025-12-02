const Users = require('../models/user.model');

class UsersService {
    static async saveSocketId(socketId, username) {
        try {
            // Trouver l'utilisateur par username et mettre à jour son socketId
            // Note: Le modèle a une méthode statique saveSocketId qui attend (socketId, username)
            // Mais ici on passe (socketId, username) -> wait, le modèle attend (socketId, username) ?
            // Vérifions le modèle: userSchema.statics.saveSocketId = async function (socketId, username) { return this.updateOne({ username }, { $set: { socketId } }); };
            // C'est correct.
            await Users.saveSocketId(socketId, username);
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
