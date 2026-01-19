const express = require('express');
const router = express.Router();
const rouletteController = require('../controllers/rouletteController');
const { protect } = require('../middleware/auth');

router.post('/bet', protect, rouletteController.bet);

module.exports = router;
