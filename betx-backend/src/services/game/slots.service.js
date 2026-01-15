const crypto = require('crypto');

/**
 * Slot symbols and their weights
 */
const SYMBOLS = {
    '🍒': { weight: 30, value: 1 },    // Cherry
    '🍋': { weight: 25, value: 2 },    // Lemon
    '🍊': { weight: 20, value: 3 },    // Orange
    '🍇': { weight: 15, value: 5 },    // Grape
    '🔔': { weight: 7, value: 10 },    // Bell
    '💎': { weight: 2, value: 50 },    // Diamond
    '7️⃣': { weight: 1, value: 100 }    // Seven
};

/**
 * Generate random symbol using provably fair algorithm
 */
function generateSymbol(serverSeed, clientSeed, nonce, reelIndex) {
    const hash = crypto
        .createHmac('sha256', serverSeed)
        .update(`${clientSeed}:${nonce}:${reelIndex}`)
        .digest('hex');

    const totalWeight = Object.values(SYMBOLS).reduce((sum, s) => sum + s.weight, 0);
    const random = parseInt(hash.substring(0, 8), 16) % totalWeight;

    let cumulative = 0;
    for (const [symbol, data] of Object.entries(SYMBOLS)) {
        cumulative += data.weight;
        if (random < cumulative) {
            return symbol;
        }
    }

    return '🍒'; // Fallback
}

/**
 * Calculate slots payout
 */
function calculateSlotsPayout(reels, betAmount, lines = 1) {
    const symbols = Object.keys(SYMBOLS);
    let totalPayout = 0;

    // Check each payline
    for (let line = 0; line < lines; line++) {
        const lineSymbols = reels.map(reel => reel[line % 3]); // 3 rows per reel

        // Check for matches
        if (lineSymbols[0] === lineSymbols[1] && lineSymbols[1] === lineSymbols[2]) {
            // All 3 match
            const symbol = lineSymbols[0];
            const multiplier = SYMBOLS[symbol].value;
            totalPayout += betAmount * multiplier;
        } else if (lineSymbols[0] === lineSymbols[1]) {
            // First 2 match
            const symbol = lineSymbols[0];
            const multiplier = SYMBOLS[symbol].value * 0.5;
            totalPayout += betAmount * multiplier;
        }
    }

    return Number(totalPayout.toFixed(2));
}

/**
 * Play Slots Game
 */
exports.playSlots = ({ betAmount, lines = 1, clientSeed = null }) => {
    // Validation
    if (!betAmount || betAmount <= 0) {
        throw new Error('Invalid bet amount');
    }

    if (lines < 1 || lines > 5) {
        throw new Error('Lines must be between 1 and 5');
    }

    const totalBet = betAmount * lines;

    // Generate provably fair seeds
    const serverSeed = crypto.randomBytes(32).toString('hex');
    const serverSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
    const finalClientSeed = clientSeed || crypto.randomBytes(16).toString('hex');
    const nonce = Date.now();

    // Generate 3 reels with 3 symbols each
    const reels = [];
    for (let reel = 0; reel < 3; reel++) {
        const reelSymbols = [];
        for (let row = 0; row < 3; row++) {
            const symbol = generateSymbol(serverSeed, finalClientSeed, nonce, reel * 3 + row);
            reelSymbols.push(symbol);
        }
        reels.push(reelSymbols);
    }

    // Calculate payout
    const rawPayout = calculateSlotsPayout(reels, betAmount, lines);
    const houseEdge = 0.01; // 1%
    const payout = Number((rawPayout * (1 - houseEdge)).toFixed(2));
    const profit = Number((payout - totalBet).toFixed(2));
    const isWin = payout > 0;
    const multiplier = totalBet > 0 ? Number((payout / totalBet).toFixed(2)) : 0;

    return {
        reels,
        payout,
        profit,
        multiplier,
        isWin,
        betAmount: totalBet,
        lines,
        fairness: {
            serverSeed,
            serverSeedHash,
            clientSeed: finalClientSeed,
            nonce,
            revealed: true
        }
    };
};

module.exports.SYMBOLS = SYMBOLS;
module.exports.generateSymbol = generateSymbol;
module.exports.calculateSlotsPayout = calculateSlotsPayout;
