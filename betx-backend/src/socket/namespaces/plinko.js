const PlinkoService = require('../../services/game/plinko.service');
const WalletService = require('../../services/wallet.service');
const supabase = require('../../config/supabase');
const { logger } = require('../../utils/logger');

module.exports = (plinko) => {
    plinko.on('connection', (socket) => {
        const user = socket.user;

        if (!user || !user.id) {
            logger.error('Plinko connection without authenticated user');
            socket.disconnect();
            return;
        }

        logger.info(`Plinko connected: ${user.username} (${socket.id})`);

        socket.on('plinko:play', async (payload, callback) => {
            try {
                const { betAmount, risk = 'medium', rows = 16, currency = 'INR', clientSeed } = payload;

                if (!betAmount) {
                    return callback({
                        success: false,
                        message: 'Missing required field: betAmount'
                    });
                }

                // Check wallet and check balance
                const walletBalance = await WalletService.getBalance(user.id, currency);

                if (walletBalance < betAmount) {
                    return callback({
                        success: false,
                        message: 'Insufficient balance'
                    });
                }

                // Deduct bet amount
                try {
                    await WalletService.deduct(user.id, betAmount, currency);
                } catch (e) {
                    return callback({
                        success: false,
                        message: e.message
                    });
                }

                // Play the game
                const gameResult = PlinkoService.playPlinko({
                    betAmount,
                    risk,
                    rows,
                    clientSeed
                });

                // Credit winnings if player won
                let activeBalance;
                if (gameResult.isWin && gameResult.payout > 0) {
                    const updatedWallet = await WalletService.credit(user.id, gameResult.payout, currency);
                    activeBalance = updatedWallet.balance;
                } else {
                    activeBalance = await WalletService.getBalance(user.id, currency);
                }

                // Save game record
                const { data: game, error: gameError } = await supabase.from('games').insert({
                    user_id: user.id,
                    game_type: 'plinko',
                    bet_amount: gameResult.betAmount,
                    currency,
                    payout: gameResult.payout,
                    multiplier: gameResult.multiplier,
                    profit: gameResult.profit,
                    is_win: gameResult.isWin,
                    result: {
                        path: gameResult.path,
                        bucket: gameResult.bucket,
                        risk: gameResult.risk,
                        rows: gameResult.rows
                    },
                    server_seed: gameResult.fairness.serverSeed,
                    server_seed_hash: gameResult.fairness.serverSeedHash,
                    client_seed: gameResult.fairness.clientSeed,
                    nonce: gameResult.fairness.nonce,
                    revealed: true
                }).select().single();

                if (gameError) logger.error('Plinko game save error', gameError);

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
                    metadata: { gameId: game?.id, gameType: 'plinko' }
                });

                if (gameResult.isWin && gameResult.payout > 0) {
                    await supabase.from('transactions').insert({
                        user_id: user.id,
                        type: 'win',
                        currency,
                        amount: gameResult.payout,
                        status: 'completed',
                        payment_gateway: 'internal',
                        metadata: { gameId: game?.id, gameType: 'plinko' }
                    });
                }

                logger.info(
                    `Plinko played: ${user.username} | Bet: ${betAmount} | Bucket: ${gameResult.bucket} | Multiplier: ${gameResult.multiplier}x | Win: ${gameResult.isWin}`
                );

                callback({
                    success: true,
                    data: {
                        gameId: game?.id,
                        path: gameResult.path,
                        bucket: gameResult.bucket,
                        multiplier: gameResult.multiplier,
                        payout: gameResult.payout,
                        isWin: gameResult.isWin,
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
                logger.error(`Plinko error for ${user.username}:`, error);
                callback({
                    success: false,
                    message: error.message || 'Game error occurred'
                });
            }
        });

        socket.on('disconnect', () => {
            logger.info(`Plinko disconnected: ${user.username} (${socket.id})`);
        });
    });
};
