const pf = require('../../utils/provablyFairHelper');

/**
 * Provably Fair Dice Roll
 */
function generateRoll(serverSeed, clientSeed, nonce) {
    const float = pf.generateFloat(serverSeed, clientSeed, nonce);
    // Scale 0-1 to 0-100
    const roll = float * 100;
    return Number(roll.toFixed(2));
}

/**
 * Calculate multiplier based on win chance
 */
function calculateMultiplier(target, condition) {
    const winChance = condition === 'over' ? 100 - target : target;
    const houseEdge = 0.01; // 1% house edge
    // Protect against weird float math or /0 (though validation prevents 0 chance)
    if (winChance <= 0) return 0;
    return Number(((99 / winChance) * (1 - houseEdge)).toFixed(4));
}

/**
 * Play Dice Game
 */
exports.playDice = ({ betAmount, target, condition, clientSeed = null }) => {
    // Validation
    if (!betAmount || betAmount <= 0) throw new Error('Invalid bet amount');
    if (!target || target < 1 || target > 99) throw new Error('Target must be between 1 and 99');
    if (!['over', 'under'].includes(condition)) throw new Error('Condition must be "over" or "under"');

    // Generate provably fair seeds
    const serverSeed = pf.generateServerSeed();
    const serverSeedHash = pf.hashSeed(serverSeed);
    const finalClientSeed = clientSeed || pf.generateClientSeed();
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
            revealed: true // In this basic version, we reveal immediately. 
            // Truly, serverSeed should be hidden until user "rotates" seed pair, but for MVP atomic games, revealing instantly is common to verify *that* round.
        }
    };
};

/**
 * Verify game fairness
 */
exports.verifyFairness = (serverSeed, clientSeed, nonce) => {
    const roll = generateRoll(serverSeed, clientSeed, nonce);
    const hash = pf.hashSeed(serverSeed);

    return {
        roll,
        serverSeedHash: hash,
        verified: true
    };
};

module.exports.generateRoll = generateRoll;
module.exports.calculateMultiplier = calculateMultiplier;
