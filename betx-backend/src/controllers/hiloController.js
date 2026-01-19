const HiloService = require('../services/game/hilo.service');
const WalletService = require('../services/wallet.service');
const supabase = require('../config/supabase');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// Store active games in memory
const activeGames = new Map();

exports.getGame = asyncHandler(async (req, res) => {
    const gameState = activeGames.get(req.user.id);
    if (!gameState) return res.json({ status: false });

    res.json({
        status: true,
        gameId: gameState.gameId,
        amount: gameState.betAmount,
        currency: gameState.currency,
        rounds: gameState.history.map((card, i) => ({
            card,
            multiplier: i === 0 ? 1 : gameState.multiplier, // Simplified
            type: i === 0 ? 'Start' : 'Higher' // Simplified
        })),
        odds: gameState.multiplier,
        profit: gameState.payout - gameState.betAmount,
        privateHash: gameState.fairness.serverSeedHash,
        publicKey: gameState.fairness.clientSeed
    });
});

exports.create = asyncHandler(async (req, res, next) => {
    const { amount, currency = 'INR', clientSeed } = req.body;
    const userId = req.user.id;

    if (activeGames.has(userId)) {
        return next(new AppError('Game already in progress', 400));
    }

    const walletBalance = await WalletService.getBalance(userId, currency);
    if (walletBalance < amount) {
        return next(new AppError('Insufficient balance', 400));
    }

    // Deduct balance
    const updatedWallet = await WalletService.deduct(userId, amount, currency, {
        gameType: 'hilo',
        type: 'bet'
    });

    const gameState = HiloService.startHiLo({ betAmount: amount, clientSeed });
    gameState.currency = currency;

    activeGames.set(userId, gameState);

    // Emit updates
    const io = req.app.get('io');
    const { emitWalletUpdate, emitHistoryUpdate } = require('../utils/socketUtils');
    emitWalletUpdate(io, userId, {
        currency,
        newBalance: updatedWallet.balance,
        type: 'bet',
        amount
    });
    emitHistoryUpdate(io, userId);

    res.json({
        status: true,
        gameId: gameState.gameId,
        odds: 1,
        publicKey: gameState.fairness.clientSeed,
        privateHash: gameState.fairness.serverSeedHash,
        rounds: [{ card: gameState.currentCard, multiplier: 1, type: 'Start' }]
    });
});

exports.bet = asyncHandler(async (req, res, next) => {
    const { type } = req.body; // 'Higher', 'Lower', 'HSame', 'LSame', 'Skip', etc.
    const userId = req.user.id;
    const gameState = activeGames.get(userId);

    if (!gameState) return next(new AppError('No active game', 404));

    // Map frontend types to 'hi'/'lo'
    let choice = '';
    if (['Higher', 'HSame', 'Same_H'].includes(type)) choice = 'hi';
    else if (['Lower', 'LSame', 'Same_L'].includes(type)) choice = 'lo';
    else if (type === 'Skip') {
        // Skip logic: increment nonce, get new card, same multiplier
        const nextCard = HiloService.getCard(
            gameState.fairness.serverSeed,
            gameState.fairness.clientSeed,
            gameState.fairness.nonce + gameState.history.length
        );
        gameState.currentCard = nextCard;
        gameState.history.push(nextCard);

        return res.json({
            status: true,
            odds: gameState.multiplier,
            profit: gameState.payout - gameState.betAmount,
            rounds: gameState.history.map((card, i) => ({
                card,
                multiplier: 1, // Simplified
                type: i === 0 ? 'Start' : 'Skip'
            })),
            type: 'SKIP'
        });
    }

    const result = HiloService.playMove(gameState, choice);

    gameState.history.push(result.nextCard);
    gameState.currentCard = result.nextCard;

    if (!result.isWin) {
        // Game Over - Loss
        await supabase.from('games').insert({
            user_id: userId,
            game_type: 'hilo',
            bet_amount: gameState.betAmount,
            currency: gameState.currency,
            payout: 0,
            multiplier: 0,
            profit: -gameState.betAmount,
            is_win: false,
            result: { history: gameState.history },
            server_seed: gameState.fairness.serverSeed,
            server_seed_hash: gameState.fairness.serverSeedHash,
            client_seed: gameState.fairness.clientSeed,
            nonce: gameState.fairness.nonce,
            revealed: true
        });

        activeGames.delete(userId);

        const io = req.app.get('io');
        const { emitHistoryUpdate } = require('../utils/socketUtils');
        emitHistoryUpdate(io, userId);

        return res.json({
            status: true,
            type: 'LOST',
            privateKey: gameState.fairness.serverSeed,
            rounds: gameState.history.map(card => ({ card, multiplier: 0, type: 'LOST' }))
        });
    }

    // Correct Guess
    gameState.multiplier = result.multiplier;
    gameState.payout = result.payout;
    activeGames.set(userId, gameState);

    res.json({
        status: true,
        odds: gameState.multiplier,
        profit: gameState.payout - gameState.betAmount,
        rounds: gameState.history.map((card, i) => ({
            card,
            multiplier: gameState.multiplier,
            type: choice === 'hi' ? 'Higher' : 'Lower'
        })),
        type: 'WIN'
    });
});

exports.cashout = asyncHandler(async (req, res, next) => {
    const userId = req.user.id;
    const gameState = activeGames.get(userId);

    if (!gameState) return next(new AppError('No active game', 404));
    if (gameState.history.length < 2) return next(new AppError('Must play at least one round', 400));

    // Credit balance
    const updatedWallet = await WalletService.credit(userId, gameState.payout, gameState.currency, {
        gameType: 'hilo',
        type: 'win'
    });

    // Save game
    await supabase.from('games').insert({
        user_id: userId,
        game_type: 'hilo',
        bet_amount: gameState.betAmount,
        currency: gameState.currency,
        payout: gameState.payout,
        multiplier: gameState.multiplier,
        profit: gameState.payout - gameState.betAmount,
        is_win: true,
        result: { history: gameState.history },
        server_seed: gameState.fairness.serverSeed,
        server_seed_hash: gameState.fairness.serverSeedHash,
        client_seed: gameState.fairness.clientSeed,
        nonce: gameState.fairness.nonce,
        revealed: true
    });

    activeGames.delete(userId);

    // Emit updates
    const io = req.app.get('io');
    const { emitWalletUpdate, emitHistoryUpdate } = require('../utils/socketUtils');
    emitWalletUpdate(io, userId, {
        currency: gameState.currency,
        newBalance: updatedWallet.balance,
        type: 'win',
        amount: gameState.payout
    });
    emitHistoryUpdate(io, userId);

    res.json({
        status: true,
        profit: gameState.payout - gameState.betAmount,
        multiplier: gameState.multiplier,
        privateKey: gameState.fairness.serverSeed
    });
});
