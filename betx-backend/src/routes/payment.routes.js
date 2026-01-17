const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    getActivePaymentMethods
} = require('../controllers/paymentController');

/**
 * Secured routes
 */
router.use(protect);

router.get('/methods', getActivePaymentMethods);

module.exports = router;
