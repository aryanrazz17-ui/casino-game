const supabase = require('../config/supabase');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

/**
 * @route   GET /api/user/history
 * @desc    Get unified user transaction and game history
 * @access  Private
 */
exports.getHistory = asyncHandler(async (req, res, next) => {
    const { page = 1, limit = 20, tab = 'all' } = req.query;
    const userId = req.user.id;
    const p = parseInt(page);
    const l = parseInt(limit);

    let unifiedHistory = [];
    let totalCount = 0;
    let gameCount = 0;
    let txCount = 0;

    if (tab === 'all' || tab === 'bets') {
        const { data: games, count: gCount, error: gameError } = await supabase
            .from('games')
            .select('*', { count: 'exact' })
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range((p - 1) * l, p * l - 1);

        if (gameError) throw new AppError(gameError.message, 500);
        gameCount = gCount || 0;

        const gameEntries = games.map(g => ({
            id: g.id,
            type: 'game',
            game: g.game_type,
            amount: parseFloat(g.bet_amount),
            payout: parseFloat(g.payout),
            multiplier: g.multiplier,
            status: g.payout > g.bet_amount ? 'completed' : (g.payout === g.bet_amount ? 'processing' : 'failed'),
            gameStatus: g.payout > g.bet_amount ? 'WIN' : (g.payout === g.bet_amount ? 'PUSH' : 'LOSS'),
            result: g.result,
            time: g.created_at,
            currency: g.currency,
            referenceId: g.round_id || g.id
        }));

        if (tab === 'bets') {
            unifiedHistory = gameEntries;
            totalCount = gameCount;
        } else {
            unifiedHistory.push(...gameEntries);
        }
    }

    if (tab === 'all' || tab === 'deposits' || tab === 'withdrawals' || tab === 'bets') {
        let txQuery = supabase
            .from('transactions')
            .select('*', { count: 'exact' })
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (tab === 'deposits') {
            txQuery = txQuery.eq('type', 'deposit');
        } else if (tab === 'withdrawals') {
            txQuery = txQuery.eq('type', 'withdrawal');
        } else if (tab === 'bets') {
            txQuery = txQuery.in('type', ['bet', 'win']);
        } else {
            txQuery = txQuery.in('type', ['deposit', 'withdrawal', 'bet', 'win']);
        }

        const { data: txs, count: tCount, error: txError } = await txQuery.range((p - 1) * l, p * l - 1);

        if (txError) throw new AppError(txError.message, 500);
        txCount = tCount || 0;

        const txEntries = txs.map(t => ({
            id: t.id,
            type: t.type,
            amount: parseFloat(t.amount),
            payout: (t.type === 'deposit' || t.type === 'win') ? parseFloat(t.amount) : 0,
            status: t.status,
            time: t.created_at,
            currency: t.currency,
            method: t.payment_method,
            game: t.game_type,
            balanceAfter: t.balance_after,
            referenceId: t.reference_id || t.gateway_transaction_id
        }));

        if (tab !== 'all' && tab !== 'bets') {
            unifiedHistory = txEntries;
            totalCount = txCount;
        } else if (tab === 'bets') {
            // Combine game records and transactions for the bets tab if needed, 
            // but usually transactions alone are fine or games alone are fine.
            // Let's stick to transactions for the 'bets' tab if we want to see individual movements.
            // Or better, keep both but ensure no duplicates.
            // For now, let's just use txEntries for the bets tab as requested.
            unifiedHistory = txEntries;
            totalCount = txCount;
        } else {
            unifiedHistory.push(...txEntries);
            unifiedHistory.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
            unifiedHistory = unifiedHistory.slice(0, l);
            totalCount = gameCount + txCount;
        }
    }

    res.status(200).json({
        success: true,
        data: {
            history: unifiedHistory,
            pagination: {
                total: totalCount,
                page: p,
                limit: l,
                totalPages: Math.ceil(totalCount / l)
            }
        }
    });
});
