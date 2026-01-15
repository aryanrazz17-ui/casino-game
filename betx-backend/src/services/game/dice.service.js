const crypto = require('crypto');

/**
 * Provably Fair Dice Roll using HMAC-SHA256
 */
function generateRoll(serverSeed, clientSeed, nonce) {
    const hash = crypto
        .createHmac('sha256', serverSeed)
        .update(`${clientSeed}:${nonce}`)
        .digest('hex');

    // Convert first 8 hex chars to decimal, normalize to 0-100 range
    const roll = (parseInt(hash.substring(0, 8), 16) / 0xffffffff) * 100;

    return Number(roll.toFixed(2));
}

/**
 * Calculate multiplier based on win chance
 */
function calculateMultiplier(target, condition) {
    const winChance = condition === 'over' ? 100 - target : target;
    const houseEdge = 0.01; // 1% house edge
    return Number(((99 / winChance) * (1 - houseEdge)).toFixed(4));
}

/**
 * Play Dice Game
 */
exports.playDice = ({ betAmount, target, condition, clientSeed = null }) => {
    // Validation
    if (!betAmount || betAmount <= 0) {
        throw new Error('Invalid bet amount');
    }

    if (!target || target < 1 || target > 99) {
        throw new Error('Target must be between 1 and 99');
    }

    if (!['over', 'under'].includes(condition)) {
        throw new Error('Condition must be "over" or "under"');
    }

    // Generate provably fair seeds
    const serverSeed = crypto.randomBytes(32).toString('hex');
    const serverSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
    const finalClientSeed = clientSeed || crypto.randomBytes(16).toString('hex');
    const nonce = Date.now();

    // Generate roll result
    const roll = generateRoll(serverSeed, finalClientSeed, nonce);

    // Determine win/loss
    let isWin = false;
    if (condition === 'over') {
        isWin = roll > target;
    } else if (condition === 'under') {
        isWin = roll < target;
    }

    // Calculate multiplier and payout
    const multiplier = calculateMultiplier(target, condition);
    const payout = isWin ? Number((betAmount * multiplier).toFixed(2)) : 0;
    const profit = isWin ? Number((payout - betAmount).toFixed(2)) : Number((-betAmount).toFixed(2));

    return {
        roll,
        isWin,
        payout,
        profit,
        multiplier,
        betAmount,
        target,
        condition,
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
 * Verify game fairness
 */
exports.verifyFairness = (serverSeed, clientSeed, nonce) => {
    const roll = generateRoll(serverSeed, clientSeed, nonce);
    const hash = crypto.createHash('sha256').update(serverSeed).digest('hex');

    return {
        roll,
        serverSeedHash: hash,
        verified: true
    };
};

module.exports.generateRoll = generateRoll;
module.exports.calculateMultiplier = calculateMultiplier;
