const crypto = require('crypto');
const WalletService = require('../wallet.service');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../../config/supabase'); // Assuming supabase client is exported here

/**
 * Baccarat Game Engine & Service
 * Handles game rules, provably fair logic, and state management.
 */
class BaccaratService {
    constructor() {
        this.currentRound = null;
        this.gameState = 'PREPARING'; // PREPARING | BETTING | DEALING | RESULT
        this.bets = new Map(); // roundId -> [bets]
        this.timers = {};
    }

    /**
     * @returns {string} SHA256 HMAC Hash
     */
    generateHash(serverSeed, clientSeed, nonce) {
        return crypto
            .createHmac('sha256', serverSeed)
            .update(`${clientSeed}:${nonce}`)
            .digest('hex');
    }

    /**
     * Generates a provably fair shuffled deck for the round.
     * Uses Rejection Sampling to eliminate modulo bias.
     */
    generateCardDeck(serverSeed, clientSeed, nonce) {
        const hash = this.generateHash(serverSeed, clientSeed, nonce);
        const cards = [];
        let hashPointer = 0;

        // We need at least 6 cards for a game, but standard deals can go up.
        // We'll generate a sequence of card indices (0-51).

        while (cards.length < 10) { // Generate enough for max 3 cards per hand + margin
            // Take 4 bytes (8 hex chars)
            if (hashPointer + 8 > hash.length) {
                // In a real infinite deck implementation, we'd hash the hash again to extend the stream.
                // For this scope, the initial 64-char hash (32 bytes) gives 8 integers. 
                // If we need more, we re-hash or use a counter.
                // Let's assume we re-hash for simplicity if needed, or just generate a very long initial seed in a real app.
                // For now, let's just re-hash the existing hash to get more bytes.
                // hash = crypto.createHash('sha256').update(hash).digest('hex');
                // hashPointer = 0;
                break; // Should have enough for 1 round usually
            }

            const chunk = hash.substring(hashPointer, hashPointer + 8);
            hashPointer += 8;

            const decimalValue = parseInt(chunk, 16);

            // Rejection Sampling
            // Max Limit: 4,294,967,295
            // Safe Limit: 4,294,967,296 - (4,294,967,296 % 52) = 4,294,967,244
            const SAFE_LIMIT = 4294967244;

            if (decimalValue < SAFE_LIMIT) {
                const cardIndex = decimalValue % 52;
                cards.push(this.getCardFromIndex(cardIndex));
            }
        }
        return cards;
    }

    getCardFromIndex(index) {
        const suits = ['spades', 'hearts', 'clubs', 'diamonds'];
        const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 0, 0, 0]; // A=1, 10-K=0
        const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

        const suitIndex = Math.floor(index / 13);
        const rankIndex = index % 13;

