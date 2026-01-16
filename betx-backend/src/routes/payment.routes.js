const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    createOrder,
    verifyPayment,
    handleWebhook,
    getActivePaymentMethods
} = require('../controllers/paymentController');

// Razorpay Routes

/**
 * Webhook route - Should be public as Razorpay calls it
 * No auth middleware here
 */
router.post('/razorpay/webhook', handleWebhook);

/**
 * Secured routes
 */
router.use(protect);

router.post('/razorpay/order', createOrder);
router.post('/razorpay/verify', verifyPayment);
router.get('/methods', getActivePaymentMethods);

module.exports = router;
