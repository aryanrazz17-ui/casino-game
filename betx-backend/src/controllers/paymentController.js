const Razorpay = require('razorpay');
const crypto = require('crypto');
const supabase = require('../config/supabase');
const config = require('../config/env');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const WalletService = require('../services/wallet.service');
const { logger } = require('../utils/logger');

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: config.RAZORPAY_KEY_ID,
    key_secret: config.RAZORPAY_KEY_SECRET,
});

/**
 * @desc    Create a new Razorpay Order
 * @route   POST /api/payment/razorpay/order
 * @access  Private
 */
exports.createOrder = asyncHandler(async (req, res, next) => {
    const { amount, currency = 'INR' } = req.body;

    if (!amount || amount < 1) {
        return next(new AppError('Please provide a valid amount (minimum ₹1)', 400));
    }

    // Razorpay expect amount in paise (1 INR = 100 Paise)
    const options = {
        amount: Math.round(amount * 100),
        currency: currency,
        receipt: `receipt_${Date.now()}_${req.user.id.substring(0, 8)}`,
    };

    try {
        const order = await razorpay.orders.create(options);

        // Store order in database as a pending transaction
        const { data: transaction, error } = await supabase
            .from('transactions')
            .insert({
                user_id: req.user.id,
                type: 'deposit',
                currency: currency,
                amount: amount,
                status: 'pending',
                payment_method: 'razorpay',
                payment_gateway: 'razorpay',
                gateway_order_id: order.id,
                metadata: {
                    receipt: options.receipt
                }
            })
            .select()
            .single();

        if (error) {
            logger.error('Failed to save transaction in DB:', error);
            return next(new AppError('Failed to initiate payment', 500));
        }

        res.status(200).json({
            success: true,
            data: {
                order_id: order.id,
                amount: order.amount,
                currency: order.currency,
                key_id: config.RAZORPAY_KEY_ID,
                transaction_id: transaction.id
            }
        });
    } catch (error) {
        logger.error('Razorpay Order Creation Error:', error);
        return next(new AppError('Payment gateway error', 502));
    }
});

/**
 * @desc    Verify Razorpay Signature and Capture Payment
 * @route   POST /api/payment/razorpay/verify
 * @access  Private
 */
exports.verifyPayment = asyncHandler(async (req, res, next) => {
    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        transaction_id
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return next(new AppError('Payment details missing', 400));
    }

    // 1. Verify Signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
        .createHmac('sha256', config.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

    const isSignatureValid = expectedSignature === razorpay_signature;

    if (!isSignatureValid) {
        // Log potentially fraudulent activity
        logger.warn(`Invalid payment signature attempt by User ${req.user.id}`);
        return next(new AppError('Invalid payment signature', 400));
    }

    // 2. Check if transaction already processed
    const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('gateway_order_id', razorpay_order_id)
        .single();

    if (txError || !transaction) {
        return next(new AppError('Transaction record not found', 404));
    }

    if (transaction.status === 'completed') {
        return res.status(200).json({
            success: true,
            message: 'Payment already verified and credited'
        });
    }

    // 3. Update Transaction and Credit Wallet
    try {
        // Use a transaction/RPC or sequential updates
        // Credit the wallet
        const wallet = await WalletService.credit(transaction.user_id, transaction.amount, transaction.currency);

        // Update transaction status
        const { error: updateError } = await supabase
            .from('transactions')
            .update({
                status: 'completed',
                gateway_transaction_id: razorpay_payment_id,
                balance_after: wallet.balance,
                processed_at: new Date(),
                metadata: {
                    ...transaction.metadata,
                    razorpay_payment_id,
                    razorpay_signature
                }
            })
            .eq('id', transaction.id);

        if (updateError) {
            logger.error('Failed to update transaction status:', updateError);
            // In a real production system, you'd want a reconciliation cron job for this
        }

        res.status(200).json({
            success: true,
            message: 'Payment verified and wallet credited',
            data: {
                transaction_id: transaction.id,
                new_balance: wallet.balance
            }
        });

    } catch (error) {
        logger.error('Credit/Update Error:', error);
        return next(new AppError('Internal server error during credit', 500));
    }
});

/**
 * @desc    Razorpay Webhook Handler
 * @route   POST /api/payment/razorpay/webhook
 * @access  Public (Secret verified)
 */
exports.handleWebhook = asyncHandler(async (req, res) => {
    const signature = req.headers['x-razorpay-signature'];
    const secret = config.RAZORPAY_WEBHOOK_SECRET;

    // Verify webhook signature
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(req.body))
        .digest('hex');

    if (expectedSignature !== signature) {
        logger.warn('Invalid Razorpay Webhook signature received');
        return res.status(400).send('Invalid signature');
    }

    const event = req.body;
    logger.info(`Razorpay Webhook Event: ${event.event}`);

    // Handle payment.captured event
    if (event.event === 'payment.captured') {
        const payment = event.payload.payment.entity;
        const orderId = payment.order_id;

        // Find transaction
        const { data: transaction, error: fetchError } = await supabase
            .from('transactions')
            .select('*')
            .eq('gateway_order_id', orderId)
            .single();

        if (fetchError || !transaction) {
            logger.warn(`Transaction for Order ID ${orderId} not found in webhook`);
            return res.status(200).json({ status: 'ok' }); // Always return 200 to Razorpay
        }

        if (transaction.status === 'pending') {
            try {
                // Credit wallet
                const wallet = await WalletService.credit(transaction.user_id, transaction.amount, transaction.currency);

                // Update transaction
                await supabase
                    .from('transactions')
                    .update({
                        status: 'completed',
                        gateway_transaction_id: payment.id,
                        balance_after: wallet.balance,
                        processed_at: new Date(),
                        metadata: {
                            ...transaction.metadata,
                            captured_via: 'webhook',
                            payment_id: payment.id
                        }
                    })
                    .eq('id', transaction.id);

                logger.info(`Payment captured via Webhook for Order ${orderId}`);
            } catch (err) {
                logger.error(`Webhook Credit Error: ${err.message}`);
                return res.status(500).json({ message: 'Internal error' });
            }
        }
    }

    res.status(200).json({ status: 'ok' });
});
