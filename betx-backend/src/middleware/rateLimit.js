const rateLimit = require('express-rate-limit');
const config = require('../config/env');

/**
 * General API rate limiter
 */
const apiLimiter = rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW * 60 * 1000,
    max: config.RATE_LIMIT_MAX_REQUESTS,
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Strict rate limiter for authentication routes
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    skipSuccessfulRequests: true,
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again later',
    },
});

/**
 * Game play rate limiter
 */
const gameLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // 60 games per minute
    message: {
        success: false,
        message: 'Too many game requests, please slow down',
    },
});

/**
 * Withdrawal rate limiter
 */
const withdrawalLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 withdrawals per hour
    message: {
        success: false,
        message: 'Too many withdrawal requests, please try again later',
    },
});

module.exports = {
    apiLimiter,
    authLimiter,
    gameLimiter,
    withdrawalLimiter,
};
