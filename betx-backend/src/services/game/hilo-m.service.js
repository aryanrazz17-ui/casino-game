const pf = require('../../utils/provablyFairHelper');
const supabase = require('../../config/supabase');
const WalletService = require('../../services/wallet.service');
const { logger } = require('../../utils/logger');

class HiloMService {
    constructor() {
        this.status = 'BETTING';
        this.bettingTime = 10000; // 10s
        this.calculatingTime = 3000; // 3s
        this.startCard = null;
        this.history = [];
        this.currentBets = [];
        this.io = null;
        this.timer = null;
        this.lastUpdateTime = Date.now();

        this.ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        this.suits = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];

        this.multipliers = {
            'A': { 'Higher': 1.073, 'Lower': 12.870 },
            '2': { 'Higher': 1.073, 'Lower': 6.435 },
            '3': { 'Higher': 1.170, 'Lower': 4.290 },
            '4': { 'Higher': 1.287, 'Lower': 3.217 },
            '5': { 'Higher': 1.430, 'Lower': 2.574 },
            '6': { 'Higher': 1.609, 'Lower': 2.145 },
            '7': { 'Higher': 1.839, 'Lower': 1.839 },
            '8': { 'Higher': 2.145, 'Lower': 1.609 },
            '9': { 'Higher': 2.574, 'Lower': 1.43 },
            '10': { 'Higher': 3.217, 'Lower': 1.287 },
            'J': { 'Higher': 4.290, 'Lower': 1.170 },
            'Q': { 'Higher': 6.435, 'Lower': 1.073 },
            'K': { 'Higher': 12.870, 'Lower': 1.073 }
        };
    }

    init(io) {
        this.io = io;
        this.startCard = this.generateRandomCard();
        this.startLoop();
    }

    generateRandomCard() {
        const rankIndex = Math.floor(Math.random() * 13);
        const suitIndex = Math.floor(Math.random() * 4);
        return {
            rank: this.ranks[rankIndex],
            suit: this.suits[suitIndex],
            value: rankIndex + 1,
            privateSeed: pf.generateServerSeed(),
            publicSeed: Math.random().toString(36).substring(2, 10)
        };
    }

    startLoop() {
        this.status = 'BETTING';
        this.lastUpdateTime = Date.now();
        this.currentBets = [];

        if (this.io) {
            this.io.emit('game-status', 1); // 1 = BETTING
            this.io.emit('game-start', {
                publicSeed: this.startCard.publicSeed,
                privateSeedHash: pf.hashSeed(this.startCard.privateSeed)
            });
        }

        this.timer = setTimeout(() => this.calculateResult(), this.bettingTime);
    }

    async calculateResult() {
        this.status = 'CALCULATIONG';
        this.lastUpdateTime = Date.now();
        if (this.io) this.io.emit('game-status', 2); // 2 = CALCULATING

        const nextCard = this.generateRandomCard();
        const prevCard = this.startCard;

        // Determine winners
        const evaluatedBets = this.currentBets.map(bet => {
            let isWin = false;
            let multiplier = 0;

            const prevVal = prevCard.value;
            const nextVal = nextCard.value;
            const nextSuit = nextCard.suit;
            const nextRank = nextCard.rank;

            switch (bet.betType) {
                case 'hi':
                    isWin = nextVal > prevVal;
                    multiplier = this.multipliers[prevCard.rank].Higher;
                    break;
                case 'low':
                    isWin = nextVal < prevVal;
                    multiplier = this.multipliers[prevCard.rank].Lower;
                    break;
                case 'red':
                    isWin = ['Hearts', 'Diamonds'].includes(nextSuit);
                    multiplier = 2.0;
                    break;
                case 'black':
                    isWin = ['Spades', 'Clubs'].includes(nextSuit);
                    multiplier = 2.0;
                    break;
                case 'range_2_9':
                    isWin = nextVal >= 2 && nextVal <= 9;
                    multiplier = 1.5;
                    break;
                case 'range_j_q_k_a':
                    isWin = ['J', 'Q', 'K', 'A'].includes(nextRank);
                    multiplier = 3.0;
                    break;
                case 'range_k_a':
                    isWin = ['K', 'A'].includes(nextRank);
                    multiplier = 6.0;
                    break;
                case 'a':
                    isWin = nextRank === 'A';
                    multiplier = 12.0;
                    break;
            }

            if (isWin) {
                bet.status = 'WIN';
                bet.multiplier = multiplier;
                bet.profit = bet.amount * multiplier;
            } else {
                bet.status = 'LOST';
                bet.multiplier = 0;
                bet.profit = -bet.amount;
            }
            return bet;
        });

        // Credit winners and save to DB
        for (const bet of evaluatedBets) {
            if (bet.status === 'WIN') {
                try {
                    await WalletService.credit(bet.userId, bet.profit, bet.currency, {
                        gameType: 'hilo-multiplier',
                        type: 'win'
                    });
                    // Emit individual wallet updates
                    this.io.to(`user:${bet.userId}`).emit('wallet_update', {
                        currency: bet.currency,
                        amount: bet.profit,
                        type: 'win'
                    });
                } catch (e) {
                    logger.error(`Error crediting Hilo-M win to ${bet.userId}`, e);
                }
            }

            // Save each bet as a game record (or group them?)
            // Usually, multiplayer games have 1 round record and multiple bet records.
            // But our `games` table is per-user.
            await supabase.from('games').insert({
                user_id: bet.userId,
                game_type: 'hilo', // Or 'hilo-multiplier'
                bet_amount: bet.amount,
                currency: bet.currency,
                payout: bet.status === 'WIN' ? bet.profit : 0,
                multiplier: bet.multiplier,
                profit: bet.status === 'WIN' ? bet.profit - bet.amount : -bet.amount,
                is_win: bet.status === 'WIN',
                result: {
                    prevCard,
                    nextCard,
                    betType: bet.betType
                },
                server_seed: prevCard.privateSeed,
                server_seed_hash: pf.hashSeed(prevCard.privateSeed),
                client_seed: prevCard.publicSeed,
                nonce: 0,
                revealed: true
            });
        }

        // Broadast result
        if (this.io) {
            this.io.emit('game-end', {
                card: nextCard,
                privateSeed: prevCard.privateSeed,
                publicSeed: prevCard.publicSeed,
                bets: evaluatedBets
            });
        }

        this.history.unshift(nextCard);
        if (this.history.length > 50) this.history.pop();

        this.startCard = nextCard;

        this.timer = setTimeout(() => this.startLoop(), this.calculatingTime);
    }

    addBet(userId, betData) {
        if (this.status !== 'BETTING') return false;
        this.currentBets.push({
            userId,
            ...betData,
            status: 'BET'
        });
        return true;
    }

    getGameState() {
        return {
            status: this.status === 'BETTING' ? 1 : 2,
            dt: this.lastUpdateTime,
            bettingTime: this.bettingTime,
            calculatingTime: this.calculatingTime,
            privateSeedHash: pf.hashSeed(this.startCard.privateSeed),
            publicSeed: this.startCard.publicSeed,
            startCard: this.startCard,
            history: this.history
        };
    }
}

module.exports = new HiloMService();
