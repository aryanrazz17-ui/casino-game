const crypto = require('crypto');

/**
 * Enhanced Provably Fair Helper
 * Standardizes generation of provably fair results across all games.
 */

/**
 * Generate a random Server Seed (32 bytes hex)
 */
exports.generateServerSeed = () => {
    return crypto.randomBytes(32).toString('hex');
};

/**
 * Generate a random Client Seed (16 bytes hex)
 */
exports.generateClientSeed = () => {
    return crypto.randomBytes(16).toString('hex');
};

/**
 * Hash a seed using SHA256 (for public reveal before round)
 */
exports.hashSeed = (seed) => {
    return crypto.createHash('sha256').update(seed).digest('hex');
};

/**
 * Generate HMAC-SHA256 Hex String
 * Core PRNG function.
 */
exports.generateHmac = (serverSeed, clientSeed, nonce) => {
    return crypto
        .createHmac('sha256', serverSeed)
        .update(`${clientSeed}:${nonce}`)
        .digest('hex');
};

/**
 * Generate deterministic float (0 to 1)
 * Uses first 4 bytes of HMAC.
 */
exports.generateFloat = (serverSeed, clientSeed, nonce) => {
    const hash = exports.generateHmac(serverSeed, clientSeed, nonce);
    // Use first 8 hex chars (4 bytes) -> UInt32
    const intValue = parseInt(hash.substring(0, 8), 16);
    // Divide by max UInt32 to get 0-1 float
    return intValue / 0xffffffff;
};

/**
 * Generate deterministic integer within range [min, max]
 * Inclusive of min and max.
 */
exports.generateInt = (serverSeed, clientSeed, nonce, min, max) => {
    const float = exports.generateFloat(serverSeed, clientSeed, nonce);
    return Math.floor(float * (max - min + 1)) + min;
};

/**
 * Generate a list of random integers (e.g. for Plinko path)
 * Generates a distinct HMAC for each index using nonce:index.
 */
exports.generateIntSequence = (serverSeed, clientSeed, nonce, length, maxVal) => {
    const sequence = [];
    for (let i = 0; i < length; i++) {
        // We use a sub-nonce strategy: nonce:index
        const hash = crypto
            .createHmac('sha256', serverSeed)
            .update(`${clientSeed}:${nonce}:${i}`)
            .digest('hex');
        const val = parseInt(hash.substring(0, 8), 16);
        sequence.push(val % (maxVal + 1));
    }
    return sequence;
};

/**
 * Generate a shuffled list of numbers [0, ..., max-1]
 * Uses Fisher-Yates shuffle with PRNG.
 * Useful for Mines, Keno, Deck of Cards.
 */
exports.generateShuffle = (serverSeed, clientSeed, nonce, length) => {
    // Initialize array [0, 1, ... length-1]
    const array = Array.from({ length }, (_, i) => i);

    // Fisher-Yates Shuffle
    for (let i = length - 1; i > 0; i--) {
        // Generate random index j such that 0 <= j <= i
        // Use sub-nonce: nonce:i
        const hash = crypto
            .createHmac('sha256', serverSeed)
            .update(`${clientSeed}:${nonce}:${i}`)
            .digest('hex');

        const randomInt = parseInt(hash.substring(0, 8), 16);
        const j = randomInt % (i + 1);

        // Swap
        [array[i], array[j]] = [array[j], array[i]];
    }

    return array;
};

// Aliases for compatibility
exports.generateHash = exports.hashSeed;
exports.generateSeed = (length = 32) => crypto.randomBytes(length).toString('hex');
