const { AppError } = require('./errorHandler');
const {
    isValidEmail,
    isValidUsername,
    isValidPassword,
    isValidBetAmount,
    isValidCurrency,
    sanitizeInput,
} = require('../utils/validation');

/**
 * Validate registration data
 */
const validateRegister = (req, res, next) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return next(new AppError('Please provide username, email, and password', 400));
    }

    if (!isValidUsername(username)) {
        return next(
            new AppError('Username must be 3-20 characters and contain only letters, numbers, and underscores', 400)
        );
    }

    if (!isValidEmail(email)) {
        return next(new AppError('Please provide a valid email address', 400));
    }

    if (!isValidPassword(password)) {
        return next(
            new AppError(
                'Password must be at least 8 characters and contain uppercase, lowercase, number, and special character',
                400
            )
        );
    }

    // Sanitize inputs
    req.body.username = sanitizeInput(username);
    req.body.email = sanitizeInput(email);

    next();
};

/**
 * Validate login data
 */
const validateLogin = (req, res, next) => {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
        return next(new AppError('Please provide email/username and password', 400));
    }

    req.body.identifier = sanitizeInput(identifier);

    next();
};

/**
 * Validate bet data
 */
const validateBet = (req, res, next) => {
    const { amount, currency } = req.body;

    if (!amount) {
        return next(new AppError('Please provide bet amount', 400));
    }

    if (!isValidBetAmount(amount)) {
        return next(new AppError(`Bet amount must be between ${process.env.MIN_BET_AMOUNT} and ${process.env.MAX_BET_AMOUNT}`, 400));
    }

    if (currency && !isValidCurrency(currency)) {
        return next(new AppError('Invalid currency', 400));
    }

    next();
};

/**
 * Validate withdrawal data
 */
const validateWithdrawal = (req, res, next) => {
    const { amount, currency, method } = req.body;

    if (!amount || !currency || !method) {
        return next(new AppError('Please provide amount, currency, and withdrawal method', 400));
    }

    if (!isValidBetAmount(amount)) {
        return next(new AppError('Invalid withdrawal amount', 400));
    }

    if (!isValidCurrency(currency)) {
        return next(new AppError('Invalid currency', 400));
    }

    const validMethods = ['upi', 'bank', 'crypto'];
    if (!validMethods.includes(method)) {
        return next(new AppError('Invalid withdrawal method', 400));
    }

    next();
};

/**
 * Sanitize request body
 */
const sanitizeBody = (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        Object.keys(req.body).forEach((key) => {
            if (typeof req.body[key] === 'string') {
                req.body[key] = sanitizeInput(req.body[key]);
            }
        });
    }
    next();
};

module.exports = {
    validateRegister,
    validateLogin,
    validateBet,
    validateWithdrawal,
    sanitizeBody,
};
