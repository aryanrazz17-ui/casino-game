const supabase = require('../config/supabase');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');
const WalletService = require('../services/wallet.service');
const { uploadFromBuffer } = require('../utils/cloudinary');

/**
 * @route   GET /api/admin/stats
 * @desc    Get comprehensive platform statistics
 * @access  Private (Admin)
 */
exports.getStats = asyncHandler(async (req, res, next) => {
    const { period = 'all' } = req.query;

    const { data, error } = await supabase.rpc('get_admin_stats', { p_period: period });

    if (error) {
        throw new AppError(error.message, 500);
    }

    res.status(200).json({
        success: true,
        data: {
            ...data,
            period
        }
    });
});

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with filters
 * @access  Private (Admin)
 */
exports.getUsers = asyncHandler(async (req, res, next) => {
    const { page = 1, limit = 20, search, isActive, role, sortBy = 'created_at', order = 'desc' } = req.query;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
        .from('users')
        .select('*', { count: 'exact' })
        .order(sortBy === 'createdAt' ? 'created_at' : sortBy, { ascending: order === 'asc' })
        .range(from, to);

    if (search) {
        query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (isActive !== undefined) {
        query = query.eq('is_active', isActive === 'true');
    }

    if (role) {
        query = query.eq('role', role);
    }

    const { data: users, count, error } = await query;

    if (error) throw new AppError(error.message, 500);

    const userIds = users.map(u => u.id);
    const { data: wallets } = await supabase.from('wallets').select('*').in('user_id', userIds);

    const usersWithWallets = users.map(user => {
        const userWallets = wallets.filter(w => w.user_id === user.id);
        return {
            _id: user.id, // Compat
            ...user,
            wallets: userWallets.map(w => ({
                currency: w.currency,
                balance: parseFloat(w.balance)
            })),
            stats: { totalGames: 0, totalWagered: 0 }
        };
    });

    res.status(200).json({
        success: true,
        data: {
            users: usersWithWallets,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page),
            total: count,
        },
    });
});

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get user details
 * @access  Private (Admin)
 */
exports.getUserDetails = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    const { data: user, error } = await supabase.from('users').select('*').eq('id', id).single();

    if (error || !user) {
        return next(new AppError('User not found', 404));
    }

    const { data: wallets } = await supabase.from('wallets').select('*').eq('user_id', id);
    const { data: recentTransactions } = await supabase.from('transactions')
        .select('*')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(10);

    const { data: recentGames } = await supabase.from('games')
        .select('*')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(10);

    res.status(200).json({
        success: true,
        data: {
            user: { ...user, _id: user.id },
            wallets: wallets.map(w => ({ ...w, balance: parseFloat(w.balance) })),
            gameStats: [],
            recentTransactions,
            recentGames,
        },
    });
});

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update user
 * @access  Private (Admin)
 */
exports.updateUser = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const { isActive, isVerified, role, notes } = req.body;

    const updates = {};
    if (isActive !== undefined) updates.is_active = isActive;
    if (isVerified !== undefined) updates.is_verified = isVerified;
    if (role) updates.role = role;

    const { data: user, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw new AppError(error.message, 500);

    logger.info(`User updated by admin ${req.user.username}: ${user.username} - ${notes || 'No notes'}`);

    res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: user
    });
});

/**
 * @route   POST /api/admin/users/:id/adjust-balance
 * @desc    Manually adjust user wallet balance
 * @access  Private (Admin)
 */
exports.adjustUserBalance = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const { currency, amount, type, reason } = req.body;

    if (!['add', 'deduct'].includes(type)) {
        return next(new AppError('Type must be "add" or "deduct"', 400));
    }

    if (!amount || amount <= 0) return next(new AppError('Invalid amount', 400));

    let wallet;
    try {
        if (type === 'add') {
            wallet = await WalletService.credit(id, parseFloat(amount), currency);
        } else {
            wallet = await WalletService.deduct(id, parseFloat(amount), currency);
        }
    } catch (e) {
        return next(new AppError(e.message, 400));
    }

    // Log transaction
    await supabase.from('transactions').insert({
        user_id: id,
        type: type === 'add' ? 'bonus' : 'refund',
        currency,
        amount: parseFloat(amount),
        status: 'completed',
        payment_gateway: 'admin',
        metadata: {
            adjustedBy: req.user.id,
            reason: reason || 'Manual adjustment'
        }
    });

    res.status(200).json({
        success: true,
        message: `Balance ${type}ed successfully`,
        data: wallet
    });
});

