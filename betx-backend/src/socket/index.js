const { socketAuth } = require('./middleware/socketAuth');
const { logger } = require('../utils/logger');

module.exports = (io) => {
    // Apply authentication middleware
    io.use(socketAuth);

    // Main connection handler
    io.on('connection', (socket) => {
        logger.info(`Client connected: ${socket.user.username} (${socket.id})`);

        // Join user to their personal room
        socket.join(`user:${socket.userId}`);

        // Handle disconnection
        socket.on('disconnect', (reason) => {
            logger.info(`Client disconnected: ${socket.user.username} (${socket.id}) - Reason: ${reason}`);
        });

        // Handle errors
        socket.on('error', (error) => {
            logger.error(`Socket error for ${socket.user.username}:`, error);
        });
    });

    // Game namespaces
    const diceNamespace = io.of('/dice');
    const crashNamespace = io.of('/crash');
    const minesNamespace = io.of('/mines');
    const plinkoNamespace = io.of('/plinko');
    const slotsNamespace = io.of('/slots');
    const coinflipNamespace = io.of('/coinflip');
    const wheelNamespace = io.of('/wheel');
    const chatNamespace = io.of('/chat');

    // Apply auth to all namespaces
    [diceNamespace, crashNamespace, minesNamespace, plinkoNamespace, slotsNamespace, coinflipNamespace, wheelNamespace, chatNamespace].forEach(
        (namespace) => {
            namespace.use(socketAuth);
        }
    );

    // Initialize game handlers
    require('./namespaces/dice')(diceNamespace);
    require('./namespaces/crash')(crashNamespace);
    require('./namespaces/mines')(minesNamespace);
    require('./namespaces/plinko')(plinkoNamespace);
    require('./namespaces/slots')(slotsNamespace);
    require('./namespaces/coinflip')(coinflipNamespace);
    require('./namespaces/wheel')(wheelNamespace);

    logger.info('✅ Socket.IO namespaces initialized');
};
