const WheelService = require('../../services/game/wheel.service');
const WalletService = require('../../services/wallet.service');
const supabase = require('../../config/supabase');
const { logger } = require('../../utils/logger');

module.exports = (wheel) => {
    wheel.on('connection', (socket) => {
        const user = socket.user;

        if (!user || !user.id) {
            logger.error('Wheel connection without authenticated user');
            socket.disconnect();
            return;
        }

        logger.info(`Wheel connected: ${user.username} (${socket.id})`);

        socket.on('wheel:spin', async (payload, callback) => {
            try {
                const { betAmount, risk, currency = 'INR', clientSeed } = payload;

                // Validate payload
                if (!betAmount || !risk) {
                    return callback({
                        success: false,
                        message: 'Missing required fields: betAmount, risk'
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
                const gameResult = WheelService.playWheel({
                    betAmount,
                    risk,
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

                // Prepare Game Record
                const gameData = {
                    user_id: user.id,
                    game_type: 'wheel',
                    bet_amount: gameResult.betAmount,
                    currency,
                    payout: gameResult.payout,
                    multiplier: gameResult.multiplier,
                    profit: gameResult.profit,
                    is_win: gameResult.isWin,
                    result: {
                        risk: gameResult.risk,
                        segment: gameResult.segmentIndex,
                        multiplier: gameResult.multiplier
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
                    logger.error('Failed to save wheel game:', gameError);
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
                        gameType: 'wheel'
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
                            gameType: 'wheel'
                        }
                    });
                }

                logger.info(
                    `Wheel played: ${user.username} | Bet: ${betAmount} | Risk: ${risk} | Mult: ${gameResult.multiplier}x`
                );

                // Send success response
                callback({
                    success: true,
                    data: {
                        gameId: game?.id,
                        result: gameResult.segmentIndex, // 0-9
                        risk: gameResult.risk,
                        isWin: gameResult.isWin,
                        multiplier: gameResult.multiplier,
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

                // Broadcast
                wheel.emit('wheel:result', {
                    username: user.username,
                    betAmount,
                    multiplier: gameResult.multiplier,
                    isWin: gameResult.isWin
                });

            } catch (error) {
                logger.error(`Wheel error for ${user.username}:`, error);
                callback({
                    success: false,
                    message: error.message || 'Game error occurred'
                });
            }
        });

        socket.on('disconnect', () => {
            logger.info(`Wheel disconnected: ${user.username} (${socket.id})`);
        });
    });
};
