const supabase = require('../config/supabase');

/**
 * Deduct amount from user wallet with transaction safety and audit log
 */
exports.deduct = async (userId, amount, currency = 'INR', metadata = {}) => {
    const { data, error } = await supabase.rpc('deduct_balance', {
        p_user_id: userId,
        p_amount: amount,
        p_currency: currency
    });

    if (error) throw new Error(error.message);
    if (!data.success) throw new Error(data.message);

    // Automate transaction logging
    const balanceAfter = parseFloat(data.new_balance);
    const balanceBefore = balanceAfter + parseFloat(amount);

    await supabase.from('transactions').insert({
        user_id: userId,
        type: metadata.type || 'bet',
        currency,
        amount,
        status: 'completed',
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        game_type: metadata.gameType,
        reference_id: metadata.referenceId,
        metadata: metadata.meta || {},
        payment_gateway: 'internal'
    });

    return exports.getWallet(userId, currency);
};

/**
 * Credit amount to user wallet with audit log
 */
exports.credit = async (userId, amount, currency = 'INR', metadata = {}) => {
    const { data, error } = await supabase.rpc('add_balance', {
        p_user_id: userId,
        p_amount: amount,
        p_currency: currency
    });

    if (error) throw new Error(error.message);
    if (!data.success) throw new Error(data.message);

    // Automate transaction logging
    const balanceAfter = parseFloat(data.new_balance);
    const balanceBefore = balanceAfter - parseFloat(amount);

    await supabase.from('transactions').insert({
        user_id: userId,
        type: metadata.type || 'win',
        currency,
        amount,
        status: 'completed',
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        game_type: metadata.gameType,
        reference_id: metadata.referenceId,
        metadata: metadata.meta || {},
        payment_gateway: 'internal'
    });

    return exports.getWallet(userId, currency);
};

/**
 * Get or create wallet for user
 */
exports.getOrCreateWallet = async (userId, currency = 'INR') => {
    // Check if exists
    const existing = await exports.getWallet(userId, currency);
    if (existing) return existing;

    // Create
    const { data, error } = await supabase
        .from('wallets')
        .insert({
            user_id: userId,
            currency: currency,
            balance: 0,
            locked_balance: 0
        })
        .select()
        .single();

    if (error) throw new Error(error.message);
    return mapWallet(data);
};

/**
 * Get wallet balance
 */
exports.getBalance = async (userId, currency = 'INR') => {
    const wallet = await exports.getWallet(userId, currency);
    return wallet ? wallet.balance : 0;
};

/**
 * Get all user wallets
 */
exports.getUserWallets = async (userId) => {
    const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId);

    if (error) throw new Error(error.message);
    return data.map(mapWallet);
};

// Helper: Get single wallet
exports.getWallet = async (userId, currency) => {
    const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .eq('currency', currency)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw new Error(error.message);
    }
    return mapWallet(data);
};

// Helper: Map snake_case DB to camelCase JS
function mapWallet(data) {
    if (!data) return null;
    return {
        _id: data.id, // Keep _id for compatibility if needed, or switch to id
        id: data.id,
        userId: data.user_id,
        currency: data.currency,
        balance: parseFloat(data.balance),
        lockedBalance: parseFloat(data.locked_balance),
        cryptoAddress: data.crypto_address,
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };
}
