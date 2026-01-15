const Redis = require('ioredis');
const config = require('./env');

let redisClient = null;

const connectRedis = () => {
    try {
        redisClient = new Redis(config.REDIS_URL, {
            password: config.REDIS_PASSWORD || undefined,
            retryStrategy: (times) => {
                if (times > 5) {
                    console.error('❌ Redis retry limit reached. Disconnecting...');
                    return null; // Stop retrying
                }
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
            maxRetriesPerRequest: 3,
        });

        redisClient.on('connect', () => {
            console.log('✅ Redis Connected');
        });

        redisClient.on('error', (err) => {
            // Only log if it's not the "retry limit reached" disconnection
            if (err.message !== 'Connection is closed.') {
                console.error('❌ Redis connection error:', err.message);
            }
        });

        redisClient.on('reconnecting', () => {
            console.log('⚠️ Redis reconnecting...');
        });

        return redisClient;
    } catch (error) {
        console.error('❌ Redis initialization failed:', error.message);
        return null; // Return null on init failure
    }
};

const getRedisClient = () => {
    // If client exists but status is 'end', it means we gave up. Return null.
    if (redisClient && redisClient.status === 'end') {
        return null;
    }
    if (!redisClient) {
        return connectRedis();
    }
    return redisClient;
};

module.exports = { connectRedis, getRedisClient };
