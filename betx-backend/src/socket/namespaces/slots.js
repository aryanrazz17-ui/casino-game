const SlotsService = require('../../services/game/slots.service');
const WalletService = require('../../services/wallet.service');
const supabase = require('../../config/supabase');
const { logger } = require('../../utils/logger');

module.exports = (slots) => {
    slots.on('connection', (socket) => {
        const user = socket.user;

        if (!user || !user.id) {
            logger.error('Slots connection without authenticated user');
            socket.disconnect();
            return;
        }

        logger.info(`Slots connected: ${user.username} (${socket.id})`);

        socket.on('slots:spin', async (payload, callback) => {
            try {
                const { betAmount, lines = 1, currency = 'INR', clientSeed } = payload;

                if (!betAmount) {
                    return callback({
                        success: false,
                        message: 'Missing required field: betAmount'
                    });
                }

                const totalBet = betAmount * lines;

                // Check wallet and check balance
                const walletBalance = await WalletService.getBalance(user.id, currency);

                if (walletBalance < totalBet) {
                    return callback({
                        success: false,
                        message: 'Insufficient balance'
                    });
                }

                // Deduct bet amount
                try {
                    await WalletService.deduct(user.id, totalBet, currency);
                } catch (e) {
                    return callback({
                        success: false,
                        message: e.message
                    });
                }

                // Play the game
                const gameResult = SlotsService.playSlots({
                    betAmount,
                    lines,
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
                    game_type: 'slots',
                    bet_amount: gameResult.betAmount,
                    currency,
                    payout: gameResult.payout,
                    multiplier: gameResult.multiplier,
                    profit: gameResult.profit,
                    is_win: gameResult.isWin,
                    result: {
                        reels: gameResult.reels,
                        lines: gameResult.lines
                    },
                    server_seed: gameResult.fairness.serverSeed,
                    server_seed_hash: gameResult.fairness.serverSeedHash,
                    client_seed: gameResult.fairness.clientSeed,
                    nonce: gameResult.fairness.nonce,
                    revealed: true
                }).select().single();

                if (gameError) logger.error('Slots game save error', gameError);

                // Create transactions
                await supabase.from('transactions').insert({
                    user_id: user.id,
                    type: 'bet',
                    currency,
                    amount: totalBet,
                    status: 'completed',
                    payment_gateway: 'internal',
                    balance_before: 0,
                    balance_after: 0,
                    metadata: { gameId: game?.id, gameType: 'slots' }
                });

                if (gameResult.isWin && gameResult.payout > 0) {
                    await supabase.from('transactions').insert({
                        user_id: user.id,
                        type: 'win',
                        currency,
                        amount: gameResult.payout,
                        status: 'completed',
                        payment_gateway: 'internal',
                        metadata: { gameId: game?.id, gameType: 'slots' }
                    });
                }

                logger.info(
                    `Slots played: ${user.username} | Bet: ${totalBet} | Lines: ${lines} | Payout: ${gameResult.payout} | Win: ${gameResult.isWin}`
                );

                callback({
                    success: true,
                    data: {
                        gameId: game?.id,
                        reels: gameResult.reels,
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
                logger.error(`Slots error for ${user.username}:`, error);
                callback({
                    success: false,
                    message: error.message || 'Game error occurred'
                });
            }
        });

        socket.on('disconnect', () => {
            logger.info(`Slots disconnected: ${user.username} (${socket.id})`);
        });
    });
};
