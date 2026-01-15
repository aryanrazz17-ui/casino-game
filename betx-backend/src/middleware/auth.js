const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { getRedisClient } = require('../config/redis');

/**
 * Verify JWT token and attach user to request
 */
const protect = async (req, res, next) => {
    try {
        let token;

        // Check for token in Authorization header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to access this route',
            });
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, config.JWT_SECRET);

            // Check if token is blacklisted (logout)
            const redis = getRedisClient();
            if (redis) {
                const isBlacklisted = await redis.get(`blacklist:${token}`);
                if (isBlacklisted) {
                    return res.status(401).json({
                        success: false,
                        message: 'Token has been revoked',
                    });
                }
            }

            // Get user from Supabase
            const { data: userRaw, error } = await require('../config/supabase')
                .from('users')
                .select('*')
                .eq('id', decoded.id)
                .single();

            if (!userRaw || error) {
                return res.status(401).json({
                    success: false,
                    message: 'User not found',
                });
            }

            // Map to camelCase for compatibility
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
                return res.status(403).json({
                    success: false,
                    message: 'Account has been deactivated',
                });
            }

            // Attach user to request
            req.user = user;
            next();
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token',
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Authentication error',
        });
    }
};

/**
 * Restrict to specific roles
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized',
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `User role '${req.user.role}' is not authorized to access this route`,
            });
        }

        next();
    };
};

/**
 * Generate JWT access token
 */
const generateAccessToken = (userId) => {
    return jwt.sign({ id: userId }, config.JWT_SECRET, {
        expiresIn: config.JWT_EXPIRE,
    });
};

/**
 * Generate JWT refresh token
 */
const generateRefreshToken = (userId) => {
    return jwt.sign({ id: userId }, config.JWT_REFRESH_SECRET, {
        expiresIn: config.JWT_REFRESH_EXPIRE,
    });
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) => {
    try {
        return jwt.verify(token, config.JWT_REFRESH_SECRET);
    } catch (error) {
        return null;
    }
};

/**
 * Blacklist token (for logout)
 */
const blacklistToken = async (token) => {
    const redis = getRedisClient();
    if (redis) {
        // Set expiry to match token expiry
        await redis.setex(`blacklist:${token}`, 15 * 60, 'true');
    }
};

module.exports = {
    protect,
    authorize,
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
    blacklistToken,
};
