const crypto = require('crypto');

/**
 * Generate HMAC-SHA256 hash
 */
exports.generateHash = (seed) => {
    return crypto.createHash('sha256').update(seed).digest('hex');
};

/**
 * Generate random hex string
 */
exports.generateSeed = (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate deterministic float (0-1) from seeds
 */
exports.generateFloat = (serverSeed, clientSeed, nonce) => {
    const hash = crypto
        .createHmac('sha256', serverSeed)
        .update(`${clientSeed}:${nonce}`)
        .digest('hex');

    // Use first 8 hex chars (4 bytes) -> UInt32
    // Divide by max UInt32 to get 0-1 float
    const intValue = parseInt(hash.substring(0, 8), 16);
    return intValue / 0xffffffff;
};
