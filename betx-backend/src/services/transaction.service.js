const supabase = require('../config/supabase');

/**
 * Create a transaction record
 */
exports.createTransaction = async (data) => {
    // Map camelCase to snake_case
    const dbData = {
        user_id: data.userId,
        type: data.type,
        currency: data.currency,
        amount: data.amount,
        status: data.status || 'pending',
        payment_method: data.paymentMethod,
        payment_gateway: data.paymentGateway,
        gateway_transaction_id: data.gatewayTransactionId,
        gateway_order_id: data.gatewayOrderId,
        balance_before: data.balanceBefore || 0,
        balance_after: data.balanceAfter || 0,
        metadata: data.metadata || {},
        notes: data.notes
    };

    const { data: tx, error } = await supabase
        .from('transactions')
        .insert(dbData)
        .select()
        .single();

    if (error) throw new Error(error.message);

    return tx;
};

/**
 * Get user balance from transactions (Verification only, wallet is source of truth)
 */
exports.auditUserBalance = async (userId, currency) => {
    const { data, error } = await supabase.from('transactions')
        .select('amount, type')
        .eq('user_id', userId)
        .eq('currency', currency)
        .eq('status', 'completed');

    if (error) throw new Error(error.message);

    return data.reduce((acc, tx) => {
        if (['deposit', 'win', 'bonus', 'refund'].includes(tx.type)) {
            return acc + parseFloat(tx.amount);
        } else if (['withdrawal', 'bet'].includes(tx.type)) {
            return acc - parseFloat(tx.amount);
        }
        return acc;
    }, 0);
};
