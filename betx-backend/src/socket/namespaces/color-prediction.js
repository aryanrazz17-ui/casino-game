const { generateResult, processBet } = require('../../services/game/color-prediction.service');
const WalletService = require('../../services/wallet.service');
const supabase = require('../../config/supabase');
const { logger } = require('../../utils/logger');
const crypto = require('crypto');

// State Management
let gameState = {
    roundId: Date.now(),
    status: 'betting', // 'betting', 'processing', 'result'
    timeLeft: 30, // seconds
    history: [], // Last 20 results
    currentBets: [],
    nextPhase: Date.now() + 30000
};

const ROUND_DURATION = 30; // seconds
const LOCK_DURATION = 5; // seconds before end

module.exports = (namespace) => {
    // Start Game Loop
    startGameLoop(namespace);

    namespace.on('connection', (socket) => {
        // Send initial state
        socket.emit('color:state', gameState);

        // Allow client to request state explicitly
        socket.on('getColorState', () => {
            socket.emit('color:state', gameState);
        });

        socket.on('placeBet', async (data) => {
            // data: { type, value, amount, currency }
            if (gameState.timeLeft <= LOCK_DURATION) {
                return socket.emit('error', { message: 'Betting is closed for this round' });
            }
            if (!socket.user) {
                return socket.emit('error', { message: 'Unauthorized' });
            }

            const amount = parseFloat(data.amount);
            if (isNaN(amount) || amount <= 0) {
                return socket.emit('error', { message: 'Invalid amount' });
            }

            // Check if user already moved on this type in this round
            const existingBet = gameState.currentBets.find(
                b => b.userId === socket.user.id && b.type === data.type
            );
            if (existingBet) {
                return socket.emit('error', { message: `You already placed a ${data.type} bet this round` });
            }

            try {
                // 1. Deduct Balance
                await WalletService.deduct(socket.user.id, amount, data.currency || 'INR');

                // 2. Log Transaction
                await supabase.from('transactions').insert({
                    user_id: socket.user.id,
                    type: 'bet',
                    currency: data.currency || 'INR',
                    amount: amount,
                    status: 'completed',
                    payment_gateway: 'internal',
                    metadata: {
                        gameType: 'color_prediction',
                        roundId: gameState.roundId,
                        betType: data.type,
                        betValue: data.value
                    }
                });

                // 3. Add to Application State
                const bet = {
                    userId: socket.user.id,
                    username: socket.user.username,
                    amount: amount,
                    currency: data.currency || 'INR',
                    type: data.type,
                    value: data.value,
                    timestamp: Date.now()
                };

                gameState.currentBets.push(bet);

                // 4. Confirm to User
                socket.emit('betConfirmed', bet);
                namespace.emit('newBet', { amount: bet.amount, type: bet.type }); // Anonymous broadcast needed?

            } catch (error) {
                logger.error(`Bet Error: ${error.message}`);
                socket.emit('error', { message: error.message || 'Failed to place bet' });
            }
        });
    });
};

function startGameLoop(io) {
    setInterval(async () => {
        gameState.timeLeft--;

        if (gameState.timeLeft <= 0) {
            if (gameState.status === 'betting') {
                // Close Betting, Generate Result
                await finishRound(io);
            }
        } else {
            // Broadcast Timer Tick
            io.emit('timer', gameState.timeLeft);
        }
    }, 1000);
}

async function finishRound(io) {
    gameState.status = 'processing';
    io.emit('status', 'processing');

    try {
        // 1. Generate Result
        const serverSeed = crypto.randomBytes(32).toString('hex');
        const clientSeed = '00000000000000000002015a86a67676757657576'; // Public seed or hash of block
        const result = generateResult(serverSeed, clientSeed, gameState.roundId);

        const winners = [];
        const gameInserts = [];
        const winTransactions = [];

        // 2. Process Bets
        for (const bet of gameState.currentBets) {
            const betResult = processBet(bet, result);

            // Prepare Game History Record
            gameInserts.push({
                user_id: bet.userId,
                game_type: 'color_prediction',
                currency: bet.currency,
                bet_amount: bet.amount,
                payout: betResult.payout,
                multiplier: betResult.multiplier,
                profit: betResult.profit,
                is_win: betResult.isWin,
                result: result,
                server_seed: serverSeed,
                server_seed_hash: crypto.createHash('sha256').update(serverSeed).digest('hex'),
                client_seed: clientSeed,
                nonce: gameState.roundId,
                revealed: true
            });

            // Credit Winners
            if (betResult.isWin) {
                winners.push({
                    userId: bet.userId,
                    payout: betResult.payout,
                    ...betResult
                });

                try {
                    await WalletService.credit(bet.userId, betResult.payout, bet.currency);

                    winTransactions.push({
                        user_id: bet.userId,
                        type: 'win',
                        currency: bet.currency,
                        amount: betResult.payout,
                        status: 'completed',
                        payment_gateway: 'internal',
                        metadata: {
                            gameType: 'color_prediction',
                            roundId: gameState.roundId
                        }
                    });
                } catch (err) {
                    logger.error(`Failed to credit winner ${bet.userId}: ${err.message}`);
                }
            }
        }

        // 3. Batch Writes to DB
        // Note: Supabase might limit batch size, but for MVP/Low volume this is fine.
        if (gameInserts.length > 0) {
            const { error } = await supabase.from('games').insert(gameInserts);
            if (error) logger.error('Failed to save game history:', error);
        }
        if (winTransactions.length > 0) {
            const { error } = await supabase.from('transactions').insert(winTransactions);
            if (error) logger.error('Failed to save win transactions:', error);
        }

        // 4. Update History
        gameState.history.unshift({
            roundId: gameState.roundId,
            number: result.number,
            colors: result.colors,
            size: result.size,
            hash: result.hash
        });
        if (gameState.history.length > 20) gameState.history.pop();

        // 5. Broadcast Result
        gameState.status = 'result';
        io.emit('result', {
            number: result.number,
            colors: result.colors,
            size: result.size,
            winners: winners.map(w => ({ username: w.username, payout: w.payout })) // minimal data
        });

        // 6. Schedule Next Round
        setTimeout(() => {
            gameState.roundId = Date.now();
            gameState.currentBets = [];
            gameState.timeLeft = ROUND_DURATION;
            gameState.status = 'betting';
            gameState.nextPhase = Date.now() + (ROUND_DURATION * 1000);
            io.emit('newRound', {
                roundId: gameState.roundId,
                timeLeft: gameState.timeLeft
            });
        }, 5000); // 5 seconds result phase

    } catch (err) {
        logger.error(`Round Error: ${err.message}`);
        // Attempt recovery?
        gameState.status = 'betting'; // Reset
    }
}