/**
 * @route   GET /api/admin/transactions
 * @desc    Get all transactions
 * @access  Private (Admin)
 */
exports.getTransactions = asyncHandler(async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { type, status, currency, userId } = req.query;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
        .from('transactions')
        .select('*, user:users!user_id(username, email)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

    if (type && type !== 'all') query = query.eq('type', type);
    if (status && status !== 'all') query = query.eq('status', status);
    if (currency) query = query.eq('currency', currency);
    if (userId) query = query.eq('user_id', userId);

    const { data, count, error } = await query;
    if (error) {
        logger.error('Database error in getTransactions:', error);
        throw new AppError(error.message, 500);
    }

    res.status(200).json({
        success: true,
        data: {
            transactions: data || [],
            total: count || 0,
            totalPages: Math.ceil((count || 0) / limit),
            currentPage: page
        }
    });
});

/**
 * @route   PUT /api/admin/withdrawals/:id
 * @desc    Approve or reject withdrawal
 * @access  Private (Admin)
 */
exports.updateWithdrawal = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const { action, notes } = req.body;

    const { data: tx } = await supabase.from('transactions').select('*').eq('id', id).single();
    if (!tx) return next(new AppError('Transaction not found', 404));

    if (tx.status !== 'pending') {
        return next(new AppError('Transaction already processed', 400));
    }

    if (action === 'approve') {
        const { error } = await supabase.from('transactions').update({
            status: 'completed',
            metadata: { ...tx.metadata, notes, approvedAt: new Date() }
        }).eq('id', id);
        if (error) throw new AppError(error.message, 500);

        // Approve: Reduce Balance AND Locked Balance
        // Get Wallet
        const { data: wallet } = await supabase.from('wallets')
            .select('*')
            .eq('user_id', tx.user_id)
            .eq('currency', tx.currency)
            .single();

        if (wallet) {
            await supabase.from('wallets').update({
                balance: wallet.balance - tx.amount,
                locked_balance: wallet.locked_balance - tx.amount
            }).eq('id', wallet.id);
        }

    } else if (action === 'reject') {
        const { error } = await supabase.from('transactions').update({
            status: 'failed',
            metadata: { ...tx.metadata, notes, rejectedAt: new Date() }
        }).eq('id', id);
        if (error) throw new AppError(error.message, 500);

        // Reject: Reduce Locked Balance only (Funds return to Available)
        const { data: wallet } = await supabase.from('wallets')
            .select('*')
            .eq('user_id', tx.user_id)
            .eq('currency', tx.currency)
            .single();

        if (wallet) {
            await supabase.from('wallets').update({
                locked_balance: wallet.locked_balance - tx.amount
            }).eq('id', wallet.id);
        }
    }

    res.status(200).json({
        success: true,
        message: `Withdrawal ${action}ed successfully`
    });
});

/**
 * @route   PUT /api/admin/deposits/:id
 * @desc    Approve or reject manual deposit
 * @access  Private (Admin)
 */
