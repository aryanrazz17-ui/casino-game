require('dotenv').config();

module.exports = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 7000,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',

  // Supabase
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,

  // Database (Legacy - to be removed)
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/betx',
  MONGODB_TEST_URI: process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/betx_test',

  // Redis
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'fallback-secret-key',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '15m',
  JWT_REFRESH_EXPIRE: process.env.JWT_REFRESH_EXPIRE || '7d',

  // Admin
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'Shubhash',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'razzsubhu@gmail.com',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'Admin@123456',

  // Cashfree
  CASHFREE_APP_ID: process.env.CASHFREE_APP_ID,
  CASHFREE_SECRET_KEY: process.env.CASHFREE_SECRET_KEY,
  CASHFREE_ENV: process.env.CASHFREE_ENV || 'sandbox',
  CASHFREE_WEBHOOK_SECRET: process.env.CASHFREE_WEBHOOK_SECRET,

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

  // Tatum
  TATUM_API_KEY: process.env.TATUM_API_KEY,
  TATUM_TESTNET: process.env.TATUM_TESTNET === 'true',

  // Security
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS) || 12,
  MAX_LOGIN_ATTEMPTS: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
  LOCK_TIME: parseInt(process.env.LOCK_TIME) || 15,

  // Rate Limiting
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW) || 15,
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,

  // Game Config
  MIN_BET_AMOUNT: parseFloat(process.env.MIN_BET_AMOUNT) || 10,
  MAX_BET_AMOUNT: parseFloat(process.env.MAX_BET_AMOUNT) || 100000,
  HOUSE_EDGE: parseFloat(process.env.HOUSE_EDGE) || 0.02,
};
