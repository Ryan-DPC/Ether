const Ajv = require("ajv");
const ajv = new Ajv();
const schema = require("../schemas/chat.schema");
const validate = ajv.compile(schema);
// const MessageModel = require('../models/chat.model'); // Keep existing model import if needed

class ChatHandler {
    constructor(io, socket) {
        this.io = io;
        this.socket = socket;
        this.userId = socket.userId;
        this.init();
    }

    init() {
        // New spec event
        this.socket.on('chat:send', this.handleSend.bind(this));

        // Legacy support (optional, can remove if we want strict adherence to new spec only)
        // this.socket.on('chat:send-message', this.handleSendMessageLegacy.bind(this));
    }

    async handleSend(payload) {
        if (!validate(payload)) {
            return this.socket.emit("error", {
                code: "INVALID_PAYLOAD",
                message: "Invalid chat:send payload",
                errors: validate.errors
            });
        }

        const { recipientId, content } = payload;
        const senderId = this.userId;

        console.log(`[chat.handler] Message from ${senderId} to ${recipientId}:`, content);

        // In a real app, save to DB here.
        // const message = await MessageModel.create({ ... });

        const message = {
            id: Date.now().toString(), // Mock ID
            content,
            senderId,
            timestamp: new Date().toISOString()
        };

        // Emit to recipient's room (using Redis adapter via io.to)
        this.io.to(`user:${recipientId}`).emit("chat:message-received", { message });

        // Optional: Ack to sender
        // this.socket.emit("chat:message-sent", { success: true, message });
    }
}

module.exports = (io, socket) => {
    new ChatHandler(io, socket);
};
