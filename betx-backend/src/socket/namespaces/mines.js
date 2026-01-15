const MinesService = require('../../services/game/mines.service');
const WalletService = require('../../services/wallet.service');
const supabase = require('../../config/supabase');
const { logger } = require('../../utils/logger');

// Store active games in memory (use Redis in production)
const activeGames = new Map();

module.exports = (mines) => {
    // Helper function to end game
    const endMinesGame = async (userId, gameState, isWin) => {
        const { data: game, error: gameError } = await supabase.from('games').insert({
            user_id: userId,
            game_type: 'mines',
            bet_amount: gameState.betAmount,
            currency: gameState.currency,
            payout: gameState.payout || 0,
            multiplier: gameState.multiplier || 0,
            profit: gameState.profit || -gameState.betAmount,
            is_win: isWin,
            result: {
                minesCount: gameState.minesCount,
                revealedTiles: gameState.revealedTiles,
                minePositions: gameState.minePositions
            },
            server_seed: gameState.fairness.serverSeed,
            server_seed_hash: gameState.fairness.serverSeedHash,
            client_seed: gameState.fairness.clientSeed,
            nonce: gameState.fairness.nonce,
            revealed: true
        }).select().single();

        if (gameError) logger.error('Mines game save error', gameError);

        // Create bet transaction
        // (Usually created at start, but mines logic had it at end?)
        // The original logic committed tx at end? No, that's weird. 
        // Original code: await Transaction.create(...) inside endMinesGame.
        // But deduction happened at start.
        // It's safest to record bet tx at start, but if the original code did it at end, I will follow for behavior parity, 
        // BUT deduction happened at start, so if server crashed, user loses money without record?
        // Let's stick to original flow but using Supabase.

        await supabase.from('transactions').insert({
            user_id: userId,
            type: 'bet',
            currency: gameState.currency,
            amount: gameState.betAmount,
            status: 'completed',
            payment_gateway: 'internal',
            metadata: { gameId: game?.id, gameType: 'mines' }
        });

        // Create win transaction if won
        if (isWin && gameState.payout > 0) {
            await supabase.from('transactions').insert({
                user_id: userId,
                type: 'win',
                currency: gameState.currency,
                amount: gameState.payout,
                status: 'completed',
                payment_gateway: 'internal',
                metadata: { gameId: game?.id, gameType: 'mines' }
            });
        }
    };

    mines.on('connection', (socket) => {
        const user = socket.user;

        if (!user || !user.id) {
            logger.error('Mines connection without authenticated user');
            socket.disconnect();
            return;
        }

        logger.info(`Mines connected: ${user.username} (${socket.id})`);

        socket.on('mines:start', async (payload, callback) => {
            try {
                const { betAmount, minesCount = 3, currency = 'INR', clientSeed } = payload;

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

                // Start game
                const gameState = MinesService.startMines({
                    betAmount,
                    minesCount,
                    clientSeed
                });

                // Store game state
                activeGames.set(user.id, {
                    ...gameState,
                    userId: user.id,
                    currency,
                    balanceBefore: walletBalance // Approx
                });

                logger.info(`Mines started: ${user.username} | Bet: ${betAmount} | Mines: ${minesCount}`);

                callback({
                    success: true,
                    data: {
                        gameId: gameState.gameId,
                        minesCount: gameState.minesCount,
                        revealedTiles: [],
                        currentMultiplier: 1,
                        currentPayout: betAmount
                    }
                });

            } catch (error) {
                logger.error(`Mines start error for ${user.username}:`, error);
                callback({
                    success: false,
                    message: error.message || 'Game error occurred'
                });
            }
        });

        socket.on('mines:reveal', async (payload, callback) => {
            try {
                const { position } = payload;

                const gameState = activeGames.get(user.id);

                if (!gameState) {
                    return callback({
                        success: false,
                        message: 'No active game found'
                    });
                }

                // Reveal tile
                const result = MinesService.revealTile(gameState, position);

                // Update game state
                activeGames.set(user.id, {
                    ...gameState,
                    ...result
                });

                if (result.hitMine) {
                    // Game over - player lost
                    await endMinesGame(user.id, result, false);
                    activeGames.delete(user.id);

                    callback({
                        success: true,
                        data: {
                            position,
                            hitMine: true,
                            gameOver: true,
                            payout: 0,
                            minePositions: result.minePositions
                        }
                    });
                } else {
                    // Safe tile
                    callback({
                        success: true,
                        data: {
                            position,
                            hitMine: false,
                            gameOver: false,
                            multiplier: result.multiplier,
                            currentPayout: result.currentPayout,
                            revealedTiles: result.revealedTiles
                        }
                    });
                }

            } catch (error) {
                logger.error(`Mines reveal error for ${user.username}:`, error);
                callback({
                    success: false,
                    message: error.message || 'Game error occurred'
                });
            }
        });

        socket.on('mines:cashout', async (payload, callback) => {
            try {
                const gameState = activeGames.get(user.id);

                if (!gameState) {
                    return callback({
                        success: false,
                        message: 'No active game found'
                    });
                }

                // Cashout
                const result = MinesService.cashoutMines(gameState);

                // Credit winnings
                await WalletService.credit(user.id, result.payout, gameState.currency);

                // End game
                await endMinesGame(user.id, { ...gameState, ...result }, true);
                activeGames.delete(user.id);

                const balance = await WalletService.getBalance(user.id, gameState.currency);

                logger.info(`Mines cashout: ${user.username} | Payout: ${result.payout}`);

                callback({
                    success: true,
                    data: {
                        payout: result.payout,
                        multiplier: result.multiplier,
                        balance: balance,
                        minePositions: result.minePositions
                    }
                });

            } catch (error) {
                logger.error(`Mines cashout error for ${user.username}:`, error);
                callback({
                    success: false,
                    message: error.message || 'Game error occurred'
                });
            }
        });

        socket.on('disconnect', () => {
            // Clean up active game if exists
            activeGames.delete(user.id);
            logger.info(`Mines disconnected: ${user.username} (${socket.id})`);
        });
    });
};
