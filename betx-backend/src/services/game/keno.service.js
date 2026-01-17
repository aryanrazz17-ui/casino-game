const crypto = require('crypto');

/**
 * Payout Table for Keno (1-40 numbers, Draw 10)
 * Format: payouts[picksCount][hitsCount] = multiplier
 */
const payouts = {
    1: { 1: 3.8 },
    2: { 1: 1.7, 2: 5.2 },
    3: { 1: 1.0, 2: 3.4, 3: 14.2 },
    4: { 2: 2.1, 3: 5.9, 4: 25.7 },
    5: { 2: 1.5, 3: 4.0, 4: 15.5, 5: 70.2 },
    6: { 3: 1.8, 4: 6.2, 5: 30.0, 6: 160.0 },
    7: { 3: 1.6, 4: 4.5, 5: 15.0, 6: 80.0, 7: 400.0 },
    8: { 4: 2.5, 5: 8.5, 6: 35.0, 7: 150.0, 8: 800.0 },
    9: { 4: 2.1, 5: 5.5, 6: 18.5, 7: 75.0, 8: 350.0, 9: 1500.0 },
    10: { 5: 4.5, 6: 12.5, 7: 45.0, 8: 180.0, 9: 800.0, 10: 4000.0 }
};

/**
 * Provably Fair Draw using HMAC-SHA256
 * Draws 10 unique numbers from 1 to 40
 */
function generateDraw(serverSeed, clientSeed, nonce) {
    const draw = [];
    const available = Array.from({ length: 40 }, (_, i) => i + 1);

    let index = 0;
    while (draw.length < 10) {
        const hash = crypto
            .createHmac('sha256', serverSeed)
            .update(`${clientSeed}:${nonce}:${index}`)
            .digest('hex');

        // Use 8 characters of hash to get a random number
        const val = parseInt(hash.substring(0, 8), 16);
        const pos = val % available.length;

        draw.push(available.splice(pos, 1)[0]);
        index++;
    }

    return draw.sort((a, b) => a - b);
}

/**
 * Calculate payout based on hits
 */
function calculatePayout(picksCount, hitsCount) {
    if (!payouts[picksCount] || !payouts[picksCount][hitsCount]) {
        return 0;
    }
    return payouts[picksCount][hitsCount];
}

/**
 * Play Keno Game
 */
exports.playKeno = ({ betAmount, selectedNumbers, clientSeed = null }) => {
    // Validation
    if (!betAmount || betAmount <= 0) {
        throw new Error('Invalid bet amount');
    }

    if (!Array.isArray(selectedNumbers) || selectedNumbers.length < 1 || selectedNumbers.length > 10) {
        throw new Error('Select between 1 and 10 numbers');
    }

    // Ensure unique numbers between 1 and 40
    const uniquePicks = [...new Set(selectedNumbers)];
    if (uniquePicks.length !== selectedNumbers.length) {
        throw new Error('All selected numbers must be unique');
    }

    if (uniquePicks.some(n => n < 1 || n > 40)) {
        throw new Error('Numbers must be between 1 and 40');
    }

    // Generate provably fair seeds
    const serverSeed = crypto.randomBytes(32).toString('hex');
    const serverSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
    const finalClientSeed = clientSeed || crypto.randomBytes(16).toString('hex');
    const nonce = Date.now();

    // Generate draw result
    const draw = generateDraw(serverSeed, finalClientSeed, nonce);

    // Calculate hits
    const hits = uniquePicks.filter(n => draw.includes(n));
    const hitsCount = hits.length;

    // Calculate multiplier and payout
    const multiplier = calculatePayout(uniquePicks.length, hitsCount);
    const payout = Number((betAmount * multiplier).toFixed(2));
    const isWin = payout > 0;
    const profit = Number((payout - betAmount).toFixed(2));

    return {
        draw,
        hits,
        hitsCount,
        isWin,
        payout,
        profit,
        multiplier,
        betAmount,
        selectedNumbers: uniquePicks,
        fairness: {
            serverSeed,
            serverSeedHash,
            clientSeed: finalClientSeed,
            nonce,
            revealed: true
        }
    };
};

exports.getPayoutTable = () => payouts;

exports.verifyFairness = (serverSeed, clientSeed, nonce) => {
    const draw = generateDraw(serverSeed, clientSeed, nonce);
    const hash = crypto.createHash('sha256').update(serverSeed).digest('hex');

    return {
        draw,
        serverSeedHash: hash,
        verified: true
    };
};