exports.updateDeposit = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const { action, notes } = req.body;
    const io = req.app.get('io');

    const { data: tx } = await supabase.from('transactions').select('*').eq('id', id).single();
    if (!tx) return next(new AppError('Transaction not found', 404));

    if (tx.status !== 'pending' || tx.type !== 'deposit') {
        return next(new AppError('This transaction is not a pending deposit or has already been processed', 400));
    }

    if (action === 'approve') {
        // 1. Ensure the user has provided essential verification info
        // We check for UTR/Transaction ID in metadata
        if (!tx.metadata?.utr && !tx.gateway_transaction_id) {
            return next(new AppError('Verification failed: Transaction ID (UTR) is missing from the request', 400));
        }

        // 2. Proof of payment check (Image)
        const hasImage = tx.metadata?.transaction_image || tx.metadata?.proof_image;
        if (!hasImage) {
            return next(new AppError('Verification failed: No transaction proof image found. User must upload a screenshot.', 400));
        }

        // 3. Credit the wallet
        const wallet = await WalletService.credit(tx.user_id, tx.amount, tx.currency);

        // 4. Update the transaction record
        const { error } = await supabase.from('transactions').update({
            status: 'completed',
            balance_after: wallet.balance,
            processed_at: new Date(),
            metadata: {
                ...tx.metadata,
                notes,
                approvedAt: new Date(),
                verifiedBy: 'admin'
            }
        }).eq('id', id);

        if (error) {
            logger.error('Error updating transaction after credit:', error);
            throw new AppError('Wallet credited but transaction log update failed', 500);
        }

        // 5. Real-time Notification via Socket.IO
        if (io) {
            io.to(`user:${tx.user_id}`).emit('wallet_update', {
                type: 'deposit_approved',
                message: `Success! Your deposit of ${tx.amount} ${tx.currency} has been credited to your wallet.`,
                amount: tx.amount,
                currency: tx.currency,
                newBalance: wallet.balance,
                transactionId: tx.id
            });
        }

        res.status(200).json({
            success: true,
            message: 'Deposit verified and wallet credited successfully',
            data: {
                transactionId: tx.id,
                amount: tx.amount,
                currency: tx.currency,
                newBalance: wallet.balance
            }
        });

    } else if (action === 'reject') {
        const { error } = await supabase.from('transactions').update({
            status: 'failed',
            metadata: {
                ...tx.metadata,
                notes,
                rejectedAt: new Date()
            }
        }).eq('id', id);

        if (error) throw new AppError(error.message, 500);

        // Notify rejection
        if (io) {
            io.to(`user:${tx.user_id}`).emit('notification', {
                type: 'deposit_rejected',
                message: `Your deposit request for ${tx.amount} ${tx.currency} was rejected. Reason: ${notes || 'Verification failed'}`,
                severity: 'error'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Deposit request rejected'
        });
    }
});

/**
 * @route   GET /api/admin/games
 * @desc    Get all game records
 * @access  Private (Admin)
 */
