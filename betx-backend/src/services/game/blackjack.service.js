const pf = require('../../utils/provablyFairHelper');
const WalletService = require('../wallet.service');
const supabase = require('../../config/supabase');
const { v4: uuidv4 } = require('uuid');

/**
 * Blackjack Game Service
 * Handles game logic, provably fair deck generation, and hand validation.
 */
class BlackjackService {
    constructor() {
        this.deckSize = 52;
        this.suits = ['Spades', 'Hearts', 'Clubs', 'Diamonds'];
        this.ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    }

    /**
     * Get card details from index (0-51)
     */
    getCard(index) {
        const suitIndex = Math.floor(index / 13);
        const rankIndex = index % 13;
        const rank = this.ranks[rankIndex];
        const suit = this.suits[suitIndex];

        let value = parseInt(rank);
        if (['J', 'Q', 'K'].includes(rank)) value = 10;
        if (rank === 'A') value = 11; // Default to 11

        return {
            rank,
            suit,
            value,
            index,
            isRed: suit === 'Hearts' || suit === 'Diamonds'
        };
    }

    /**
     * Calculate hand value, adjusting for Aces
     */
    calculateHandValue(cards) {
        let total = 0;
        let aces = 0;

        cards.forEach(card => {
            total += card.value;
            if (card.rank === 'A') aces++;
        });

        while (total > 21 && aces > 0) {
            total -= 10;
            aces--;
        }

        return total;
    }

    /**
     * Generate a provably fair shuffled deck
     */
    generateDeck(serverSeed, clientSeed, nonce) {
        const shuffle = pf.generateShuffle(serverSeed, clientSeed, nonce, this.deckSize);
        return shuffle.map(idx => this.getCard(idx));
    }

    /**
     * Initialize a new round
     */
    async startRound(userId, betAmount, clientSeed) {
        if (!betAmount || betAmount <= 0) throw new Error('Invalid bet amount');

        const serverSeed = pf.generateServerSeed();
        const serverSeedHash = pf.hashSeed(serverSeed);
        const finalClientSeed = clientSeed || pf.generateClientSeed();
        const nonce = Date.now();

        const deck = this.generateDeck(serverSeed, finalClientSeed, nonce);
        let pointer = 0;

        // Deal: P -> D -> P -> D
        const playerHand = [deck[pointer++], deck[pointer++]];
        const dealerHand = [deck[pointer++], deck[pointer++]]; // Second card is "hole"

        const playerValue = this.calculateHandValue([playerHand[0], playerHand[1]]);
        const isPlayerBJ = playerValue === 21;

        const roundId = uuidv4();

        const gameState = {
            id: roundId,
            userId,
            betAmount,
            deck,
            pointer,
            playerHands: [
                {
                    cards: playerHand,
                    bet: betAmount,
                    status: isPlayerBJ ? 'blackjack' : 'active'
                }
            ],
            dealerHand: {
                cards: dealerHand,
                revealed: false
            },
            activeHandIndex: 0,
            isComplete: false,
            insuranceBet: 0,
            fairness: {
                serverSeed,
                serverSeedHash,
                clientSeed: finalClientSeed,
                nonce
            }
        };

        // If player has blackjack, we might still need to check dealer
        if (isPlayerBJ) {
            return this.stand(gameState);
        }

        return gameState;
    }

    /**
     * Player Hit
     */
    hit(state) {
        if (state.isComplete) throw new Error('Round already complete');
        const activeHand = state.playerHands[state.activeHandIndex];
        if (activeHand.status !== 'active') throw new Error('Hand is not active');

        const card = state.deck[state.pointer++];
        activeHand.cards.push(card);

        const value = this.calculateHandValue(activeHand.cards);
        if (value > 21) {
            activeHand.status = 'bust';
            // Move to next hand if exists, otherwise dealer turn
            return this.moveToNextHandOrDealer(state);
        } else if (value === 21) {
            activeHand.status = 'stand';
            return this.moveToNextHandOrDealer(state);
        }

        return state;
    }

    /**
     * Player Stand
     */
    stand(state) {
        if (state.isComplete) throw new Error('Round already complete');
        const activeHand = state.playerHands[state.activeHandIndex];
        if (activeHand.status === 'active') {
            activeHand.status = 'stand';
        }

        return this.moveToNextHandOrDealer(state);
    }

