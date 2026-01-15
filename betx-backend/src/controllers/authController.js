const supabase = require('../config/supabase');
const bcrypt = require('bcrypt');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
    blacklistToken,
} = require('../middleware/auth');
const { getRedisClient } = require('../config/redis');
const { logger } = require('../utils/logger');
const config = require('../config/env');
const WalletService = require('../services/wallet.service');

// Helper: Map user snake_case to camelCase
const mapUser = (u) => {
    if (!u) return null;
    return {
        _id: u.id,
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        isVerified: u.is_verified,
        isActive: u.is_active,
        referralCode: u.referral_code,
        createdAt: u.created_at,
        profile: { // Flattened in DB? No, keeping as columns or JSONB? 
            // Schema had `avatar`, `first_name` etc explicitly. 
            // Let's assume frontend expects `profile` object.
            avatar: u.avatar,
            firstName: u.first_name,
            lastName: u.last_name,
            phone: u.phone,
            dateOfBirth: u.date_of_birth
        },
        security: {
            // Need to fetch from DB columns
            loginAttempts: u.login_attempts,
            lockUntil: u.lock_until,
            lastLogin: u.last_login
        }
    };
};

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
exports.register = asyncHandler(async (req, res, next) => {
    const { username, email, password } = req.body;

    // Hash password
    const salt = await bcrypt.genSalt(config.BCRYPT_ROUNDS);
    const passwordHash = await bcrypt.hash(password, salt);

    // Generate referral code
    const referralCode = `${username.toUpperCase()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Create user
    const { data: user, error } = await supabase
        .from('users')
        .insert({
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            password_hash: passwordHash,
            referral_code: referralCode,
            role: 'user',
            is_active: true
        })
        .select()
        .single();

    if (error) {
        if (error.code === '23505') { // Unique violation
            return next(new AppError('Username or email already exists', 400));
        }
        return next(new AppError(error.message, 500));
    }

    // Create default INR wallet
    try {
        await WalletService.getOrCreateWallet(user.id, 'INR');
    } catch (e) {
        logger.error(`Failed to create wallet for ${user.id}:`, e);
        // Clean up user? Or retry?
    }

    logger.info(`New user registered: ${user.username}`);

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Store refresh token in Redis
    const redis = getRedisClient();
    if (redis) {
        await redis.setex(`refresh:${user.id}`, 7 * 24 * 60 * 60, refreshToken);
    }

    const mappedUser = mapUser(user);

    res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: {
            user: {
                id: mappedUser.id,
                username: mappedUser.username,
                email: mappedUser.email,
                role: mappedUser.role,
                referralCode: mappedUser.referralCode,
            },
            accessToken,
            refreshToken,
        },
    });
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
exports.login = asyncHandler(async (req, res, next) => {
    const { identifier, password } = req.body;

    // Find user by email or username
    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .or(`email.eq.${identifier.toLowerCase()},username.eq.${identifier.toLowerCase()}`)
        .single();

    if (!user || error) {
        return next(new AppError('Invalid credentials', 401));
    }

    // Check if account is locked
    if (user.lock_until && new Date(user.lock_until) > new Date()) {
        return next(new AppError('Account is temporarily locked. Please try again later', 423));
    }

    // Check if account is active
    if (!user.is_active) {
        return next(new AppError('Account has been deactivated', 403));
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
        // Increment login attempts & lock if needed
        const newAttempts = (user.login_attempts || 0) + 1;

        let updates = { login_attempts: newAttempts };
        if (newAttempts >= config.MAX_LOGIN_ATTEMPTS) {
            updates.lock_until = new Date(Date.now() + config.LOCK_TIME * 60 * 1000).toISOString();
        }

        await supabase.from('users').update(updates).eq('id', user.id);

        return next(new AppError('Invalid credentials', 401));
    }

    // Reset login attempts on successful login & Update last login
    await supabase.from('users').update({
        login_attempts: 0,
        lock_until: null,
        last_login: new Date(),
        last_login_ip: req.ip
    }).eq('id', user.id);

    logger.info(`User logged in: ${user.username}`);

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Store refresh token in Redis
    const redis = getRedisClient();
    if (redis) {
        await redis.setex(`refresh:${user.id}`, 7 * 24 * 60 * 60, refreshToken);
    }

    const mappedUser = mapUser(user);

    res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
            user: {
                id: mappedUser.id,
                username: mappedUser.username,
                email: mappedUser.email,
                role: mappedUser.role,
                profile: mappedUser.profile,
            },
            accessToken,
            refreshToken,
        },
    });
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
exports.refreshToken = asyncHandler(async (req, res, next) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return next(new AppError('Refresh token required', 400));
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    if (!decoded) {
        return next(new AppError('Invalid or expired refresh token', 401));
    }

    // Check if refresh token exists in Redis
    const redis = getRedisClient();
    if (redis) {
        const storedToken = await redis.get(`refresh:${decoded.id}`);
        if (storedToken !== refreshToken) {
            return next(new AppError('Invalid refresh token', 401));
        }
    }

    // Generate new access token
    const accessToken = generateAccessToken(decoded.id);

    res.status(200).json({
        success: true,
        data: {
            accessToken,
        },
    });
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
exports.logout = asyncHandler(async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (token) {
        // Blacklist the access token
        await blacklistToken(token);
    }

    // Remove refresh token from Redis
    const redis = getRedisClient();
    if (redis) {
        await redis.del(`refresh:${req.user.id}`); // req.user.id from middleware
    }

    logger.info(`User logged out: ${req.user.username}`);

    res.status(200).json({
        success: true,
        message: 'Logout successful',
    });
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
exports.getMe = asyncHandler(async (req, res, next) => {
    const { data: user } = await supabase.from('users').select('*').eq('id', req.user.id).single();

    // Get wallet balances
    const wallets = await WalletService.getUserWallets(req.user.id);

    const mappedUser = mapUser(user);

    res.status(200).json({
        success: true,
        data: {
            user: {
                id: mappedUser.id,
                username: mappedUser.username,
                email: mappedUser.email,
                role: mappedUser.role,
                profile: mappedUser.profile,
                isVerified: mappedUser.isVerified,
                referralCode: mappedUser.referralCode,
                createdAt: mappedUser.createdAt,
            },
            wallets: wallets.map((w) => ({
                currency: w.currency,
                balance: w.balance,
                availableBalance: w.balance - w.lockedBalance,
            })),
        },
    });
});
