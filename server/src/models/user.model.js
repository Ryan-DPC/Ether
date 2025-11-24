const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 20 },
        email: { type: String, required: true, unique: true, trim: true, lowercase: true },
        password: { type: String, required: true },
        profile_pic: { type: String, default: '/assets/images/default-game.png' },
        tokens: { type: Number, default: 0 },
        elo: { type: Number, default: 1000 },
        socketId: { type: String, default: null },
        created_at: { type: Date, default: Date.now },
    },
    { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Méthodes statiques simplifiées pour le WebSocket server
userSchema.statics.saveSocketId = async function (socketId, username) {
    return this.updateOne({ username }, { $set: { socketId } });
};

userSchema.statics.getUserBySocketId = async function (socketId) {
    return this.findOne({ socketId }).select('username email profile_pic elo tokens');
};

userSchema.statics.removeSocketId = async function (socketId) {
    return this.updateOne({ socketId }, { $set: { socketId: null } });
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
