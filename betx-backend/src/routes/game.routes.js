const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    getGameHistory,
    getGameStats,
    getLeaderboard,
    verifyGame,
    getRecentGames,
} = require('../controllers/gameController');

// Public routes
router.get('/leaderboard', getLeaderboard);
router.get('/verify/:gameId', verifyGame);
router.get('/recent', getRecentGames);

// Protected routes
router.get('/history', protect, getGameHistory);
router.get('/stats', protect, getGameStats);

module.exports = router;
