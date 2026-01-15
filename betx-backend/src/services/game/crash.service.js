const crypto = require('crypto');

/**
 * Generate crash point using provably fair algorithm
 */
function generateCrashPoint(serverSeed, clientSeed, nonce) {
    const hash = crypto
        .createHmac('sha256', serverSeed)
        .update(`${clientSeed}:${nonce}`)
        .digest('hex');

    // Convert to crash multiplier (1.00x - 10000x)
    const h = parseInt(hash.substring(0, 8), 16);
    const e = Math.pow(2, 32);

    // House edge 1%
    const crashPoint = Math.max(1, (0.99 * e) / (e - h));

    return Number(Math.min(crashPoint, 10000).toFixed(2));
}

/**
 * Play Crash Game
 */
exports.playCrash = ({ betAmount, autoCashout, clientSeed = null }) => {
    // Validation
    if (!betAmount || betAmount <= 0) {
        throw new Error('Invalid bet amount');
    }

    if (autoCashout && (autoCashout < 1.01 || autoCashout > 10000)) {
        throw new Error('Auto cashout must be between 1.01x and 10000x');
    }

    // Generate provably fair seeds
    const serverSeed = crypto.randomBytes(32).toString('hex');
    const serverSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
    const finalClientSeed = clientSeed || crypto.randomBytes(16).toString('hex');
    const nonce = Date.now();

    // Generate crash point
    const crashPoint = generateCrashPoint(serverSeed, finalClientSeed, nonce);

    // Determine if player won (if auto cashout is set)
    let isWin = false;
    let cashoutAt = 0;
    let payout = 0;
    let profit = 0;

    if (autoCashout) {
        isWin = crashPoint >= autoCashout;
        cashoutAt = isWin ? autoCashout : 0;
        payout = isWin ? Number((betAmount * autoCashout).toFixed(2)) : 0;
        profit = isWin ? Number((payout - betAmount).toFixed(2)) : Number((-betAmount).toFixed(2));
    } else {
        // Manual cashout - will be handled separately
        cashoutAt = 0;
        payout = 0;
        profit = Number((-betAmount).toFixed(2));
    }

    return {
        crashPoint,
        isWin,
        cashoutAt,
        payout,
        profit,
        betAmount,
        autoCashout: autoCashout || null,
        fairness: {
            serverSeed,
            serverSeedHash,
            clientSeed: finalClientSeed,
            nonce,
            revealed: true
        }
    };
};

/**
 * Manual cashout during game
 */
exports.cashout = (betAmount, cashoutMultiplier) => {
    if (cashoutMultiplier < 1.01) {
        throw new Error('Invalid cashout multiplier');
    }

    const payout = Number((betAmount * cashoutMultiplier).toFixed(2));
    const profit = Number((payout - betAmount).toFixed(2));

    return {
        payout,
        profit,
        cashoutAt: cashoutMultiplier
    };
};

module.exports.generateCrashPoint = generateCrashPoint;
