const MessageModel = require('../models/chat.model');

class ChatHandler {
    constructor(io, socket) {
        this.io = io;
        this.socket = socket;
        this.userId = socket.userId; // Set by auth middleware
        this.init();
    }

    init() {
        console.log(`[chat.handler] Initializing for user ${this.userId}`);

        this.socket.on('chat:send-message', this.handleSendMessage.bind(this));
    }

    async handleSendMessage(data) {
        try {
            console.log(`[chat.handler] Message from ${this.userId} to ${data.toUserId}:`, data.content);

            const { toUserId, content } = data;

            // Find recipient's socket
            const sockets = await this.io.fetchSockets();
            const recipientSocket = sockets.find(s => s.userId === toUserId);

            if (recipientSocket) {
                console.log(`[chat.handler] Sending to recipient socket ${recipientSocket.id}`);
                recipientSocket.emit('chat:message-received', {
                    id: message._id.toString(),
                    from_user_id: this.userId,
                    to_user_id: toUserId,
                    content: message.content,
                    created_at: message.created_at,
                    is_from_me: false
                });
            } else {
                console.log(`[chat.handler] Recipient ${toUserId} not connected`);
            }

            // Confirm to sender
            this.socket.emit('chat:message-sent', {
                id: message._id.toString(),
                success: true
            });

        } catch (error) {
            console.error('[chat.handler] Error sending message:', error);
            this.socket.emit('chat:error', { message: error.message });
        }
    }
}

module.exports = (io, socket) => {
    new ChatHandler(io, socket);
};
