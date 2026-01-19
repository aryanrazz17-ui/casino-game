const AviatorService = require('../../services/game/aviator.service');
const WalletService = require('../../services/wallet.service');
const supabase = require('../../config/supabase');
const { logger } = require('../../utils/logger');

/**
 * Aviator Game - Multiplayer Crash Game
 * Real-time multiplier updates with server-authoritative timing
 */

// Game state
let currentRound = null;
let roundInterval = null;
let bettingPhase = true;
let activeBets = new Map(); // socketId -> bet data

const BETTING_TIME = 5000; // 5 seconds to place bets
const MIN_FLIGHT_TIME = 1000; // Minimum 1 second flight

module.exports = (aviator) => {

    // Start the game loop
    startGameLoop();

    aviator.on('connection', (socket) => {
        const user = socket.user;

        if (!user || !user.id) {
            logger.error('Aviator connection without authenticated user');
            socket.disconnect();
            return;
        }

        logger.info(`Aviator connected: ${user.username} (${socket.id})`);

        // Send current game state
        socket.emit('aviator:state', {
            bettingPhase,
            round: currentRound ? {
                roundId: currentRound.roundId,
                status: currentRound.status,
                startTime: currentRound.startTime,
                serverSeedHash: currentRound.serverSeedHash
            } : null
        });

        // Place bet
        socket.on('aviator:bet', async (payload, callback) => {
            try {
                const { betAmount, autoCashout, currency = 'INR', clientSeed } = payload;

                // Validate betting phase
                if (!bettingPhase) {
                    return callback({
                        success: false,
                        message: 'Betting is closed for this round'
                    });
                }

                // Check if user already has a bet this round
                if (activeBets.has(socket.id)) {
                    return callback({
                        success: false,
                        message: 'You already have a bet in this round'
                    });
                }

                // Validate bet
                try {
                    AviatorService.validateBet(betAmount, autoCashout);
                } catch (e) {
                    return callback({ success: false, message: e.message });
                }

                // Check balance
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
                    aviator.to(`user:${user.id}`).emit('wallet_update', {
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

                // Store bet
                const bet = {
                    userId: user.id,
                    username: user.username,
                    betAmount,
                    autoCashout,
                    currency,
                    cashedOut: false,
                    cashoutMultiplier: null,
                    payout: 0
                };

                activeBets.set(socket.id, bet);

                // Log bet transaction
                await supabase.from('transactions').insert({
                    user_id: user.id,
                    type: 'bet',
                    currency,
                    amount: betAmount,
                    status: 'completed',
                    payment_gateway: 'internal',
                    metadata: {
                        gameType: 'aviator',
                        roundId: currentRound?.roundId
                    }
                });

                logger.info(`Aviator bet: ${user.username} | ${betAmount} | Auto: ${autoCashout || 'manual'}`);

                // Broadcast bet to all players
                aviator.emit('aviator:bet_placed', {
                    username: user.username,
                    betAmount,
                    autoCashout
                });

                callback({
                    success: true,
                    data: {
                        betAmount,
                        autoCashout,
                        roundId: currentRound?.roundId
                    }
                });

            } catch (error) {
                logger.error(`Aviator bet error for ${user.username}:`, error);
                callback({
                    success: false,
                    message: error.message || 'Bet placement failed'
                });
            }
        });

        // Manual cashout
        socket.on('aviator:cashout', async (payload, callback) => {
            try {
                if (bettingPhase || currentRound?.status !== 'flying') {
                    return callback({
                        success: false,
                        message: 'Cannot cashout right now'
                    });
                }

                const bet = activeBets.get(socket.id);
                if (!bet) {
                    return callback({
                        success: false,
                        message: 'No active bet found'
                    });
                }

                if (bet.cashedOut) {
                    return callback({
                        success: false,
                        message: 'Already cashed out'
                    });
                }

                // Calculate current multiplier
                const elapsed = Date.now() - currentRound.startTime;
                const currentMultiplier = AviatorService.calculateMultiplier(elapsed);

                // Check if already crashed
                if (currentMultiplier >= currentRound.crashPoint) {
                    return callback({
                        success: false,
                        message: 'Too late! Plane crashed'
                    });
                }

                // Process cashout
                const result = AviatorService.calculateCashout(bet.betAmount, currentMultiplier);

                bet.cashedOut = true;
                bet.cashoutMultiplier = currentMultiplier;
                bet.payout = result.payout;

                // Credit winnings
                const updatedWallet = await WalletService.credit(user.id, result.payout, bet.currency);

                // Emit real-time wallet update
                aviator.to(`user:${user.id}`).emit('wallet_update', {
                    currency: bet.currency,
                    newBalance: updatedWallet.balance,
                    type: 'win',
                    amount: result.payout,
                    message: `Nice! You cashed out at ${currentMultiplier}x and won ${result.payout}!`
                });

                // Log win transaction
                await supabase.from('transactions').insert({
                    user_id: user.id,
                    type: 'win',
                    currency: bet.currency,
                    amount: result.payout,
                    status: 'completed',
                    payment_gateway: 'internal',
                    metadata: {
                        gameType: 'aviator',
                        roundId: currentRound?.roundId,
                        multiplier: currentMultiplier
                    }
                });

                logger.info(`Aviator cashout: ${user.username} | ${currentMultiplier}x | ${result.payout}`);

                // Broadcast cashout
                aviator.emit('aviator:player_cashed_out', {
                    username: user.username,
                    multiplier: currentMultiplier,
                    payout: result.payout
                });

                callback({
                    success: true,
                    data: {
                        multiplier: currentMultiplier,
                        payout: result.payout,
                        profit: result.profit
                    }
                });

            } catch (error) {
                logger.error(`Aviator cashout error for ${user.username}:`, error);
                callback({
                    success: false,
                    message: error.message || 'Cashout failed'
                });
            }
        });

        socket.on('disconnect', () => {
            logger.info(`Aviator disconnected: ${user.username} (${socket.id})`);
            // Keep bet active even if disconnected (they can reconnect)
        });
    });

    /**
     * Game Loop - Manages rounds
     */
    function startGameLoop() {
        logger.info('🛫 Aviator game loop started');

        // Start first round
        startBettingPhase();
    }

    function startBettingPhase() {
        bettingPhase = true;
        activeBets.clear();

        // Create new round
        currentRound = AviatorService.createRound(Date.now());
        currentRound.status = 'pending';

        logger.info(`Aviator: Betting phase started | Round ${currentRound.roundId} | Crash: ${currentRound.crashPoint}x`);

        // Broadcast betting phase
        aviator.emit('aviator:betting_phase', {
            roundId: currentRound.roundId,
            serverSeedHash: currentRound.serverSeedHash,
            bettingTime: BETTING_TIME
        });

        // Start flight after betting time
        setTimeout(() => {
            startFlight();
        }, BETTING_TIME);
    }

    function startFlight() {
        bettingPhase = false;
        currentRound.status = 'flying';
        currentRound.startTime = Date.now();

        logger.info(`Aviator: Flight started | Round ${currentRound.roundId}`);

        // Broadcast flight start
        aviator.emit('aviator:flight_started', {
            roundId: currentRound.roundId,
            startTime: currentRound.startTime
        });

        // Update multiplier every 100ms
        roundInterval = setInterval(() => {
            const elapsed = Date.now() - currentRound.startTime;
            const currentMultiplier = AviatorService.calculateMultiplier(elapsed);

            // Check if crashed
            if (currentMultiplier >= currentRound.crashPoint) {
                crashPlane();
                return;
            }

            // Process auto-cashouts
            processAutoCashouts(currentMultiplier);

            // Broadcast current multiplier
            aviator.emit('aviator:multiplier_update', {
                multiplier: currentMultiplier,
                elapsed
            });

        }, 100); // 10 updates per second
    }

    async function processAutoCashouts(currentMultiplier) {
        for (const [socketId, bet] of activeBets.entries()) {
            if (bet.autoCashout && !bet.cashedOut && currentMultiplier >= bet.autoCashout) {
                const result = AviatorService.calculateCashout(bet.betAmount, bet.autoCashout);

                bet.cashedOut = true;
                bet.cashoutMultiplier = bet.autoCashout;
                bet.payout = result.payout;

                // Credit winnings
                const updatedWallet = await WalletService.credit(bet.userId, result.payout, bet.currency);

                // Emit real-time wallet update
                aviator.to(`user:${bet.userId}`).emit('wallet_update', {
                    currency: bet.currency,
                    newBalance: updatedWallet.balance,
                    type: 'win',
                    amount: result.payout,
                    message: `Auto Cashout! You won ${result.payout} at ${bet.autoCashout}x!`
                });

                // Log win transaction
                await supabase.from('transactions').insert({
                    user_id: bet.userId,
                    type: 'win',
                    currency: bet.currency,
                    amount: result.payout,
                    status: 'completed',
                    payment_gateway: 'internal',
                    metadata: {
                        gameType: 'aviator',
                        roundId: currentRound?.roundId,
                        multiplier: bet.autoCashout,
                        autoCashout: true
                    }
                });

                // Broadcast auto-cashout
                aviator.emit('aviator:player_cashed_out', {
                    username: bet.username,
                    multiplier: bet.autoCashout,
                    payout: result.payout,
                    auto: true
                });
            }
        }
    }

    async function crashPlane() {
        clearInterval(roundInterval);
        currentRound.status = 'crashed';

        logger.info(`Aviator: Plane crashed at ${currentRound.crashPoint}x | Round ${currentRound.roundId}`);

        // Broadcast crash
        aviator.emit('aviator:crashed', {
            crashPoint: currentRound.crashPoint,
            roundId: currentRound.roundId,
            serverSeed: currentRound.serverSeed,
            clientSeed: currentRound.clientSeed,
            nonce: currentRound.nonce
        });

        // Save all bets to database
        await saveRoundResults();

        // Start new round after 3 seconds
        setTimeout(() => {
            startBettingPhase();
        }, 3000);
    }

    async function saveRoundResults() {
        for (const [socketId, bet] of activeBets.entries()) {
            const isWin = bet.cashedOut;
            const profit = isWin ? bet.payout - bet.betAmount : -bet.betAmount;

            // Save game record
            await supabase.from('games').insert({
                user_id: bet.userId,
                game_type: 'aviator',
                bet_amount: bet.betAmount,
                currency: bet.currency,
                payout: bet.payout,
                multiplier: bet.cashoutMultiplier || 0,
                profit,
                is_win: isWin,
                result: {
                    crashPoint: currentRound.crashPoint,
                    cashoutAt: bet.cashoutMultiplier,
                    autoCashout: bet.autoCashout
                },
                server_seed: currentRound.serverSeed,
                server_seed_hash: currentRound.serverSeedHash,
                client_seed: currentRound.clientSeed,
                nonce: currentRound.nonce,
                revealed: true
            });
        }
    }
};