    /**
     * Double Down
     */
    async doubleDown(state) {
        if (state.isComplete) throw new Error('Round already complete');
        const activeHand = state.playerHands[state.activeHandIndex];
        if (activeHand.cards.length !== 2) throw new Error('Can only double on first two cards');
        if (activeHand.status !== 'active') throw new Error('Hand is not active');

        // Note: Wallet deduction for the additional bet should be handled by the caller/socket
        activeHand.bet *= 2;
        const card = state.deck[state.pointer++];
        activeHand.cards.push(card);

        const value = this.calculateHandValue(activeHand.cards);
        if (value > 21) {
            activeHand.status = 'bust';
        } else {
            activeHand.status = 'stand';
        }

        return this.moveToNextHandOrDealer(state);
    }

    /**
     * Split Hand
     */
    async split(state) {
        if (state.isComplete) throw new Error('Round already complete');
        const activeHand = state.playerHands[state.activeHandIndex];
        if (activeHand.cards.length !== 2) throw new Error('Can only split on first two cards');
        if (activeHand.cards[0].rank !== activeHand.cards[1].rank) throw new Error('Cards must have same rank to split');

        const card1 = activeHand.cards[0];
        const card2 = activeHand.cards[1];

        // Create two new hands
        const hand1 = {
            cards: [card1, state.deck[state.pointer++]],
            bet: activeHand.bet,
            status: 'active'
        };
        const hand2 = {
            cards: [card2, state.deck[state.pointer++]],
            bet: activeHand.bet,
            status: 'active'
        };

        // Replace active hand with hand1, insert hand2 after it
        state.playerHands.splice(state.activeHandIndex, 1, hand1, hand2);

        // Check for immediate 21s
        if (this.calculateHandValue(hand1.cards) === 21) hand1.status = 'stand';

        // We stay on hand1 until hit/stand/bust
        return state;
    }

    /**
     * Handle transitions between player hands or to dealer turn
     */
    moveToNextHandOrDealer(state) {
        // Find next active hand
        let nextHandIndex = state.activeHandIndex + 1;
        while (nextHandIndex < state.playerHands.length) {
            if (state.playerHands[nextHandIndex].status === 'active') {
                state.activeHandIndex = nextHandIndex;
                return state;
            }
            nextHandIndex++;
        }

        // No more active hands, dealer turn
        return this.dealerTurn(state);
    }

    /**
     * Dealer executes their turn
     */
    dealerTurn(state) {
        state.dealerHand.revealed = true;

        // If all player hands are bust or blackjack, dealer might not need to hit, 
        // but standard rules usually have dealer reveal/hit anyway if someone hasn't lost yet.
        // Actually, if someone has a "stand" hand, dealer must play.
        const needsToPlay = state.playerHands.some(h => h.status === 'stand' || h.status === 'blackjack');

        if (needsToPlay) {
            let dealerValue = this.calculateHandValue(state.dealerHand.cards);
            // Hits until 17. 
            // TODO: Soft 17 config
            while (dealerValue < 17) {
                state.dealerHand.cards.push(state.deck[state.pointer++]);
                dealerValue = this.calculateHandValue(state.dealerHand.cards);
            }
        }

        return this.resolveRound(state);
    }

    /**
     * Finalize results and determine payouts
     */
    resolveRound(state) {
        state.isComplete = true;
        const dealerValue = this.calculateHandValue(state.dealerHand.cards);
        const dealerBust = dealerValue > 21;
        const isDealerBJ = dealerValue === 21 && state.dealerHand.cards.length === 2;

        state.playerHands.forEach(hand => {
            const playerValue = this.calculateHandValue(hand.cards);
            const isPlayerBJ = hand.status === 'blackjack';

            if (hand.status === 'bust') {
                hand.result = 'LOSE';
                hand.payout = 0;
            } else if (isPlayerBJ) {
                if (isDealerBJ) {
                    hand.result = 'PUSH';
                    hand.payout = hand.bet;
                } else {
                    hand.result = 'BLACKJACK';
                    hand.payout = hand.bet * 2.5; // 3:2 payout + stake
                }
            } else if (dealerBust) {
                hand.result = 'WIN';
                hand.payout = hand.bet * 2;
            } else if (playerValue > dealerValue) {
                hand.result = 'WIN';
                hand.payout = hand.bet * 2;
            } else if (playerValue < dealerValue) {
                hand.result = 'LOSE';
                hand.payout = 0;
            } else {
                // Tie but check for dealer BJ vs player 21 (non-BJ)
                if (isDealerBJ) {
                    hand.result = 'LOSE';
                    hand.payout = 0;
                } else {
                    hand.result = 'PUSH';
                    hand.payout = hand.bet;
                }
            }
        });

        return state;
    }
}

module.exports = new BlackjackService();
