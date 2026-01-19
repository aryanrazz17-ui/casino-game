const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getHistory } = require('../controllers/userController');

// All routes require authentication
router.use(protect);

/**
 * @route   GET /api/user/history
 * @desc    Get unified user transaction and game history
 * @access  Private
 */
router.get('/history', getHistory);

module.exports = router;
