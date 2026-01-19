const RouletteService = require('../services/game/roulette.service');
const WalletService = require('../services/wallet.service');
const pf = require('../utils/provablyFairHelper');
const supabase = require('../config/supabase');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

exports.bet = asyncHandler(async (req, res, next) => {
    const { bets, clientSeed, currency = 'INR' } = req.body;
    const userId = req.user.id;

    if (!bets || !Array.isArray(bets) || bets.length === 0) {
        return next(new AppError('No bets placed', 400));
    }

    const totalBet = bets.reduce((sum, b) => sum + b.amount, 0);

    const balance = await WalletService.getBalance(userId, currency);
    if (balance < totalBet) {
        return next(new AppError('Insufficient balance', 400));
    }

    // Server Seed & Nonce
    const serverSeed = pf.generateServerSeed();
    const serverHash = pf.hashSeed(serverSeed);
    const nonce = Math.floor(Math.random() * 1000000); // Or track properly

    // Outcome
    const outcome = RouletteService.getOutcome(serverSeed, clientSeed, nonce);

    // Calculate Payouts
    let totalWin = 0;
    bets.forEach(bet => {
        totalWin += RouletteService.calculateBetWin(outcome, bet);
    });

    // Wallet Transactions
    const updatedWalletDeduct = await WalletService.deduct(userId, totalBet, currency, {
        gameType: 'roulette',
        type: 'bet'
    });

    let finalBalance = updatedWalletDeduct.balance;

    if (totalWin > 0) {
        const updatedWalletCredit = await WalletService.credit(userId, totalWin, currency, {
            gameType: 'roulette',
            type: 'win'
        });
        finalBalance = updatedWalletCredit.balance;
    }

    // Save Game Record
    const { data: game, error } = await supabase.from('games').insert({
        user_id: userId,
        game_type: 'roulette',
        bet_amount: totalBet,
        payout: totalWin,
        multiplier: totalWin / totalBet,
        profit: totalWin - totalBet,
        is_win: totalWin > 0,
        currency,
        result: { outcome, bets },
        server_seed: serverSeed,
        server_seed_hash: serverHash,
        client_seed: clientSeed,
        nonce,
        revealed: true
    }).select().single();

    // Socket Updates
    const io = req.app.get('io');
    const { emitWalletUpdate, emitHistoryUpdate } = require('../utils/socketUtils');

    emitWalletUpdate(io, userId, {
        currency,
        newBalance: finalBalance,
        type: totalWin > 0 ? 'win' : 'bet',
        amount: totalWin > 0 ? totalWin : totalBet
    });
    emitHistoryUpdate(io, userId);

    res.json({
        status: true,
        outcome,
        profit: totalWin - totalBet,
        totalWin,
        serverSeed,
        serverHash,
        clientSeed,
        nonce
    });
});
