const jwt = require('jsonwebtoken');
const config = require('../../config/env');
const { logger } = require('../../utils/logger');

/**
 * Socket.IO authentication middleware
 */
const socketAuth = async (socket, next) => {
    try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

        if (!token) {
            return next(new Error('Authentication error: No token provided'));
        }

        // Verify token
        const decoded = jwt.verify(token, config.JWT_SECRET);

        // Get user from Supabase
        const { data: userRaw, error } = await require('../../config/supabase')
            .from('users')
            .select('*')
            .eq('id', decoded.id)
            .single();

        if (error || !userRaw) {
            return next(new Error('Authentication error: User not found'));
        }

        const user = {
            _id: userRaw.id,
            id: userRaw.id,
            username: userRaw.username,
            email: userRaw.email,
            role: userRaw.role,
            isActive: userRaw.is_active,
            isVerified: userRaw.is_verified,
            referralCode: userRaw.referral_code
        };

        if (!user.isActive) {
            return next(new Error('Authentication error: Account deactivated'));
        }

        // Attach user to socket
        socket.user = user;
        socket.userId = user._id.toString();

        logger.info(`Socket authenticated: ${user.username} (${socket.id})`);

        next();
    } catch (error) {
        logger.error('Socket authentication error:', error.message);
        next(new Error('Authentication error: Invalid token'));
    }
};

/**
 * Validate user session in socket events
 */
const validateSocketUser = (socket) => {
    if (!socket.user || !socket.userId) {
        throw new Error('User session not found');
    }
    return socket.user;
};

module.exports = {
    socketAuth,
    validateSocketUser,
};
