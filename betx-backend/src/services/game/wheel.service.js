const pf = require('../../utils/provablyFairHelper');

// Risk Configurations (Simulated Segments)
// In a real wheel, we might have 10-20 segments. 
// For simplicity, we map the random float to these weighted buckets.
// To make it truly random like a physical wheel, we can define N segments and pick index = floor(float * N).
// Let's assume a 10-segment wheel for standard distribution.

const SEGMENTS = 10;

// Configurations map specific counts of multipliers to the 10 segments to achieve the rough risks.
// LOW: Safer, many small wins.
const RISK_CONFIG = {
    LOW: [1.5, 1.2, 1.2, 1.2, 0, 0, 1.2, 1.5, 1.2, 1.5], // ~80% win rate
    MEDIUM: [0, 0, 2.0, 0, 3.0, 0, 2.0, 0, 1.5, 5.0], // ~50% win rate
    HIGH: [0, 0, 0, 0, 0, 0, 10.0, 0, 0, 50.0] // ~20% win rate (very volatile)
};

/**
 * Play Wheel Game
 */
exports.playWheel = ({ betAmount, risk = 'LOW', clientSeed = null }) => {
    // Validation
    if (!betAmount || betAmount <= 0) {
        throw new Error('Invalid bet amount');
    }

    if (!RISK_CONFIG[risk]) {
        throw new Error('Invalid risk level. Must be LOW, MEDIUM, or HIGH');
    }

    // Generate Seeds
    const serverSeed = pf.generateSeed(32);
    const serverSeedHash = pf.generateHash(serverSeed);
    const finalClientSeed = clientSeed || pf.generateSeed(16);
    const nonce = Date.now();

    // Generate Result (0.0 - 1.0)
    const floatResult = pf.generateFloat(serverSeed, finalClientSeed, nonce);

    // Determine Segment Index (0 to 9)
    const segmentIndex = Math.floor(floatResult * SEGMENTS);
    const multipliers = RISK_CONFIG[risk];
    const multiplier = multipliers[segmentIndex];

    const isWin = multiplier > 0;
    const payout = isWin ? Number((betAmount * multiplier).toFixed(2)) : 0;
    const profit = isWin ? Number((payout - betAmount).toFixed(2)) : Number((-betAmount).toFixed(2));

    return {
        segmentIndex,
        multiplier,
        risk,
        isWin,
        payout,
        profit,
        betAmount,
        fairness: {
            serverSeed,
            serverSeedHash,
            clientSeed: finalClientSeed,
            nonce,
            revealed: true,
            floatResult
        }
    };
};

exports.RISK_CONFIG = RISK_CONFIG;
