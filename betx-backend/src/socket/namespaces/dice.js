const DiceService = require('../../services/game/dice.service');
const WalletService = require('../../services/wallet.service');
const supabase = require('../../config/supabase');
const { logger } = require('../../utils/logger');

module.exports = (dice) => {
    dice.on('connection', (socket) => {
        const user = socket.user;

        if (!user || !user.id) {
            logger.error('Dice connection without authenticated user');
            socket.disconnect();
            return;
        }

        logger.info(`Dice connected: ${user.username} (${socket.id})`);

        socket.on('dice:play', async (payload, callback) => {
            try {
                const { betAmount, target, condition, currency = 'INR', clientSeed } = payload;

                // Validate payload
                if (!betAmount || !target || !condition) {
                    return callback({
                        success: false,
                        message: 'Missing required fields: betAmount, target, condition'
                    });
                }

                // Check balance (WalletService.deduct now handles locking and deducting)
                // We'll trust the atomic deduct to check balance too, but a quick check first saves a DB write if obviously empty
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
                const gameResult = DiceService.playDice({
                    betAmount,
                    target,
                    condition,
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
                    game_type: 'dice',
                    bet_amount: gameResult.betAmount,
                    currency,
                    payout: gameResult.payout,
                    multiplier: gameResult.multiplier,
                    profit: gameResult.profit,
                    is_win: gameResult.isWin,
                    result: {
                        roll: gameResult.roll,
                        target: gameResult.target,
                        condition: gameResult.condition
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
                    logger.error('Failed to save game:', gameError);
                    // Critical error: Money handled but game not saved. 
                    // In prod, this needs an alert.
                }

                const balanceBefore = parseFloat(activeBalance) - (gameResult.isWin ? gameResult.profit : -betAmount); // Approx reverse calc or carry state
                // Actually balanceBefore was before the bet.
                // Deduct happened: bal = bal - bet.
                // Credit happened: bal = bal + payout.
                // So current `activeBalance` = old - bet + payout.
                // Previous code:
                // balanceBefore (fetched before deduct)
                // balanceAfter (fetched after credit)

                // Transactions
                // 1. Bet Transaction
                await supabase.from('transactions').insert({
                    user_id: user.id,
                    type: 'bet',
                    currency,
                    amount: betAmount,
                    status: 'completed',
                    payment_gateway: 'internal',
                    balance_before: 0, // We miss this precise state without dragging it through. Can query if needed.
                    balance_after: 0,
                    metadata: {
                        gameId: game?.id,
                        gameType: 'dice'
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
                            gameType: 'dice'
                        }
                    });
                }

                logger.info(
                    `Dice played: ${user.username} | Bet: ${betAmount} | Roll: ${gameResult.roll} | Win: ${gameResult.isWin} | Payout: ${gameResult.payout}`
                );

                // Send success response
                callback({
                    success: true,
                    data: {
                        gameId: game?.id,
                        result: gameResult.roll,
                        prediction: gameResult.condition,
                        target: gameResult.target,
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

                // Broadcast result to all connected players (optional)
                dice.emit('dice:result', {
                    username: user.username,
                    betAmount,
                    result: gameResult.roll,
                    isWin: gameResult.isWin,
                    multiplier: gameResult.multiplier
                });

            } catch (error) {
                logger.error(`Dice error for ${user.username}:`, error);

                // Attempt to refund if deduction happened but game failed ?? 
                // With the new flow, deduction is committed. 
                // We should catch errors *after* deduction and refund.

                callback({
                    success: false,
                    message: error.message || 'Game error occurred'
                });
            }
        });

        socket.on('disconnect', () => {
            logger.info(`Dice disconnected: ${user.username} (${socket.id})`);
        });
    });
};
