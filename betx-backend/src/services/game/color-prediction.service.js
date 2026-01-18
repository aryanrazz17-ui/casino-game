const crypto = require('crypto');

/**
 * Color Prediction Game Service
 * Logic for generating provably fair numbers, determining results, and calculating payouts.
 */

// Game Constants
const COLORS = {
    RED: 'red',
    GREEN: 'green',
    VIOLET: 'violet'
};

const SIZES = {
    BIG: 'big',
    SMALL: 'small'
};

const NUMBERS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * Generate a provably fair result for the round.
 * @param {string} serverSeed 
 * @param {string} clientSeed 
 * @param {number} nonce 
 */
function generateResult(serverSeed, clientSeed, nonce) {
    // HMAC SHA256
    const hash = crypto
        .createHmac('sha256', serverSeed)
        .update(`${clientSeed}:${nonce}`)
        .digest('hex');

    // Use the first 8 characters of the hash to generate a number
    // We want a uniform distribution 0-9.
    // Taking a large hex chunk and modulo 10 is standard enough for this simple range.
    const parsable = hash.substring(0, 8);
    const numberValue = parseInt(parsable, 16);

    // Result Number 0-9
    const resultNumber = numberValue % 10;

    return {
        number: resultNumber,
        ...analyzeResult(resultNumber),
        hash: hash,
        serverSeed: serverSeed,
        clientSeed: clientSeed,
        nonce: nonce
    };
}

/**
 * Derive colors and size from the number.
 * @param {number} number 0-9
 */
function analyzeResult(number) {
    let colors = [];
    let size = '';

    // Color Logic
    // Red: 2, 4, 6, 8 (and 0 is Red+Violet)
    // Green: 1, 3, 7, 9 (and 5 is Green+Violet)
    // Violet: 0, 5

    if (number === 0) {
        colors = [COLORS.VIOLET, COLORS.RED];
    } else if (number === 5) {
        colors = [COLORS.VIOLET, COLORS.GREEN];
    } else if ([2, 4, 6, 8].includes(number)) {
        colors = [COLORS.RED];
    } else if ([1, 3, 7, 9].includes(number)) {
        colors = [COLORS.GREEN];
    }

    // Size Logic
    // Small: 0-4
    // Big: 5-9
    if (number >= 0 && number <= 4) {
        size = SIZES.SMALL;
    } else if (number >= 5 && number <= 9) {
        size = SIZES.BIG;
    }

    return {
        colors,
        size
    };
}

/**
 * Process a bet against the result.
 * @param {Object} bet { type: 'color'|'number'|'size', value: string|number, amount: number }
 * @param {Object} result { number: 0-9, colors: [], size: '' }
 */
function processBet(bet, result) {
    let win = false;
    let multiplier = 0;
    let payout = 0;

    // Bet Types:
    // 'color': 'red', 'green', 'violet'
    // 'size': 'big', 'small'
    // 'number': 0-9 (Optional extension, but focused on Color/Size for now)

    if (bet.type === 'color') {
        if (result.colors.includes(bet.value)) {
            // Determine Multiplier
            if (bet.value === COLORS.VIOLET) {
                multiplier = 4.5;
            } else {
                // Red or Green
                // Basic spec: 2x
                // Detailed WinGo logic often pays 1.5x if result was Violet, but 2x otherwise.
                // User Prompt: "Red / Green -> 2x" (Simplifying to fixed 2x for now unless specified)
                multiplier = 2; // Can be adjusted
            }
            win = true;
        }
    } else if (bet.type === 'size') {
        if (result.size === bet.value) {
            multiplier = 2; // Big/Small -> 2x
            win = true;
        }
    } else if (bet.type === 'number') {
        if (parseInt(bet.value) === result.number) {
            multiplier = 9; // Standard number payout
            win = true;
        }
    }

    if (win) {
        payout = bet.amount * multiplier;
    }

    return {
        isWin: win,
        multiplier,
        payout,
        profit: win ? payout - bet.amount : -bet.amount
    };
}

module.exports = {
    generateResult,
    analyzeResult,
    processBet,
    COLORS,
    SIZES,
    NUMBERS
};
