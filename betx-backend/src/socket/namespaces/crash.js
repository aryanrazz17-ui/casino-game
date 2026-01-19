const CrashService = require('../../services/game/crash.service');
const WalletService = require('../../services/wallet.service');
const supabase = require('../../config/supabase');
const { logger } = require('../../utils/logger');

module.exports = (crash) => {
    crash.on('connection', (socket) => {
        const user = socket.user;

        if (!user || !user.id) {
            logger.error('Crash connection without authenticated user');
            socket.disconnect();
            return;
        }

        logger.info(`Crash connected: ${user.username} (${socket.id})`);

        socket.on('crash:play', async (payload, callback) => {
            try {
                const { betAmount, autoCashout, currency = 'INR', clientSeed } = payload;

                if (!betAmount) {
                    return callback({
                        success: false,
                        message: 'Missing required field: betAmount'
                    });
                }

                // Check balance (Atomic deduct handles safety, but check for UI speed)
                const walletBalance = await WalletService.getBalance(user.id, currency);

                if (walletBalance < betAmount) {
                    return callback({
                        success: false,
                        message: 'Insufficient balance'
                    });
                }

                // Deduct bet amount
                try {
                    const updatedWallet = await WalletService.deduct(user.id, betAmount, currency);

                    // Emit real-time wallet update
                    crash.to(`user:${user.id}`).emit('wallet_update', {
                        currency,
                        newBalance: updatedWallet.balance,
                        type: 'bet',
                        amount: betAmount
                    });
                } catch (e) {
                    return callback({
                        success: false,
                        message: e.message
                    });
                }

                // Play the game
                const gameResult = CrashService.playCrash({
                    betAmount,
                    autoCashout,
                    clientSeed
                });

                // Credit winnings if player won
                let activeBalance;
                if (gameResult.isWin && gameResult.payout > 0) {
                    const updatedWallet = await WalletService.credit(user.id, gameResult.payout, currency);
                    activeBalance = updatedWallet.balance;

                    // Emit real-time wallet update
                    crash.to(`user:${user.id}`).emit('wallet_update', {
                        currency,
                        newBalance: activeBalance,
                        type: 'win',
                        amount: gameResult.payout,
                        message: `Nice! You won ${gameResult.payout} ${currency} in Crash!`
                    });
                } else {
                    activeBalance = await WalletService.getBalance(user.id, currency);
                }

                // Save game record
                const { data: game, error: gameError } = await supabase.from('games').insert({
                    user_id: user.id,
                    game_type: 'crash',
                    bet_amount: gameResult.betAmount,
                    currency,
                    payout: gameResult.payout,
                    multiplier: gameResult.cashoutAt || 0,
                    profit: gameResult.profit,
                    is_win: gameResult.isWin,
                    result: {
                        crashPoint: gameResult.crashPoint,
                        cashoutAt: gameResult.cashoutAt,
                        autoCashout: gameResult.autoCashout
                    },
                    server_seed: gameResult.fairness.serverSeed,
                    server_seed_hash: gameResult.fairness.serverSeedHash,
                    client_seed: gameResult.fairness.clientSeed,
                    nonce: gameResult.fairness.nonce,
                    revealed: true
                }).select().single();

                if (gameError) logger.error('Crash game save error', gameError);

                // Create transactions
                await supabase.from('transactions').insert({
                    user_id: user.id,
                    type: 'bet',
                    currency,
                    amount: betAmount,
                    status: 'completed',
                    payment_gateway: 'internal',
                    balance_before: 0,
                    balance_after: 0,
                    metadata: { gameId: game?.id, gameType: 'crash' }
                });

                if (gameResult.isWin && gameResult.payout > 0) {
                    await supabase.from('transactions').insert({
                        user_id: user.id,
                        type: 'win',
                        currency,
                        amount: gameResult.payout,
                        status: 'completed',
                        payment_gateway: 'internal',
                        metadata: { gameId: game?.id, gameType: 'crash' }
                    });
                }

                logger.info(
                    `Crash played: ${user.username} | Bet: ${betAmount} | Crash: ${gameResult.crashPoint}x | Cashout: ${gameResult.cashoutAt}x | Win: ${gameResult.isWin}`
                );

                callback({
                    success: true,
                    data: {
                        gameId: game?.id,
                        crashPoint: gameResult.crashPoint,
                        cashoutAt: gameResult.cashoutAt,
                        isWin: gameResult.isWin,
                        payout: gameResult.payout,
                        balance: activeBalance,
                        fairness: {
                            serverSeed: gameResult.fairness.serverSeed,
                            serverSeedHash: gameResult.fairness.serverSeedHash,
                            clientSeed: gameResult.fairness.clientSeed,
                            nonce: gameResult.fairness.nonce
                        }
                    }
                });

            } catch (error) {
                logger.error(`Crash error for ${user.username}:`, error);
                callback({
                    success: false,
                    message: error.message || 'Game error occurred'
                });
            }
        });

        socket.on('disconnect', () => {
            logger.info(`Crash disconnected: ${user.username} (${socket.id})`);
        });
    });
};
