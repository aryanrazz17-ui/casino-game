const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Derive encryption key from password
 */
function deriveKey(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha512');
}

/**
 * Encrypt data
 */
function encrypt(text, password) {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = deriveKey(password, salt);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    return Buffer.concat([salt, iv, tag, Buffer.from(encrypted, 'hex')]).toString('base64');
}

/**
 * Decrypt data
 */
function decrypt(encryptedData, password) {
    const buffer = Buffer.from(encryptedData, 'base64');

    const salt = buffer.slice(0, SALT_LENGTH);
    const iv = buffer.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = buffer.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = buffer.slice(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    const key = deriveKey(password, salt);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

/**
 * Generate SHA256 hash
 */
function hash(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generate HMAC SHA256
 */
function hmac(data, secret) {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Generate random string
 */
function randomString(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate provably fair server seed
 */
function generateServerSeed() {
    return randomString(32);
}

/**
 * Generate provably fair hash
 */
function generateHash(serverSeed, clientSeed, nonce) {
    return hash(`${serverSeed}:${clientSeed}:${nonce}`);
}

/**
 * Generate random number from hash (for provably fair games)
 */
function generateRandomNumber(serverSeed, clientSeed, nonce, max = 100) {
    const hashValue = generateHash(serverSeed, clientSeed, nonce);
    const hex = hashValue.substring(0, 8);
    const decimal = parseInt(hex, 16);
    return (decimal % (max * 100)) / 100;
}

module.exports = {
    encrypt,
    decrypt,
    hash,
    hmac,
    randomString,
    generateServerSeed,
    generateHash,
    generateRandomNumber,
};
