const supabase = require('../config/supabase');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');
const WalletService = require('../services/wallet.service');

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
    const { page = 1, limit = 20, type, status, currency, userId } = req.query;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
        .from('transactions')
        .select('*, user:users(username, email)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

    if (type) query = query.eq('type', type);
    if (status) query = query.eq('status', status);
    if (currency) query = query.eq('currency', currency);
    if (userId) query = query.eq('user_id', userId);

    const { data, count, error } = await query;
    if (error) throw new AppError(error.message, 500);

    res.status(200).json({
        success: true,
        data: {
            transactions: data,
            total: count,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page)
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

    res.status(200).json({ success: true, message: `Withdrawal ${action}ed` });
});

/**
 * @route   GET /api/admin/games
 * @desc    Get all game records
 * @access  Private (Admin)
 */
exports.getGames = asyncHandler(async (req, res, next) => {
    const { page = 1, limit = 20, gameType, userId } = req.query;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
        .from('games')
        .select('*, user:users(username)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

    if (gameType) query = query.eq('game_type', gameType);
    if (userId) query = query.eq('user_id', userId);

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
