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
    const kenoNamespace = io.of('/keno');
    const aviatorNamespace = io.of('/aviator');
    const chatNamespace = io.of('/chat');

    // Apply auth to all namespaces and join user room
    [
        diceNamespace,
        crashNamespace,
        minesNamespace,
        plinkoNamespace,
        slotsNamespace,
        coinflipNamespace,
        wheelNamespace,
        kenoNamespace,
        aviatorNamespace,
        chatNamespace
    ].forEach(
        (ns) => {
            ns.use(socketAuth);
            ns.on('connection', (socket) => {
                socket.join(`user:${socket.userId}`);
            });
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
    require('./namespaces/keno')(kenoNamespace);
    require('./namespaces/aviator')(aviatorNamespace);

    // Baccarat
    const baccaratNamespace = io.of('/baccarat');
    baccaratNamespace.use(socketAuth);
    baccaratNamespace.on('connection', (socket) => {
        socket.join(`user:${socket.userId}`);
    });
    require('./namespaces/baccarat')(baccaratNamespace);

    // Color Prediction (New)
    const colorPredictionNamespace = io.of('/color-prediction');
    colorPredictionNamespace.use(socketAuth);
    colorPredictionNamespace.on('connection', (socket) => {
        socket.join(`user:${socket.userId}`);
    });
    require('./namespaces/color-prediction')(colorPredictionNamespace);

    // Blackjack (New)
    const blackjackNamespace = io.of('/blackjack');
    blackjackNamespace.use(socketAuth);
    blackjackNamespace.on('connection', (socket) => {
        socket.join(`user:${socket.userId}`);
    });
    require('./namespaces/blackjack')(blackjackNamespace);

    logger.info('✅ Socket.IO namespaces initialized');
};
