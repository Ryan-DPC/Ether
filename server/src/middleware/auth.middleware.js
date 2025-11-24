const jwt = require('jsonwebtoken');

module.exports = (socket, next) => {
    try {
        const token = socket.handshake.auth?.token;
        if (!token) {
            console.log('[auth.middleware] No token provided, proceeding anonymously');
            return next();
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-here');

        // Attach user info to socket
        socket.userId = decoded.userId || decoded.id;
        socket.username = decoded.username;

        console.log(`[auth.middleware] ✅ User authenticated: ${socket.userId} (${socket.username})`);

        next();
    } catch (error) {
        console.log('[auth.middleware] ❌ Authentication failed:', error.message);
        next(new Error('Authentication error: Invalid token'));
    }
};
