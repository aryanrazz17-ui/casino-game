const crypto = require('crypto');

/**
 * Aviator Game Service - Multiplayer Crash Game
 * Provably fair crash point generation with deterministic multiplier curve
 */

/**
 * Generate crash point using provably fair algorithm
 * Uses HMAC-SHA256 for deterministic, verifiable randomness
 */
function generateCrashPoint(serverSeed, clientSeed, nonce) {
    const hash = crypto
        .createHmac('sha256', serverSeed)
        .update(`${clientSeed}:${nonce}`)
        .digest('hex');

    // Convert first 8 hex chars to crash multiplier
    const h = parseInt(hash.substring(0, 8), 16);
    const e = Math.pow(2, 32);

    // House edge 1% - Formula: (0.99 * 2^32) / (2^32 - hash)
    const crashPoint = Math.max(1.00, (0.99 * e) / (e - h));

    // Cap at 10000x and round to 2 decimals
    return Number(Math.min(crashPoint, 10000).toFixed(2));
}

/**
 * Calculate current multiplier based on elapsed time
 * Exponential growth curve for realistic flight simulation
 * @param {number} elapsedMs - Milliseconds since round start
 * @returns {number} Current multiplier (1.00+)
 */
function calculateMultiplier(elapsedMs) {
    // Growth rate: 0.1% per 100ms = 1% per second
    // Formula: 1.00 * e^(0.001 * elapsed_ms / 100)
    const seconds = elapsedMs / 1000;
    const multiplier = Math.pow(1.01, seconds * 10); // ~10% growth per second

    return Number(Math.min(multiplier, 10000).toFixed(2));
}

/**
 * Get time in MS when multiplier reaches target
 * Inverse of calculateMultiplier
 */
function getTimeForMultiplier(targetMultiplier) {
    if (targetMultiplier <= 1.00) return 0;

    // Inverse: t = log(multiplier) / log(1.01) / 10
    const seconds = Math.log(targetMultiplier) / Math.log(1.01) / 10;
    return Math.round(seconds * 1000);
}

/**
 * Create a new round with provably fair crash point
 */
exports.createRound = (roundId, clientSeed = null) => {
    const serverSeed = crypto.randomBytes(32).toString('hex');
    const serverSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
    const finalClientSeed = clientSeed || crypto.randomBytes(16).toString('hex');
    const nonce = roundId || Date.now();

    const crashPoint = generateCrashPoint(serverSeed, finalClientSeed, nonce);
    const crashTimeMs = getTimeForMultiplier(crashPoint);

    return {
        roundId: nonce,
        crashPoint,
        crashTimeMs,
        serverSeed,
        serverSeedHash,
        clientSeed: finalClientSeed,
        nonce,
        startTime: null, // Set when round actually starts
        status: 'pending' // pending, flying, crashed
    };
};

/**
 * Validate bet placement
 */
exports.validateBet = (betAmount, autoCashout = null) => {
    if (!betAmount || betAmount <= 0) {
        throw new Error('Invalid bet amount');
    }

    if (autoCashout !== null && (autoCashout < 1.01 || autoCashout > 10000)) {
        throw new Error('Auto cashout must be between 1.01x and 10000x');
    }

    return true;
};

/**
 * Calculate cashout result
 */
exports.calculateCashout = (betAmount, cashoutMultiplier) => {
    if (cashoutMultiplier < 1.00) {
        throw new Error('Invalid cashout multiplier');
    }

    const payout = Number((betAmount * cashoutMultiplier).toFixed(2));
    const profit = Number((payout - betAmount).toFixed(2));

    return {
        payout,
        profit,
        multiplier: cashoutMultiplier
    };
};

/**
 * Verify fairness of a round
 */
exports.verifyRound = (serverSeed, clientSeed, nonce, claimedCrashPoint) => {
    const actualCrashPoint = generateCrashPoint(serverSeed, clientSeed, nonce);
    const hash = crypto.createHash('sha256').update(serverSeed).digest('hex');

    return {
        verified: actualCrashPoint === claimedCrashPoint,
        actualCrashPoint,
        serverSeedHash: hash
    };
};

// Export utility functions
module.exports.generateCrashPoint = generateCrashPoint;
module.exports.calculateMultiplier = calculateMultiplier;
module.exports.getTimeForMultiplier = getTimeForMultiplier;
