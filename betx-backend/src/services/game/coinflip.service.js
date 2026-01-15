const pf = require('../../utils/provablyFairHelper');

/**
 * Play Coinflip Game
 */
exports.playCoinflip = ({ betAmount, choice, clientSeed = null }) => {
    // Validation
    if (!betAmount || betAmount <= 0) {
        throw new Error('Invalid bet amount');
    }

    if (!['heads', 'tails'].includes(choice)) {
        throw new Error('Choice must be "heads" or "tails"');
    }

    // Generate Seeds
    const serverSeed = pf.generateSeed(32);
    const serverSeedHash = pf.generateHash(serverSeed);
    const finalClientSeed = clientSeed || pf.generateSeed(16);
    const nonce = Date.now();

    // Generate Result (0.0 - 1.0)
    const floatResult = pf.generateFloat(serverSeed, finalClientSeed, nonce);

    // Logic: < 0.5 = Heads, >= 0.5 = Tails
    const resultSide = floatResult < 0.5 ? 'heads' : 'tails';
    const isWin = choice === resultSide;

    // Multiplier: 1.98x (2% House Edge)
    const multiplier = 1.98;

    const payout = isWin ? Number((betAmount * multiplier).toFixed(2)) : 0;
    const profit = isWin ? Number((payout - betAmount).toFixed(2)) : Number((-betAmount).toFixed(2));

    return {
        resultSide, // 'heads' or 'tails'
        floatResult,
        isWin,
        payout,
        profit,
        multiplier,
        betAmount,
        choice,
        fairness: {
            serverSeed,
            serverSeedHash,
            clientSeed: finalClientSeed,
            nonce,
            revealed: true
        }
    };
};
