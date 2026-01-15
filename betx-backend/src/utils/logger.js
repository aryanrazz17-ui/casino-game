const morgan = require('morgan');
const config = require('../config/env');

// Custom token for user ID
morgan.token('user-id', (req) => {
    return req.user ? req.user.id : 'anonymous';
});

// Custom format
const morganFormat =
    config.NODE_ENV === 'production'
        ? ':remote-addr - :user-id [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms'
        : ':method :url :status :response-time ms - :res[content-length]';

const morganMiddleware = morgan(morganFormat, {
    skip: (req) => {
        // Skip health check endpoints
        return req.url === '/health' || req.url === '/api/health';
    },
});

// Simple console logger
const logger = {
    info: (...args) => {
        console.log('[INFO]', new Date().toISOString(), ...args);
    },
    error: (...args) => {
        console.error('[ERROR]', new Date().toISOString(), ...args);
    },
    warn: (...args) => {
        console.warn('[WARN]', new Date().toISOString(), ...args);
    },
    debug: (...args) => {
        if (config.NODE_ENV === 'development') {
            console.log('[DEBUG]', new Date().toISOString(), ...args);
        }
    },
};

module.exports = { morganMiddleware, logger };
