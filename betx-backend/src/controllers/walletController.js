const supabase = require('../config/supabase');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');
const WalletService = require('../services/wallet.service');

/**
 * @route   GET /api/wallet/balance
 * @desc    Get wallet balances
 * @access  Private
 */
exports.getBalance = asyncHandler(async (req, res, next) => {
    const wallets = await WalletService.getUserWallets(req.user.id);

    res.status(200).json({
        success: true,
        data: wallets.map((w) => ({
            currency: w.currency,
            balance: w.balance,
            lockedBalance: w.lockedBalance,
            availableBalance: w.balance - w.lockedBalance,
            cryptoAddress: w.cryptoAddress,
        })),
    });
});

/**
 * @route   POST /api/wallet/deposit/initiate
 * @desc    Initiate deposit
 * @access  Private
 */
exports.initiateDeposit = asyncHandler(async (req, res, next) => {
    const { amount, currency = 'INR', paymentMethod } = req.body;

    if (!amount || amount <= 0) {
        return next(new AppError('Invalid deposit amount', 400));
    }

    // Get or create wallet
    let wallet = await WalletService.getOrCreateWallet(req.user.id, currency);

    // Get active admin QR
    const { data: adminQR, error } = await supabase
        .from('admin_qrs')
        .select('*')
        .eq('currency', currency)
        .eq('payment_method', paymentMethod)
        .eq('is_active', true)
        .order('usage_count', { ascending: true })
        .limit(1)
        .single();

    if (error || !adminQR) {
        return next(new AppError('Payment method not available', 503));
    }

    // Create pending transaction
    const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert({
            user_id: req.user.id,
            type: 'deposit',
            currency,
            amount,
            status: 'pending',
            payment_method: paymentMethod,
            payment_gateway: paymentMethod === 'crypto' ? 'tatum' : 'cashfree',
            balance_before: wallet.balance,
            metadata: {
                adminQRId: adminQR.id,
            },
        })
        .select()
        .single();

    if (txError) throw new AppError(txError.message, 500);

    // Update QR usage
    await supabase.from('admin_qrs').update({
        usage_count: adminQR.usage_count + 1,
        last_used_at: new Date()
    }).eq('id', adminQR.id);

    logger.info(`Deposit initiated: ${req.user.username} - ${amount} ${currency}`);

    res.status(200).json({
        success: true,
        message: 'Deposit initiated',
        data: {
            transactionId: transaction.id,
            amount,
            currency,
            paymentMethod,
            qrCode: adminQR.qr_code,
            upiId: adminQR.upi_id,
            cryptoAddress: adminQR.crypto_address,
            accountDetails: {
                accountNumber: adminQR.account_number,
                ifscCode: adminQR.ifsc_code,
                accountHolderName: adminQR.account_holder_name,
                bankName: adminQR.bank_name,
            },
            expiresAt: transaction.expires_at,
        },
    });
});

/**
 * @route   POST /api/wallet/withdraw
 * @desc    Request withdrawal
 * @access  Private
 */
exports.requestWithdrawal = asyncHandler(async (req, res, next) => {
    const { amount, currency = 'INR', method, details } = req.body;

    if (!amount || amount <= 0) {
        return next(new AppError('Invalid withdrawal amount', 400));
    }

    if (!method || !details) {
        return next(new AppError('Payment method and details required', 400));
    }

    // Get wallet
    let wallet = await WalletService.getWallet(req.user.id, currency);

    if (!wallet) {
        return next(new AppError('Wallet not found', 404));
    }

    // Check available balance
    if (wallet.balance - wallet.lockedBalance < amount) {
        return next(new AppError('Insufficient balance', 400));
    }

    // Lock funds (Update locked_balance)
    const newLocked = wallet.lockedBalance + parseFloat(amount);
    await supabase.from('wallets').update({ locked_balance: newLocked }).eq('id', wallet.id);

    // Create withdrawal transaction
    const { data: transaction, error } = await supabase
        .from('transactions')
        .insert({
            user_id: req.user.id,
            type: 'withdrawal',
            currency,
            amount,
            status: 'pending',
            payment_method: method,
            payment_gateway: method === 'crypto' ? 'tatum' : 'cashfree',
            balance_before: wallet.balance,
            metadata: {
                withdrawalDetails: details,
            },
        })
        .select()
        .single();

    if (error) {
        // Rollback lock if tx fails?
        await supabase.from('wallets').update({ locked_balance: wallet.lockedBalance }).eq('id', wallet.id);
        throw new AppError(error.message, 500);
    }

    logger.info(`Withdrawal requested: ${req.user.username} - ${amount} ${currency}`);

    res.status(200).json({
        success: true,
        message: 'Withdrawal request submitted',
        data: {
            transactionId: transaction.id,
            amount,
            currency,
            status: 'pending',
        },
    });
});

/**
 * @route   GET /api/wallet/transactions
 * @desc    Get transaction history
 * @access  Private
 */
exports.getTransactions = asyncHandler(async (req, res, next) => {
    const { page = 1, limit = 20, type, currency } = req.query;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
        .from('transactions')
        .select('*', { count: 'exact' })
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false })
        .range(from, to);

    if (type) query = query.eq('type', type);
    if (currency) query = query.eq('currency', currency);

    const { data, count, error } = await query;
    if (error) throw new AppError(error.message, 500);

    res.status(200).json({
        success: true,
        data: {
            transactions: data,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page),
            total: count,
        },
    });
});

/**
 * @route   POST /api/wallet/crypto/create
 * @desc    Create crypto wallet
 * @access  Private
 */
exports.createCryptoWallet = asyncHandler(async (req, res, next) => {
    const { currency } = req.body;

    if (!['BTC', 'ETH', 'TRON'].includes(currency)) {
        return next(new AppError('Invalid cryptocurrency', 400));
    }

    // Check if wallet already exists
    let wallet = await WalletService.getWallet(req.user.id, currency);

    if (wallet && wallet.cryptoAddress) {
        return res.status(200).json({
            success: true,
            message: 'Wallet already exists',
            data: {
                currency,
                address: wallet.cryptoAddress,
            },
        });
    }

    // TODO: Integrate with Tatum API to create wallet
    // For now, create placeholder
    if (!wallet) {
        wallet = await WalletService.getOrCreateWallet(req.user.id, currency);
    }

    // Update with placeholder address if not set
    if (!wallet.cryptoAddress) {
        const fakeAddress = 'PLACEHOLDER_ADDRESS_' + currency;
        await supabase
            .from('wallets')
            .update({
                crypto_address: fakeAddress,
                crypto_wallet_id: 'PLACEHOLDER_WALLET_ID'
            })
            .eq('id', wallet.id);

        wallet.cryptoAddress = fakeAddress;
    }

    logger.info(`Crypto wallet created: ${req.user.username} - ${currency}`);

    res.status(201).json({
        success: true,
        message: 'Crypto wallet created',
        data: {
            currency,
            address: wallet.cryptoAddress,
        },
    });
});

/**
 * @route   GET /api/wallet/crypto/address/:currency
 * @desc    Get crypto deposit address
 * @access  Private
 */
exports.getCryptoAddress = asyncHandler(async (req, res, next) => {
    const { currency } = req.params;

    const wallet = await WalletService.getWallet(req.user.id, currency);

    if (!wallet || !wallet.cryptoAddress) {
        return next(new AppError('Crypto wallet not found. Please create one first.', 404));
    }

    res.status(200).json({
        success: true,
        data: {
            currency,
            address: wallet.cryptoAddress,
            balance: wallet.balance,
        },
    });
});