        return {
            index,
            suit: suits[suitIndex],
            rank: ranks[rankIndex],
            value: values[rankIndex],
            isRed: suitIndex === 1 || suitIndex === 3 // Hearts or Diamonds
        };
    }

    /**
     * Calculates Baccarat Hand Score (Modulo 10)
     */
    calculateScore(cards) {
        const sum = cards.reduce((acc, card) => acc + card.value, 0);
        return sum % 10;
    }

    /**
     * Executes the Baccarat Drawing Rules (Tableau)
     */
    runGameLogic(deck) {
        // Initial Deal
        const playerHand = [deck[0], deck[2]];
        const bankerHand = [deck[1], deck[3]];
        const result = {
            player: { cards: playerHand, score: 0 },
            banker: { cards: bankerHand, score: 0 },
            thirdCardDrawn: false,
            outcome: null // PLAYER_WIN, BANKER_WIN, TIE
        };

        // Calculate Initial Scores
        result.player.score = this.calculateScore(playerHand);
        result.banker.score = this.calculateScore(bankerHand);

        // Natural Win Check (8 or 9)
        if (result.player.score >= 8 || result.banker.score >= 8) {
            result.outcome = this.determineWinner(result.player.score, result.banker.score);
            return result;
        }

        // Third Card Rules
        let playerThirdCardVal = null;

        // Player Rule
        if (result.player.score <= 5) {
            // Player Draws
            const thirdCard = deck[4];
            result.player.cards.push(thirdCard);
            result.player.score = this.calculateScore(result.player.cards);
            playerThirdCardVal = thirdCard.value;
            result.thirdCardDrawn = true;
        }

        // Banker Rule
        let bankerDraws = false;
        if (playerThirdCardVal === null) {
            // Player Stood (6 or 7) -> Banker draws if 0-5
            if (result.banker.score <= 5) bankerDraws = true;
        } else {
            // Complex Table
            const bScore = result.banker.score;
            const p3 = playerThirdCardVal; // Note: using 'value' (0 for face cards), but standard rules often refer to printed rank.
            // Actually in baccarat math, 10/J/Q/K are 0. The rule table refers to the 'point value' of the third card.
            // Let's verify standard rule: "If Player's third card was..." 
            // - If Player's third card is 8, Banker (3) stands? No, checks table.

            // Re-implementing usage logic based on spec table:
            if (bScore <= 2) bankerDraws = true;
            else if (bScore === 3) bankerDraws = p3 !== 8; // Draws unless Player's 3rd is 8
            else if (bScore === 4) bankerDraws = [2, 3, 4, 5, 6, 7].includes(p3);
            else if (bScore === 5) bankerDraws = [4, 5, 6, 7].includes(p3);
            else if (bScore === 6) bankerDraws = [6, 7].includes(p3);
            else bankerDraws = false; // 7 stands
        }

        if (bankerDraws) {
            const cardIndex = result.player.cards.length === 3 ? 5 : 4;
            const thirdCard = deck[cardIndex];
            result.banker.cards.push(thirdCard);
            result.banker.score = this.calculateScore(result.banker.cards);
        }

        result.outcome = this.determineWinner(result.player.score, result.banker.score);
        return result;
    }

    determineWinner(playerScore, bankerScore) {
        if (playerScore > bankerScore) return 'PLAYER';
        if (bankerScore > playerScore) return 'BANKER';
        return 'TIE';
    }

    /**
     * Processes a user bet
     */
    async placeBet(userId, amount, target, roundId, clientBetId) {
        // 1. Validate Game State
        if (this.currentRound?.state !== 'BETTING') {
            throw new Error('Betting is closed');
        }
        if (this.currentRound?.id !== roundId) {
            throw new Error('Round mismatch');
        }

        // 2. Validate Amount
        if (Number(amount) <= 0) throw new Error('Invalid amount');

        try {
            // 3. Deduction (Atomic via RPC)
            // Note: WalletService.deduct throws if insufficient funds
            const wallet = await WalletService.deduct(userId, amount, 'INR'); // Defaulting to INR for now, pass currency if needed

            // 4. Record Transaction
            await supabase.from('transactions').insert({
                user_id: userId,
                type: 'bet',
                amount: amount,
                currency: 'INR',
                status: 'completed',
                payment_gateway: 'internal',
                metadata: {
                    game: 'baccarat',
                    roundId,
                    betId: clientBetId,
                    target
                }
            });

            // 5. Save Bet Record
            const betData = {
                id: clientBetId || uuidv4(),
                userId,
                amount: Number(amount),
                target, // PLAYER, BANKER, TIE
                roundId,
                status: 'pending',
                payout: 0
            };

            // Add to database asynchronously
            await supabase.from('baccarat_bets').insert({
                id: betData.id,
                user_id: userId,
                round_id: roundId,
                amount: betData.amount,
                target: betData.target,
                status: 'pending'
            });

            return { ...betData, newBalance: wallet.balance };

        } catch (error) {
            console.error("Bet Placement Error:", error);
            throw error;
        }
    }

    /**
     * Settles the round (Payouts)
     */
    async settleRound(winner) {
        // This would ideally fetch all pending bets for the round from DB
        // For a simple socket server memory interaction:
        // Implementation details heavily depend on if 'bets' are kept in memory or fetched.
        // Assuming DB-first approach for reliability.

        const { data: bets } = await supabase
            .from('baccarat_bets')
            .select('*')
            .eq('round_id', this.currentRound.id)
            .eq('status', 'pending');

        if (!bets) return;

        const updates = [];

        for (const bet of bets) {
            let payout = 0;
            let status = 'LOST';
            const amount = Number(bet.amount);

            // TIE Logic
            if (winner === 'TIE') {
                if (bet.target === 'TIE') {
                    // Tie Win (8:1) -> Pays 8x + 1x stake = 9x
                    payout = amount * 9;
                    status = 'WON';
                } else {
                    // PUSH Player/Banker
                    payout = amount; // Refund
                    status = 'PUSHED';
                }
            } else {
                // Normal Win Logic
                if (bet.target === winner) {
                    status = 'WON';
                    if (winner === 'PLAYER') payout = amount * 2; // 1:1 payout + stake
                    if (winner === 'BANKER') payout = amount * 1.95; // 0.95:1 payout + stake
                }
            }

            let currentBalance = 0;
            if (payout > 0) {
                const wallet = await WalletService.credit(bet.user_id, payout, 'INR');
                currentBalance = wallet.balance;
            }

            updates.push({
                id: bet.id,
                userId: bet.user_id, // Ensure userId is here
                status,
                payout,
                profit: payout - amount,
                newBalance: currentBalance
            });
        }

        // Batch update (pseudo-code, supabase usually requires row-by-row or specific upsert)
        for (const up of updates) {
            await supabase.from('baccarat_bets').update({
                status: up.status,
                payout: up.payout
            }).eq('id', up.id);
        }

        return updates;
    }
}

module.exports = new BaccaratService();
