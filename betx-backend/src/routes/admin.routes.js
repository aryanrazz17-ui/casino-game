const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimit');
const {
    getStats,
    getUsers,
    getUserDetails,
    updateUser,
    adjustUserBalance,
    getTransactions,
    updateWithdrawal,
    getGames,
    getLeaderboard,
    uploadQR,
    getQRs,
    updateQR,
    deleteQR,
} = require('../controllers/adminController');

// All routes require admin authentication
router.use(protect);
router.use(authorize('admin'));
router.use(apiLimiter);

// Dashboard & Statistics
router.get('/stats', getStats);
router.get('/games/leaderboard', getLeaderboard);

// User Management
router.get('/users', getUsers);
router.get('/users/:id', getUserDetails);
router.put('/users/:id', updateUser);
router.post('/users/:id/adjust-balance', adjustUserBalance);

// Transaction Management
router.get('/transactions', getTransactions);
router.put('/withdrawals/:id', updateWithdrawal);

// Game Monitoring
router.get('/games', getGames);

// Payment QR Management
router.post('/qr/upload', uploadQR);
router.get('/qr', getQRs);
router.put('/qr/:id', updateQR);
router.delete('/qr/:id', deleteQR);

module.exports = router;
