const supabase = require('../config/supabase');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

/**
 * @route   GET /api/games/history
 * @desc    Get user's game history
 * @access  Private
 */
exports.getGameHistory = asyncHandler(async (req, res, next) => {
    const { page = 1, limit = 20, gameType } = req.query;

    let query = supabase
        .from('games')
        .select('*', { count: 'exact' })
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

    if (gameType) {
        query = query.eq('game_type', gameType);
    }

    const { data: games, count, error } = await query;

    if (error) {
        throw new AppError(error.message, 500);
    }

    // Map fields if necessary (snake_case -> camelCase is often handled by frontend, but let's be consistent with old API)
    // Old API returned camelCase. Supabase returns snake_case.
    // For minimal disruption, we should map.
    const mappedGames = games.map(g => ({
        _id: g.id,
        userId: g.user_id,
        gameType: g.game_type,
        betAmount: g.bet_amount,
        payout: g.payout,
        multiplier: g.multiplier,
        profit: g.profit,
        isWin: g.is_win,
        result: g.result,
        fairness: {
            serverSeedHash: g.server_seed_hash,
            clientSeed: g.client_seed,
            nonce: g.nonce,
            revealed: g.revealed
        },
        createdAt: g.created_at
    }));

    res.status(200).json({
        success: true,
        data: {
            games: mappedGames,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page),
            total: count,
        },
    });
});

/**
 * @route   GET /api/games/stats
 * @desc    Get user's game statistics
 * @access  Private
 */
exports.getGameStats = asyncHandler(async (req, res, next) => {
    const { gameType } = req.query;

    const { data, error } = await supabase.rpc('get_user_stats', {
        p_user_id: req.user.id,
        p_game_type: gameType || null
    });

    if (error) throw new AppError(error.message, 500);

    // Calculate winRate
    const stats = data || {};
    stats.winRate = stats.totalGames > 0 ? (stats.totalWins / stats.totalGames) * 100 : 0;

    res.status(200).json({
        success: true,
        data: stats,
    });
});

/**
 * @route   GET /api/games/leaderboard
 * @desc    Get game leaderboard
 * @access  Public
 */
exports.getLeaderboard = asyncHandler(async (req, res, next) => {
    const { gameType = 'dice', limit = 10 } = req.query;

    const { data, error } = await supabase.rpc('get_game_leaderboard', {
        p_game_type: gameType,
        p_limit: parseInt(limit)
    });

    if (error) throw new AppError(error.message, 500);

    // Map to match old response
    const leaderboard = data.map(item => ({
        username: item.username,
        avatar: item.avatar,
        totalWins: item.total_wins,
        totalProfit: item.total_profit,
        biggestWin: item.biggest_win,
        biggestMultiplier: item.biggest_multiplier
    }));

    res.status(200).json({
        success: true,
        data: leaderboard,
    });
});

/**
 * @route   GET /api/games/verify/:gameId
 * @desc    Verify game fairness
 * @access  Public
 */
exports.verifyGame = asyncHandler(async (req, res, next) => {
    const { gameId } = req.params;

    const { data: game, error } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

    if (!game || error) {
        return next(new AppError('Game not found', 404));
    }

    res.status(200).json({
        success: true,
        data: {
            gameId: game.id,
            gameType: game.game_type,
            result: game.result,
            fairness: {
                serverSeed: game.server_seed, // Revealed!
                serverSeedHash: game.server_seed_hash,
                clientSeed: game.client_seed,
                nonce: game.nonce
            },
            isWin: game.is_win,
            payout: game.payout,
        },
    });
});

/**
 * @route   GET /api/games/recent
 * @desc    Get recent games (all users)
 * @access  Public
 */
exports.getRecentGames = asyncHandler(async (req, res, next) => {
    const { limit = 20, gameType } = req.query;

    let query = supabase
        .from('games')
        .select('*, user:users(username, avatar)')
        .order('created_at', { ascending: false })
        .limit(parseInt(limit));

    if (gameType) {
        query = query.eq('game_type', gameType);
    }

    const { data: games, error } = await query;

    if (error) throw new AppError(error.message, 500);

    const mappedGames = games.map(g => ({
        _id: g.id,
        userId: g.user ? { username: g.user.username, avatar: g.user.avatar || 'default' } : null,
        gameType: g.game_type,
        betAmount: g.bet_amount,
        payout: g.payout,
        multiplier: g.multiplier,
        profit: g.profit,
        isWin: g.is_win,
        createdAt: g.created_at
    }));

    res.status(200).json({
        success: true,
        data: mappedGames,
    });
});
