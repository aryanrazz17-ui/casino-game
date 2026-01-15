const config = require('../config/env');

/**
 * Validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate username format
 */
function isValidUsername(username) {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
}

/**
 * Validate password strength
 */
function isValidPassword(password) {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
}

/**
 * Validate bet amount
 */
function isValidBetAmount(amount) {
    const numAmount = parseFloat(amount);
    return (
        !isNaN(numAmount) &&
        numAmount >= config.MIN_BET_AMOUNT &&
        numAmount <= config.MAX_BET_AMOUNT &&
        numAmount > 0
    );
}

/**
 * Validate currency
 */
function isValidCurrency(currency) {
    const validCurrencies = ['INR', 'BTC', 'ETH', 'TRON'];
    return validCurrencies.includes(currency);
}

/**
 * Validate MongoDB ObjectId
 */
function isValidObjectId(id) {
    return /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Sanitize input to prevent XSS
 */
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input
        .replace(/[<>]/g, '')
        .trim()
        .substring(0, 1000);
}

/**
 * Validate phone number (Indian format)
 */
function isValidPhone(phone) {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone);
}

/**
 * Validate UPI ID
 */
function isValidUPI(upi) {
    const upiRegex = /^[\w.-]+@[\w.-]+$/;
    return upiRegex.test(upi);
}

/**
 * Validate crypto address
 */
function isValidCryptoAddress(address, currency) {
    const patterns = {
        BTC: /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/,
        ETH: /^0x[a-fA-F0-9]{40}$/,
        TRON: /^T[a-zA-Z0-9]{33}$/,
    };

    return patterns[currency] ? patterns[currency].test(address) : false;
}

module.exports = {
    isValidEmail,
    isValidUsername,
    isValidPassword,
    isValidBetAmount,
    isValidCurrency,
    isValidObjectId,
    sanitizeInput,
    isValidPhone,
    isValidUPI,
    isValidCryptoAddress,
};
