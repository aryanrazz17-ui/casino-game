const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config/env');
const { connectRedis } = require('./config/redis');
const { morganMiddleware, logger } = require('./utils/logger');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimit');
const { sanitizeBody } = require('./middleware/validation');

// Initialize Express app
const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
    cors: {
        origin: (origin, callback) => {
            const allowedOrigins = [config.CLIENT_URL, 'https://betx.vercel.app', 'http://localhost:3000'];
            if (!origin || allowedOrigins.includes(origin) || allowedOrigins.some(o => o.includes('*'))) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ['GET', 'POST'],
        credentials: true,
    },
    transports: ['websocket'], // Force WebSocket only
    pingTimeout: 60000,
    pingInterval: 25000,
    allowEIO3: true,
});

// Make io accessible to routes
app.set('io', io);

// Security middleware
app.use(helmet());
app.use(
    cors({
        origin: config.CLIENT_URL,
        credentials: true,
    })
);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morganMiddleware);

// Sanitize inputs
app.use(sanitizeBody);

// Rate limiting
app.use('/api', apiLimiter);

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
    });
});

// Root route (Render / browser health check)
app.route('/')
    .get((req, res) => {
        res.status(200).json({
            success: true,
            message: 'BetX Backend is Live 🚀',
            env: config.NODE_ENV,
        });
    })
    .head((req, res) => {
        res.status(200).end();
    });
app.get('/favicon.ico', (req, res) => res.status(204).end());

// API Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/user', require('./routes/user.routes'));
app.use('/api/wallet', require('./routes/wallet.routes'));
app.use('/api/payment', require('./routes/payment.routes'));
app.use('/api/games', require('./routes/game.routes'));
app.use('/api/hilo', require('./routes/hilo.routes'));
app.use('/api/roulette', require('./routes/roulette.routes'));
app.use('/api/admin', require('./routes/admin.routes'));

// Socket.IO setup
require('./socket')(io);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = config.PORT || 7000;

const startServer = async () => {
    try {
        // Connect to Redis
        connectRedis();

        // Check Supabase Connection (optional, just to verify config)
        if (!process.env.SUPABASE_URL) {
            logger.error('Supabase URL missing!');
            process.exit(1);
        }

        // Start server
        server.listen(PORT, () => {
            logger.info(`🚀 Server running in ${config.NODE_ENV} mode on port ${PORT}`);
            logger.info(`📡 Socket.IO server ready`);
            logger.info(`⚡ Connected to Supabase Project: ${config.SUPABASE_URL}`);
            logger.info(`🌐 Client URL: ${config.CLIENT_URL}`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Rejection:', err);
    server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
        logger.info('Process terminated');
    });
});

startServer();

module.exports = { app, server, io };
