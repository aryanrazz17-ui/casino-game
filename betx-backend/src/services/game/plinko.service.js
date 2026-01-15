const crypto = require('crypto');

/**
 * Generate Plinko path using provably fair algorithm
 */
function generatePlinkoPath(serverSeed, clientSeed, nonce, rows = 16) {
    const path = [];

    for (let i = 0; i < rows; i++) {
        const hash = crypto
            .createHmac('sha256', serverSeed)
            .update(`${clientSeed}:${nonce}:${i}`)
            .digest('hex');

        const direction = parseInt(hash.substring(0, 2), 16) % 2; // 0 = left, 1 = right
        path.push(direction);
    }

    return path;
}

/**
 * Calculate final bucket from path
 */
function calculateBucket(path) {
    // Count rights (1s) in path
    const rights = path.filter(d => d === 1).length;
    return rights;
}

/**
 * Plinko multipliers by risk level
 */
const PLINKO_MULTIPLIERS = {
    low: {
        8: [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6],
        12: [8.4, 3, 1.6, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.6, 3, 8.4],
        16: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16]
    },
    medium: {
        8: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
        12: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33],
        16: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110]
    },
    high: {
        8: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
        12: [76, 18, 5, 1.7, 0.7, 0.2, 0.2, 0.2, 0.7, 1.7, 5, 18, 76],
        16: [420, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 420]
    }
};

/**
 * Play Plinko Game
 */
exports.playPlinko = ({ betAmount, risk = 'medium', rows = 16, clientSeed = null }) => {
    // Validation
    if (!betAmount || betAmount <= 0) {
        throw new Error('Invalid bet amount');
    }

    if (!['low', 'medium', 'high'].includes(risk)) {
        throw new Error('Risk must be low, medium, or high');
    }

    if (![8, 12, 16].includes(rows)) {
        throw new Error('Rows must be 8, 12, or 16');
    }

    // Generate provably fair seeds
    const serverSeed = crypto.randomBytes(32).toString('hex');
    const serverSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
    const finalClientSeed = clientSeed || crypto.randomBytes(16).toString('hex');
    const nonce = Date.now();

    // Generate plinko path
    const path = generatePlinkoPath(serverSeed, finalClientSeed, nonce, rows);
    const bucket = calculateBucket(path);

    // Get multiplier from bucket
    const multipliers = PLINKO_MULTIPLIERS[risk][rows];
    const multiplier = multipliers[bucket];

    // Calculate payout
    const houseEdge = 0.01; // 1%
    const adjustedMultiplier = Number((multiplier * (1 - houseEdge)).toFixed(4));
    const payout = Number((betAmount * adjustedMultiplier).toFixed(2));
    const profit = Number((payout - betAmount).toFixed(2));
    const isWin = payout > betAmount;

    return {
        path,
        bucket,
        multiplier: adjustedMultiplier,
        payout,
        profit,
        isWin,
        betAmount,
        risk,
        rows,
        fairness: {
            serverSeed,
            serverSeedHash,
            clientSeed: finalClientSeed,
            nonce,
            revealed: true
        }
    };
};

module.exports.generatePlinkoPath = generatePlinkoPath;
module.exports.calculateBucket = calculateBucket;
module.exports.PLINKO_MULTIPLIERS = PLINKO_MULTIPLIERS;