exports.getGames = asyncHandler(async (req, res, next) => {
    const { page = 1, limit = 20, gameType, userId, isWin, startDate, endDate, search } = req.query;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
        .from('games')
        .select('*, user:users!inner(username, email)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

    if (gameType && gameType !== 'all') query = query.eq('game_type', gameType);
    if (userId) query = query.eq('user_id', userId);

    if (isWin !== undefined && isWin !== 'all') {
        query = query.eq('is_win', isWin === 'true');
    }

    if (startDate) {
        query = query.gte('created_at', new Date(startDate).toISOString());
    }

    if (endDate) {
        // Add one day to include the full end date
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        query = query.lt('created_at', end.toISOString());
    }

    if (search) {
        // Search by username or email via join
        query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%`, { foreignTable: 'users' });
    }

    const { data, count, error } = await query;
    if (error) throw new AppError(error.message, 500);

    res.status(200).json({
        success: true,
        data: {
            games: data,
            total: count,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page)
        }
    });
});

/**
 * @route   GET /api/admin/games/leaderboard
 * @desc    Get leaderboard
 * @access  Private (Admin)
 */
exports.getLeaderboard = asyncHandler(async (req, res, next) => {
    const { gameType = 'dice', limit = 10 } = req.query;

    const { data, error } = await supabase.rpc('get_game_leaderboard', {
        p_game_type: gameType,
        p_limit: parseInt(limit)
    });

    if (error) throw new AppError(error.message, 500);

    res.status(200).json({
        success: true,
        data: data
    });
});

/**
 * @route   POST /api/admin/qr/upload
 * @desc    Upload new Admin QR
 * @access  Private (Admin)
 */
exports.uploadQR = asyncHandler(async (req, res, next) => {
    const { currency, paymentMethod, qrCode, upiId, accountDetails, cryptoAddress, minAmount, maxAmount } = req.body;

    const { data, error } = await supabase.from('admin_qrs').insert({
        currency,
        payment_method: paymentMethod,
        qr_code: qrCode,
        upi_id: upiId,
        account_number: accountDetails?.accountNumber,
        ifsc_code: accountDetails?.ifscCode,
        account_holder_name: accountDetails?.accountHolderName,
        bank_name: accountDetails?.bankName,
        crypto_address: cryptoAddress,
        min_amount: minAmount,
        max_amount: maxAmount,
        uploaded_by: req.user.id
    }).select().single();

    if (error) throw new AppError(error.message, 500);

    res.status(201).json({
        success: true,
        message: 'QR code uploaded successfully',
        data
    });
});

/**
 * @route   GET /api/admin/qr
 * @desc    Get all Admin QRs
 * @access  Private (Admin)
 */
exports.getQRs = asyncHandler(async (req, res, next) => {
    const { currency } = req.query;

    let query = supabase.from('admin_qrs').select('*').order('created_at', { ascending: false });
    if (currency) query = query.eq('currency', currency);

    const { data, error } = await query;
    if (error) throw new AppError(error.message, 500);

    res.status(200).json({
        success: true,
        data
    });
});

/**
 * @route   PUT /api/admin/qr/:id
 * @desc    Update Admin QR
 * @access  Private (Admin)
 */
exports.updateQR = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const updates = req.body;

    // Map body to snake_case column names if needed or assume body is correct?
    // Let's safe map
    const safeUpdates = {};
    if (updates.isActive !== undefined) safeUpdates.is_active = updates.isActive;
    if (updates.minAmount) safeUpdates.min_amount = updates.minAmount;
    if (updates.maxAmount) safeUpdates.max_amount = updates.maxAmount;
    if (updates.dailyLimit) safeUpdates.daily_limit = updates.dailyLimit;
    if (updates.upiId) safeUpdates.upi_id = updates.upiId;

    const { data, error } = await supabase
        .from('admin_qrs')
        .update(safeUpdates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw new AppError(error.message, 500);

    res.status(200).json({
        success: true,
        message: 'QR updated',
        data
    });
});

/**
 * @route   DELETE /api/admin/qr/:id
 * @desc    Delete Admin QR
 * @access  Private (Admin)
 */
exports.deleteQR = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    const { error } = await supabase.from('admin_qrs').delete().eq('id', id);

    if (error) throw new AppError(error.message, 500);

    res.status(200).json({
        success: true,
        message: 'QR deleted successfully'
    });
});
/**
 * @route   GET /api/admin/payment-methods
 * @desc    Get all payment methods
 * @access  Private (Admin)
 */
exports.getAdminPaymentMethods = asyncHandler(async (req, res, next) => {
    const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw new AppError(error.message, 500);

    res.status(200).json({
        success: true,
        data
    });
});

/**
 * @route   POST /api/admin/payment-methods
 * @desc    Add new payment method
 * @access  Private (Admin)
 */
exports.addPaymentMethod = asyncHandler(async (req, res, next) => {
    const { name, upiId } = req.body;
    let qrImageUrl = req.body.qrImageUrl;

    if (!name) return next(new AppError('Payment method name is required', 400));

    // Handle file upload if present
    if (req.file) {
        try {
            const result = await uploadFromBuffer(req.file.buffer, 'payment_methods');
            qrImageUrl = result.secure_url;
        } catch (err) {
            logger.error('Cloudinary upload error:', err);
            return next(new AppError('Failed to upload QR image', 500));
        }
    }

    const { data, error } = await supabase
        .from('payment_methods')
        .insert({
            name,
            upi_id: upiId,
            qr_image_url: qrImageUrl,
            is_active: true
        })
        .select()
        .single();

    if (error) {
        logger.error('Error adding payment method:', error);
        throw new AppError(error.message, 500);
    }

    res.status(201).json({
        success: true,
        message: 'Payment method added successfully',
        data
    });
});

/**
 * @route   PUT /api/admin/payment-methods/:id
 * @desc    Update payment method (status, etc)
 * @access  Private (Admin)
 */
exports.updatePaymentMethod = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const { name, upiId, isActive } = req.body;
    let qrImageUrl = req.body.qrImageUrl;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (upiId !== undefined) updates.upi_id = upiId;
    if (isActive !== undefined) updates.is_active = isActive;

    // Handle file upload if present
    if (req.file) {
        try {
            const result = await uploadFromBuffer(req.file.buffer, 'payment_methods');
            updates.qr_image_url = result.secure_url;
        } catch (err) {
            logger.error('Cloudinary upload error:', err);
            return next(new AppError('Failed to upload QR image', 500));
        }
    } else if (qrImageUrl !== undefined) {
        updates.qr_image_url = qrImageUrl;
    }

    const { data, error } = await supabase
        .from('payment_methods')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        logger.error('Error updating payment method:', error);
        throw new AppError(error.message, 500);
    }

    res.status(200).json({
        success: true,
        message: 'Payment method updated successfully',
        data
    });
});

/**
 * @route   DELETE /api/admin/payment-methods/:id
 * @desc    Delete payment method
 * @access  Private (Admin)
 */
exports.deletePaymentMethod = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', id);

    if (error) throw new AppError(error.message, 500);

    res.status(200).json({
        success: true,
        message: 'Payment method deleted successfully'
    });
});
