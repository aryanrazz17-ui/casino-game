const { logger } = require('./logger');

/**
 * Emit a wallet update event to all connections of a specific user
 * @param {Object} io Socket.IO instance
 * @param {string} userId User ID
 * @param {Object} data Update data { currency, balance, type, amount }
 */
exports.emitWalletUpdate = (io, userId, data) => {
    if (!io) return;

    // We emit to the global namespace room for the user
    // Note: The user might be connected to multiple namespaces
    // To reach them everywhere, we'd need to emit to each namespace's room
    // or have the client listen to a specific namespace for wallet updates.

    // For now, emit to default namespace which is usually where global rooms are
    io.to(`user:${userId}`).emit('wallet_update', {
        ...data,
        timestamp: Date.now()
    });

    // Also try to emit to specific game namespaces if needed, 
    // but the global room should be enough if the client is connected to /
};
