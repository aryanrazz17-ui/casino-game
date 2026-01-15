const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        gameType: {
            type: String,
            enum: ['dice', 'crash', 'mines', 'plinko', 'slots'],
            required: true,
            index: true,
        },
        betAmount: {
            type: mongoose.Schema.Types.Decimal128,
            required: true,
            get: (v) => parseFloat(v.toString()),
        },
        currency: {
            type: String,
            enum: ['INR', 'BTC', 'ETH', 'TRON'],
            default: 'INR',
        },
        payout: {
            type: mongoose.Schema.Types.Decimal128,
            default: 0,
            get: (v) => parseFloat(v.toString()),
        },
        multiplier: {
            type: Number,
            default: 0,
        },
        profit: {
            type: mongoose.Schema.Types.Decimal128,
            default: 0,
            get: (v) => parseFloat(v.toString()),
        },
        isWin: {
            type: Boolean,
            default: false,
        },
        result: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
        },
        fairness: {
            serverSeed: {
                type: String,
                required: true,
            },
            serverSeedHash: {
                type: String,
                required: true,
            },
            clientSeed: {
                type: String,
                required: true,
            },
            nonce: {
                type: Number,
                required: true,
            },
            revealed: {
                type: Boolean,
                default: false,
            },
        },
        transactionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Transaction',
        },
    },
    {
        timestamps: true,
        toJSON: { getters: true },
        toObject: { getters: true },
    }
);

// Indexes
gameSchema.index({ userId: 1, createdAt: -1 });
gameSchema.index({ gameType: 1, createdAt: -1 });
gameSchema.index({ isWin: 1 });
gameSchema.index({ createdAt: -1 });

// Calculate profit before saving
gameSchema.pre('save', function (next) {
    if (this.isNew) {
        const betAmount = parseFloat(this.betAmount);
        const payout = parseFloat(this.payout);
        this.profit = payout - betAmount;
    }
    next();
});

// Statics
gameSchema.statics.getLeaderboard = async function (gameType, limit = 10) {
    return this.aggregate([
        {
            $match: {
                gameType,
                isWin: true,
            },
        },
        {
            $group: {
                _id: '$userId',
                totalWins: { $sum: 1 },
                totalProfit: { $sum: '$profit' },
                biggestWin: { $max: '$payout' },
                biggestMultiplier: { $max: '$multiplier' },
            },
        },
        {
            $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'user',
            },
        },
        {
            $unwind: '$user',
        },
        {
            $project: {
                username: '$user.username',
                avatar: '$user.profile.avatar',
                totalWins: 1,
                totalProfit: 1,
                biggestWin: 1,
                biggestMultiplier: 1,
            },
        },
        {
            $sort: { totalProfit: -1 },
        },
        {
            $limit: limit,
        },
    ]);
};

gameSchema.statics.getUserStats = async function (userId, gameType = null) {
    const match = { userId: mongoose.Types.ObjectId(userId) };
    if (gameType) match.gameType = gameType;

    const result = await this.aggregate([
        { $match: match },
        {
            $group: {
                _id: null,
                totalGames: { $sum: 1 },
                totalWins: { $sum: { $cond: ['$isWin', 1, 0] } },
                totalBet: { $sum: '$betAmount' },
                totalPayout: { $sum: '$payout' },
                totalProfit: { $sum: '$profit' },
                biggestWin: { $max: '$payout' },
                biggestMultiplier: { $max: '$multiplier' },
            },
        },
    ]);

    if (result.length === 0) {
        return {
            totalGames: 0,
            totalWins: 0,
            winRate: 0,
            totalBet: 0,
            totalPayout: 0,
            totalProfit: 0,
            biggestWin: 0,
            biggestMultiplier: 0,
        };
    }

    const stats = result[0];
    stats.winRate = stats.totalGames > 0 ? (stats.totalWins / stats.totalGames) * 100 : 0;
    return stats;
};

module.exports = mongoose.model('Game', gameSchema);
