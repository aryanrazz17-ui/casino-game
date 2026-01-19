const pf = require('../../utils/provablyFairHelper');

class RouletteService {
    constructor() {
        this.houseEdge = 0.05; // 5% house edge for some calcs, but roulette is defined by 0
        this.payouts = {
            'straight': 36, // 35 to 1
            'color': 2,    // 1 to 1
            'range': 2,    // 1 to 1 (1-18, 19-36)
            'odd_even': 2, // 1 to 1
            'column': 3    // 2 to 1 (2:1:0, etc)
        };
    }

    getOutcome(serverSeed, clientSeed, nonce) {
        const float = pf.generateFloat(serverSeed, clientSeed, nonce);
        return Math.floor(float * 37); // 0 to 36
    }

    calculateBetWin(outcome, bet) {
        // bet: { placeId: string | number, amount: number }
        const { placeId, amount } = bet;
        let p = 0; // multiplier

        // Straight
        if (typeof placeId === 'number') {
            if (placeId === outcome) return amount * this.payouts.straight;
        }

        // Color
        const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
        const blackNumbers = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

        if (placeId === 'Red' && redNumbers.includes(outcome)) return amount * this.payouts.color;
        if (placeId === 'Black' && blackNumbers.includes(outcome)) return amount * this.payouts.color;

        // Ranges
        if (placeId === '1_to_18' && outcome >= 1 && outcome <= 18) return amount * this.payouts.range;
        if (placeId === '19_to_36' && outcome >= 19 && outcome <= 36) return amount * this.payouts.range;

        // Odd/Even
        if (placeId === 'Odd' && outcome !== 0 && outcome % 2 !== 0) return amount * this.payouts.odd_even;
        if (placeId === 'Even' && outcome !== 0 && outcome % 2 === 0) return amount * this.payouts.odd_even;

        // Columns / Dozens (mapping depends on frontend layout)
        // Frontend uses: 1_to_12, 13_to_24, 25_to_36 as strings
        if (placeId === '1_to_12' && outcome >= 1 && outcome <= 12) return amount * 3;
        if (placeId === '13_to_24' && outcome >= 13 && outcome <= 24) return amount * 3;
        if (placeId === '25_to_36' && outcome >= 25 && outcome <= 36) return amount * 3;

        // 2:1 Rows
        if (placeId === '2:1:0' && outcome !== 0 && outcome % 3 === 1) return amount * 3; // 1, 4, 7...
        if (placeId === '2:1:1' && outcome !== 0 && outcome % 3 === 2) return amount * 3; // 2, 5, 8...
        if (placeId === '2:1:2' && outcome !== 0 && outcome % 3 === 0) return amount * 3; // 3, 6, 12...

        return 0;
    }
}

module.exports = new RouletteService();
