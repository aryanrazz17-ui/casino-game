const crypto = require('crypto');

/**
 * Generate mines grid using provably fair algorithm
 */
function generateMinesGrid(serverSeed, clientSeed, nonce, minesCount = 3) {
    const positions = [];

    for (let i = 0; i < minesCount; i++) {
        const hash = crypto
            .createHmac('sha256', serverSeed)
            .update(`${clientSeed}:${nonce}:${i}`)
            .digest('hex');

        const position = parseInt(hash.substring(0, 8), 16) % 25; // 5x5 grid = 25 positions

        if (!positions.includes(position)) {
            positions.push(position);
        } else {
            // If collision, try next position
            let nextPos = (position + 1) % 25;
            while (positions.includes(nextPos)) {
                nextPos = (nextPos + 1) % 25;
            }
            positions.push(nextPos);
        }
    }

    return positions.sort((a, b) => a - b);
}

/**
 * Calculate mines multiplier based on revealed tiles
 */
function calculateMinesMultiplier(revealedCount, minesCount) {
    const totalTiles = 25;
    const safeTiles = totalTiles - minesCount;

    if (revealedCount === 0) return 1;

    let multiplier = 1;
    for (let i = 0; i < revealedCount; i++) {
        multiplier *= (safeTiles / (safeTiles - i));
    }

    const houseEdge = 0.01; // 1%
    return Number((multiplier * (1 - houseEdge)).toFixed(4));
}

/**
 * Start Mines Game
 */
exports.startMines = ({ betAmount, minesCount = 3, clientSeed = null }) => {
    // Validation
    if (!betAmount || betAmount <= 0) {
        throw new Error('Invalid bet amount');
    }

    if (minesCount < 1 || minesCount > 24) {
        throw new Error('Mines count must be between 1 and 24');
    }

    // Generate provably fair seeds
    const serverSeed = crypto.randomBytes(32).toString('hex');
    const serverSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
    const finalClientSeed = clientSeed || crypto.randomBytes(16).toString('hex');
    const nonce = Date.now();

    // Generate mines positions
    const minePositions = generateMinesGrid(serverSeed, finalClientSeed, nonce, minesCount);

    return {
        gameId: crypto.randomBytes(16).toString('hex'),
        betAmount,
        minesCount,
        minePositions, // Hidden from player until game ends
        revealedTiles: [],
        isActive: true,
        fairness: {
            serverSeed,
            serverSeedHash,
            clientSeed: finalClientSeed,
            nonce,
            revealed: false // Only reveal after cashout or loss
        }
    };
};

/**
 * Reveal tile in Mines game
 */
exports.revealTile = (gameState, position) => {
    if (!gameState.isActive) {
        throw new Error('Game is not active');
    }

    if (position < 0 || position > 24) {
        throw new Error('Invalid tile position');
    }

    if (gameState.revealedTiles.includes(position)) {
        throw new Error('Tile already revealed');
    }

    const hitMine = gameState.minePositions.includes(position);

    if (hitMine) {
        // Game over - player lost
        return {
            position,
            hitMine: true,
            isActive: false,
            revealedTiles: [...gameState.revealedTiles, position],
            minePositions: gameState.minePositions,
            payout: 0,
            profit: -gameState.betAmount,
            multiplier: 0,
            fairness: {
                ...gameState.fairness,
                revealed: true
            }
        };
    } else {
        // Safe tile - continue game
        const newRevealedTiles = [...gameState.revealedTiles, position];
        const multiplier = calculateMinesMultiplier(newRevealedTiles.length, gameState.minesCount);
        const currentPayout = Number((gameState.betAmount * multiplier).toFixed(2));

        return {
            position,
            hitMine: false,
            isActive: true,
            revealedTiles: newRevealedTiles,
            multiplier,
            currentPayout,
            fairness: gameState.fairness
        };
    }
};

/**
 * Cashout from Mines game
 */
exports.cashoutMines = (gameState) => {
    if (!gameState.isActive) {
        throw new Error('Game is not active');
    }

    if (gameState.revealedTiles.length === 0) {
        throw new Error('Must reveal at least one tile before cashing out');
    }

    const multiplier = calculateMinesMultiplier(gameState.revealedTiles.length, gameState.minesCount);
    const payout = Number((gameState.betAmount * multiplier).toFixed(2));
    const profit = Number((payout - gameState.betAmount).toFixed(2));

    return {
        isActive: false,
        payout,
        profit,
        multiplier,
        revealedTiles: gameState.revealedTiles,
        minePositions: gameState.minePositions,
        fairness: {
            ...gameState.fairness,
            revealed: true
        }
    };
};

module.exports.generateMinesGrid = generateMinesGrid;
module.exports.calculateMinesMultiplier = calculateMinesMultiplier;
