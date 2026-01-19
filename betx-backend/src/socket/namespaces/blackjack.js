const BlackjackService = require('../../services/game/blackjack.service');
const WalletService = require('../../services/wallet.service');
const supabase = require('../../config/supabase');
const { logger } = require('../../utils/logger');

// Store active games in memory
const activeGames = new Map();

module.exports = (namespace) => {

    /**
     * Helper to end and save game result
     */
    const endBlackjackGame = async (userId, gameState, currency) => {
        try {
            const { data: game, error: gameError } = await supabase.from('games').insert({
                user_id: userId,
                game_type: 'blackjack',
                bet_amount: gameState.betAmount,
                currency: currency,
                payout: gameState.playerHands.reduce((acc, h) => acc + (h.payout || 0), 0),
                multiplier: gameState.playerHands.reduce((acc, h) => acc + (h.payout || 0), 0) / gameState.betAmount,
                profit: gameState.playerHands.reduce((acc, h) => acc + (h.payout || 0), 0) - gameState.playerHands.reduce((acc, h) => acc + h.bet, 0),
                is_win: gameState.playerHands.some(h => (h.payout || 0) > h.bet),
                result: {
                    playerHands: gameState.playerHands.map(h => ({
                        cards: h.cards.map(c => ({ rank: c.rank, suit: c.suit, value: c.value })),
                        status: h.status,
                        bet: h.bet,
                        result: h.result,
                        payout: h.payout
                    })),
                    dealerHand: {
                        cards: gameState.dealerHand.cards.map(c => ({ rank: c.rank, suit: c.suit, value: c.value })),
                        revealed: true
                    }
                },
                server_seed: gameState.fairness.serverSeed,
                server_seed_hash: gameState.fairness.serverSeedHash,
                client_seed: gameState.fairness.clientSeed,
                nonce: gameState.fairness.nonce,
                revealed: true
            }).select().single();

            if (gameError) logger.error('Blackjack game save error', gameError);

            // Record transaction for winnings if any
            const totalPayout = gameState.playerHands.reduce((acc, h) => acc + (h.payout || 0), 0);
            if (totalPayout > 0) {
                const updatedWallet = await WalletService.credit(userId, totalPayout, currency);

                // Emit wallet update
                namespace.to(`user:${userId}`).emit('wallet_update', {
                    currency,
                    newBalance: updatedWallet.balance,
                    type: 'win',
                    amount: totalPayout,
                    message: `Blackjack Win! You got ${totalPayout} ${currency}`
                });

                await supabase.from('transactions').insert({
                    user_id: userId,
                    type: 'win',
                    currency: currency,
                    amount: totalPayout,
                    status: 'completed',
                    payment_gateway: 'internal',
                    metadata: { gameId: game?.id, gameType: 'blackjack' }
                });
            }

            return { success: true, gameId: game?.id };
        } catch (error) {
            logger.error('Error ending blackjack game:', error);
            return { success: false, error: error.message };
        }
    };

    namespace.on('connection', (socket) => {
        const user = socket.user;
        if (!user || !user.id) return socket.disconnect();

        logger.info(`Blackjack connected: ${user.username}`);

        // Handle Reconnect / Get State
        socket.on('blackjack:get-state', (callback) => {
            const gameState = activeGames.get(user.id);
            if (gameState) {
                // Return state but hide secret deck info if necessary (actually deck order is fixed)
                // For Blackjack, we should only return visible cards
                callback({
                    success: true,
                    data: {
                        id: gameState.id,
                        playerHands: gameState.playerHands.map(h => ({
                            cards: h.cards,
                            status: h.status,
                            bet: h.bet
                        })),
                        dealerHand: {
                            cards: gameState.dealerHand.revealed ? gameState.dealerHand.cards : [gameState.dealerHand.cards[0], { rank: '?', suit: '?' }],
                            revealed: gameState.dealerHand.revealed
                        },
                        activeHandIndex: gameState.activeHandIndex,
                        isComplete: gameState.isComplete,
                        betAmount: gameState.betAmount
                    }
                });
            } else {
                callback({ success: false, message: 'No active game' });
            }
        });

        // Start Game
        socket.on('blackjack:start', async (payload, callback) => {
            try {
                const { betAmount, currency = 'INR', clientSeed } = payload;
                if (activeGames.has(user.id)) return callback({ success: false, message: 'Game already in progress' });

                const balance = await WalletService.getBalance(user.id, currency);
                if (balance < betAmount) return callback({ success: false, message: 'Insufficient balance' });

                const updatedWallet = await WalletService.deduct(user.id, betAmount, currency);

                // Emit wallet update
                namespace.to(`user:${user.id}`).emit('wallet_update', {
                    currency,
                    newBalance: updatedWallet.balance,
                    type: 'bet',
                    amount: betAmount
                });

                // Initial transaction record for bet
                await supabase.from('transactions').insert({
                    user_id: user.id,
                    type: 'bet',
                    currency: currency,
                    amount: betAmount,
                    status: 'completed',
                    payment_gateway: 'internal',
                    metadata: { gameType: 'blackjack' }
                });

                let gameState = await BlackjackService.startRound(user.id, betAmount, clientSeed);
                gameState.currency = currency;

                if (gameState.isComplete) {
                    // Immediate blackjack case
                    await endBlackjackGame(user.id, gameState, currency);
                    activeGames.delete(user.id);
                } else {
                    activeGames.set(user.id, gameState);
                }

                callback({
                    success: true,
                    data: {
                        id: gameState.id,
                        playerHands: gameState.playerHands,
                        dealerHand: {
                            cards: [gameState.dealerHand.cards[0], { rank: '?', suit: '?' }],
                            revealed: false
                        },
                        activeHandIndex: gameState.activeHandIndex,
                        isComplete: gameState.isComplete,
                        fairness: {
                            serverSeedHash: gameState.fairness.serverSeedHash,
                            clientSeed: gameState.fairness.clientSeed,
                            nonce: gameState.fairness.nonce
                        }
                    }
                });

            } catch (error) {
                logger.error('Blackjack start error:', error);
                callback({ success: false, message: error.message });
            }
        });

        // Hit
        socket.on('blackjack:hit', async (callback) => {
            try {
                const gameState = activeGames.get(user.id);
                if (!gameState) return callback({ success: false, message: 'No active game' });

                const newState = BlackjackService.hit(gameState);

                if (newState.isComplete) {
                    await endBlackjackGame(user.id, newState, newState.currency);
                    activeGames.delete(user.id);
                } else {
                    activeGames.set(user.id, newState);
                }

                callback({
                    success: true,
                    data: {
                        playerHands: newState.playerHands,
                        dealerHand: newState.dealerHand.revealed ? newState.dealerHand : { cards: [newState.dealerHand.cards[0], { rank: '?', suit: '?' }], revealed: false },
                        activeHandIndex: newState.activeHandIndex,
                        isComplete: newState.isComplete
                    }
                });
            } catch (error) {
                callback({ success: false, message: error.message });
            }
        });

        // Stand
        socket.on('blackjack:stand', async (callback) => {
            try {
                const gameState = activeGames.get(user.id);
                if (!gameState) return callback({ success: false, message: 'No active game' });

                const newState = BlackjackService.stand(gameState);

                if (newState.isComplete) {
                    await endBlackjackGame(user.id, newState, newState.currency);
                    activeGames.delete(user.id);
                } else {
                    activeGames.set(user.id, newState);
                }

                callback({
                    success: true,
                    data: {
                        playerHands: newState.playerHands,
                        dealerHand: newState.dealerHand,
                        activeHandIndex: newState.activeHandIndex,
                        isComplete: newState.isComplete
                    }
                });
            } catch (error) {
                callback({ success: false, message: error.message });
            }
        });

        // Double Down
        socket.on('blackjack:double', async (callback) => {
            try {
                const gameState = activeGames.get(user.id);
                if (!gameState) return callback({ success: false, message: 'No active game' });

                const activeHand = gameState.playerHands[gameState.activeHandIndex];
                const balance = await WalletService.getBalance(user.id, gameState.currency);

                if (balance < activeHand.bet) return callback({ success: false, message: 'Insufficient balance to double' });

                // Deduct additional bet
                const updatedWallet = await WalletService.deduct(user.id, activeHand.bet, gameState.currency);

                // Emit wallet update
                namespace.to(`user:${user.id}`).emit('wallet_update', {
                    currency: gameState.currency,
                    newBalance: updatedWallet.balance,
                    type: 'bet',
                    amount: activeHand.bet
                });

                const newState = await BlackjackService.doubleDown(gameState);

                if (newState.isComplete) {
                    await endBlackjackGame(user.id, newState, newState.currency);
                    activeGames.delete(user.id);
                } else {
                    activeGames.set(user.id, newState);
                }

                callback({
                    success: true,
                    data: {
                        playerHands: newState.playerHands,
                        dealerHand: newState.dealerHand,
                        activeHandIndex: newState.activeHandIndex,
                        isComplete: newState.isComplete
                    }
                });
            } catch (error) {
                callback({ success: false, message: error.message });
            }
        });

        // Split
        socket.on('blackjack:split', async (callback) => {
            try {
                const gameState = activeGames.get(user.id);
                if (!gameState) return callback({ success: false, message: 'No active game' });

                const activeHand = gameState.playerHands[gameState.activeHandIndex];
                const balance = await WalletService.getBalance(user.id, gameState.currency);

                if (balance < activeHand.bet) return callback({ success: false, message: 'Insufficient balance to split' });

                // Deduct additional bet
                const updatedWallet = await WalletService.deduct(user.id, activeHand.bet, gameState.currency);

                // Emit wallet update
                namespace.to(`user:${user.id}`).emit('wallet_update', {
                    currency: gameState.currency,
                    newBalance: updatedWallet.balance,
                    type: 'bet',
                    amount: activeHand.bet
                });

                const newState = await BlackjackService.split(gameState);
                activeGames.set(user.id, newState);

                callback({
                    success: true,
                    data: {
                        playerHands: newState.playerHands,
                        dealerHand: { cards: [newState.dealerHand.cards[0], { rank: '?', suit: '?' }], revealed: false },
                        activeHandIndex: newState.activeHandIndex,
                        isComplete: newState.isComplete
                    }
                });
            } catch (error) {
                callback({ success: false, message: error.message });
            }
        });

        socket.on('disconnect', () => {
            // Note: We DON'T delete the active game on disconnect so user can reconnect
            // However, it should have an expiry or the user can resume.
            // For now, we keep it in the Map.
            logger.info(`Blackjack disconnected: ${user.username}`);
        });
    });
};
