const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { validateWithdrawal } = require('../middleware/validation');
const { withdrawalLimiter } = require('../middleware/rateLimit');
const {
    getBalance,
    initiateDeposit,
    submitManualDeposit,
    requestWithdrawal,
    getTransactions,
    createCryptoWallet,
    getCryptoAddress,
} = require('../controllers/walletController');

// All routes require authentication
router.use(protect);

// Wallet balance
router.get('/balance', getBalance);

// Deposit
router.post('/deposit/initiate', initiateDeposit);
router.post('/deposit/manual', submitManualDeposit);

// Withdrawal
router.post('/withdraw', withdrawalLimiter, validateWithdrawal, requestWithdrawal);

// Transactions
router.get('/transactions', getTransactions);

// Crypto wallet
router.post('/crypto/create', createCryptoWallet);
router.get('/crypto/address/:currency', getCryptoAddress);

module.exports = router;
