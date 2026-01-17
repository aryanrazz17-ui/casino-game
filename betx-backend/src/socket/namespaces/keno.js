const KenoService = require('../../services/game/keno.service');
const WalletService = require('../../services/wallet.service');
const supabase = require('../../config/supabase');
const { logger } = require('../../utils/logger');

module.exports = (keno) => {
    keno.on('connection', (socket) => {
        const user = socket.user;

        if (!user || !user.id) {
            logger.error('Keno connection without authenticated user');
            socket.disconnect();
            return;
        }

        logger.info(`Keno connected: ${user.username} (${socket.id})`);

        socket.on('keno:play', async (payload, callback) => {
            try {
                const { betAmount, selectedNumbers, currency = 'INR', clientSeed } = payload;

                // Validate payload
                if (!betAmount || !selectedNumbers) {
                    return callback({
                        success: false,
                        message: 'Missing required fields: betAmount, selectedNumbers'
                    });
                }

                // Check balance
                const walletBalance = await WalletService.getBalance(user.id, currency);
                if (walletBalance < betAmount) {
                    return callback({
                        success: false,
                        message: 'Insufficient balance'
                    });
                }

                // Deduct bet amount (Atomic)
                try {
                    await WalletService.deduct(user.id, betAmount, currency);
                } catch (e) {
                    return callback({
                        success: false,
                        message: e.message
                    });
                }

                // Play the game
                let gameResult;
                try {
                    gameResult = KenoService.playKeno({
                        betAmount,
                        selectedNumbers,
                        clientSeed
                    });
                } catch (e) {
                    // Refund if service fails
                    await WalletService.credit(user.id, betAmount, currency);
                    return callback({
                        success: false,
                        message: e.message
                    });
                }

                // Credit winnings if player won
                let activeBalance;
                if (gameResult.isWin && gameResult.payout > 0) {
                    const updatedWallet = await WalletService.credit(user.id, gameResult.payout, currency);
                    activeBalance = updatedWallet.balance;
                } else {
                    activeBalance = await WalletService.getBalance(user.id, currency);
                }

                // Prepare Game Record
                const gameData = {
                    user_id: user.id,
                    game_type: 'keno',
                    bet_amount: gameResult.betAmount,
                    currency,
                    payout: gameResult.payout,
                    multiplier: gameResult.multiplier,
                    profit: gameResult.profit,
                    is_win: gameResult.isWin,
                    result: {
                        draw: gameResult.draw,
                        hits: gameResult.hits,
                        hitsCount: gameResult.hitsCount,
                        selectedNumbers: gameResult.selectedNumbers
                    },
                    server_seed: gameResult.fairness.serverSeed,
                    server_seed_hash: gameResult.fairness.serverSeedHash,
                    client_seed: gameResult.fairness.clientSeed,
                    nonce: gameResult.fairness.nonce,
                    revealed: true
                };

                // Save game record
                const { data: game, error: gameError } = await supabase
                    .from('games')
                    .insert(gameData)
                    .select()
                    .single();

                if (gameError) {
                    logger.error('Failed to save Keno game:', gameError);
                }

                // Transactions
                // 1. Bet Transaction
                await supabase.from('transactions').insert({
                    user_id: user.id,
                    type: 'bet',
                    currency,
                    amount: betAmount,
                    status: 'completed',
                    payment_gateway: 'internal',
                    metadata: {
                        gameId: game?.id,
                        gameType: 'keno'
                    }
                });

                // 2. Win Transaction
                if (gameResult.isWin && gameResult.payout > 0) {
                    await supabase.from('transactions').insert({
                        user_id: user.id,
                        type: 'win',
                        currency,
                        amount: gameResult.payout,
                        status: 'completed',
                        payment_gateway: 'internal',
                        metadata: {
                            gameId: game?.id,
                            gameType: 'keno'
                        }
                    });
                }

                logger.info(
                    `Keno played: ${user.username} | Bet: ${betAmount} | Hits: ${gameResult.hitsCount} | Win: ${gameResult.isWin} | Payout: ${gameResult.payout}`
                );

                // Send success response
                callback({
                    success: true,
                    data: {
                        gameId: game?.id,
                        draw: gameResult.draw,
                        hits: gameResult.hits,
                        hitsCount: gameResult.hitsCount,
                        isWin: gameResult.isWin,
                        multiplier: gameResult.multiplier,
                        payout: gameResult.payout,
                        balance: activeBalance,
                        fairness: gameResult.fairness
                    }
                });

                // Broadcast result
                keno.emit('keno:result', {
                    username: user.username,
                    betAmount,
                    hitsCount: gameResult.hitsCount,
                    isWin: gameResult.isWin,
                    multiplier: gameResult.multiplier
                });

            } catch (error) {
                logger.error(`Keno error for ${user.username}:`, error);
                callback({
                    success: false,
                    message: error.message || 'Game error occurred'
                });
            }
        });

        socket.on('disconnect', () => {
            logger.info(`Keno disconnected: ${user.username} (${socket.id})`);
        });
    });
};
