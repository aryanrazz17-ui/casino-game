const BaccaratService = require('../../services/game/baccarat.service');
const { v4: uuidv4 } = require('uuid');

/**
 * Baccarat Socket Namespace
 * Handles real-time game loop and client communication.
 */
module.exports = (namespace) => {
    // const namespace = io.of('/baccarat'); // REMOVED: Passed as argument


    // Game Loop Configuration
    const TIMERS = {
        BETTING: 15000, // 15 seconds
        RESULT_DISPLAY: 5000,
        CARD_DEAL_INTERVAL: 800 // 800ms between cards
    };

    let gameLoopTimeout;
    let currentRoundId = null;
    let dealingSequence = []; // Stores the scheduled card reveals
    let currentServerSeed = null;
    let currentServerHash = null;

    // --- Game Loop Functions ---

    const startNewRound = () => {
        // Cleanup previous
        BaccaratService.currentRound = null;

        // Setup new round
        currentRoundId = uuidv4();
        currentServerSeed = crypto.randomBytes(32).toString('hex');
        // Simple Nonce for this demo, in prod DB auto-increments or timestamp
        const nonce = Date.now().toString();

        // Client seed is public/fixed for this global room usually, or rotating
        const clientSeed = '00000000000000000002cd432a';

        currentServerHash = BaccaratService.generateHash(currentServerSeed, clientSeed, nonce);

        BaccaratService.currentRound = {
            id: currentRoundId,
            state: 'BETTING',
            startTime: Date.now(),
            endTime: Date.now() + TIMERS.BETTING,
            serverSeed: currentServerSeed,
            clientSeed,
            nonce
        };

        namespace.emit('round-start', {
            roundId: currentRoundId,
            hash: currentServerHash,
            timers: { betting: TIMERS.BETTING }
        });

        // Schedule next phase
        clearTimeout(gameLoopTimeout);
        gameLoopTimeout = setTimeout(closeBetting, TIMERS.BETTING);
    };

    const closeBetting = () => {
        BaccaratService.currentRound.state = 'DEALING';
        namespace.emit('game-status', { state: 'DEALING' });

        // Generate Deck & Outcome
        const deck = BaccaratService.generateCardDeck(
            BaccaratService.currentRound.serverSeed,
            BaccaratService.currentRound.clientSeed,
            BaccaratService.currentRound.nonce
        );

        const gameResult = BaccaratService.runGameLogic(deck);

        // Prepare Dealing Sequence (Events to emit over time)
        // Standard Baccarat Deal: P1, B1, P2, B2, (P3?), (B3?)
        dealingSequence = [];

        // Card 1: Player
        dealingSequence.push({ hand: 'PLAYER', card: gameResult.player.cards[0], index: 0, score: null });
        // Card 2: Banker
        dealingSequence.push({ hand: 'BANKER', card: gameResult.banker.cards[0], index: 0, score: null });
        // Card 3: Player
        dealingSequence.push({ hand: 'PLAYER', card: gameResult.player.cards[1], index: 1, score: BaccaratService.calculateScore([gameResult.player.cards[0], gameResult.player.cards[1]]) });
        // Card 4: Banker
        dealingSequence.push({ hand: 'BANKER', card: gameResult.banker.cards[1], index: 1, score: BaccaratService.calculateScore([gameResult.banker.cards[0], gameResult.banker.cards[1]]) });

        if (gameResult.player.cards.length > 2) {
            dealingSequence.push({
                hand: 'PLAYER',
                card: gameResult.player.cards[2],
                index: 2,
                score: gameResult.player.score
            });
        }

        if (gameResult.banker.cards.length > 2) {
            dealingSequence.push({
                hand: 'BANKER',
                card: gameResult.banker.cards[2],
                index: 2,
                score: gameResult.banker.score
            });
        }

        // Start revealing cards
        emitNextCard(0, gameResult);
    };

    const emitNextCard = (seqIndex, gameResult) => {
        if (seqIndex < dealingSequence.length) {
            const step = dealingSequence[seqIndex];
            namespace.emit('deal-card', step);

            setTimeout(() => {
                emitNextCard(seqIndex + 1, gameResult);
            }, TIMERS.CARD_DEAL_INTERVAL);
        } else {
            // All cards dealt
            finishRound(gameResult);
        }
    };

    const finishRound = async (gameResult) => {
        BaccaratService.currentRound.state = 'RESULT';

        // Settle Bets
        const payouts = await BaccaratService.settleRound(gameResult.outcome);

        // Emit individual wallet updates to winners
        if (payouts && payouts.length > 0) {
            payouts.forEach(p => {
                if (p.payout > 0) {
                    namespace.to(`user:${p.userId}`).emit('wallet_update', {
                        currency: 'INR',
                        newBalance: p.newBalance,
                        type: 'win',
                        amount: p.payout,
                        message: `Baccarat Result: ${p.status}! You won ${p.payout}!`
                    });
                }
            });
        }

        // Broadcast Result
        namespace.emit('game-result', {
            winner: gameResult.outcome,
            playerScore: gameResult.player.score,
            bankerScore: gameResult.banker.score,
            serverSeed: currentServerSeed, // REVEAL SEED
            payouts // Optional: list of winners if needed or handled individually
        });

        // Cooldown then restart
        setTimeout(startNewRound, TIMERS.RESULT_DISPLAY);
    };

    // --- Socket Connection Handler ---

    namespace.on('connection', (socket) => {
        // console.log(`Baccarat User connected: ${socket.id}`);

        // Send Sync Data
        if (BaccaratService.currentRound) {
            const now = Date.now();
            const timeLeft = Math.max(0, BaccaratService.currentRound.endTime - now);

            socket.emit('game-status', {
                state: BaccaratService.currentRound.state,
                roundId: BaccaratService.currentRound.id,
                timeLeft: BaccaratService.currentRound.state === 'BETTING' ? timeLeft : 0,
                // If in Dealing phase, simplistic catch-up can be sent here 
                // (ideally we send the full board state if mid-deal)
            });
        }

        socket.on('place-bet', async (data) => {
            // data: { amount, target, betId }
            try {
                // Ensure User is authenticated (middleware usually attaches user to socket)
                if (!socket.user || !socket.user.id) {
                    // handling strictly via socket middleware often
                    // throw new Error('Unauthorized');
                }
                const userId = socket.user ? socket.user.id : data.userId; // Fallback if middleware missing

                const bet = await BaccaratService.placeBet(
                    userId,
                    data.amount,
                    data.target,
                    BaccaratService.currentRound.id,
                    data.betId
                );

                socket.emit('bet-accepted', { bet });

                // Emit real-time wallet update
                namespace.to(`user:${userId}`).emit('wallet_update', {
                    currency: 'INR',
                    newBalance: bet.newBalance,
                    type: 'bet',
                    amount: data.amount
                });

                // Broadcast updates to pool (optional optimization: throttle this)
                namespace.emit('bet-update', {
                    totalPlayer: 0, // Calculate these from DB if needed
                    totalBanker: 0
                });

            } catch (err) {
                socket.emit('bet-error', { message: err.message });
            }
        });

        socket.on('disconnect', () => {
            // handle disconnect
        });
    });

    // Start the loop immediately
    const crypto = require('crypto');
    startNewRound();

    return namespace;
};
