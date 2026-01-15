const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: ['deposit', 'withdrawal', 'bet', 'win', 'refund', 'bonus', 'commission'],
            required: true,
        },
        currency: {
            type: String,
            enum: ['INR', 'BTC', 'ETH', 'TRON'],
            required: true,
        },
        amount: {
            type: mongoose.Schema.Types.Decimal128,
            required: true,
            get: (v) => parseFloat(v.toString()),
        },
        status: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'expired'],
            default: 'pending',
            index: true,
        },
        paymentMethod: {
            type: String,
            enum: ['upi', 'card', 'netbanking', 'crypto', 'wallet'],
        },
        paymentGateway: {
            type: String,
            enum: ['cashfree', 'tatum', 'internal'],
        },
        gatewayTransactionId: {
            type: String,
            sparse: true,
        },
        gatewayOrderId: {
            type: String,
            sparse: true,
        },
        balanceBefore: {
            type: mongoose.Schema.Types.Decimal128,
            get: (v) => (v ? parseFloat(v.toString()) : 0),
        },
        balanceAfter: {
            type: mongoose.Schema.Types.Decimal128,
            get: (v) => (v ? parseFloat(v.toString()) : 0),
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        notes: String,
        processedAt: Date,
        expiresAt: Date,
    },
    {
        timestamps: true,
        toJSON: { getters: true },
        toObject: { getters: true },
    }
);

// Indexes
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1 });
// transactionSchema.index({ gatewayTransactionId: 1 }, { sparse: true });
transactionSchema.index({ createdAt: -1 });

// Auto-expire pending transactions after 30 minutes
transactionSchema.pre('save', function (next) {
    if (this.isNew && this.status === 'pending' && !this.expiresAt) {
        this.expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    }
    next();
});

// Methods
transactionSchema.methods.markCompleted = async function () {
    this.status = 'completed';
    this.processedAt = new Date();
    return this.save();
};

transactionSchema.methods.markFailed = async function (reason) {
    this.status = 'failed';
    this.notes = reason;
    this.processedAt = new Date();
    return this.save();
};

transactionSchema.statics.getUserBalance = async function (userId, currency) {
    const result = await this.aggregate([
        {
            $match: {
                userId: mongoose.Types.ObjectId(userId),
                currency,
                status: 'completed',
            },
        },
        {
            $group: {
                _id: null,
                totalDeposits: {
                    $sum: {
                        $cond: [{ $in: ['$type', ['deposit', 'win', 'bonus', 'refund']] }, '$amount', 0],
                    },
                },
                totalWithdrawals: {
                    $sum: {
                        $cond: [{ $in: ['$type', ['withdrawal', 'bet']] }, '$amount', 0],
                    },
                },
            },
        },
    ]);

    if (result.length === 0) return 0;
    return result[0].totalDeposits - result[0].totalWithdrawals;
};

module.exports = mongoose.model('Transaction', transactionSchema);
