const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        currency: {
            type: String,
            enum: ['INR', 'BTC', 'ETH', 'TRON'],
            required: true,
        },
        balance: {
            type: mongoose.Schema.Types.Decimal128,
            default: 0,
            get: (v) => parseFloat(v.toString()),
        },
        lockedBalance: {
            type: mongoose.Schema.Types.Decimal128,
            default: 0,
            get: (v) => parseFloat(v.toString()),
        },
        cryptoAddress: {
            type: String,
            sparse: true,
        },
        cryptoWalletId: {
            type: String,
            sparse: true,
        },
        cryptoMnemonic: {
            type: String,
            select: false,
        },
        cryptoPrivateKey: {
            type: String,
            select: false,
        },
    },
    {
        timestamps: true,
        toJSON: { getters: true },
        toObject: { getters: true },
    }
);

// Indexes
walletSchema.index({ userId: 1, currency: 1 }, { unique: true });
// walletSchema.index({ cryptoAddress: 1 }, { sparse: true });

// Virtual for available balance
walletSchema.virtual('availableBalance').get(function () {
    return this.balance - this.lockedBalance;
});

// Methods
walletSchema.methods.hasBalance = function (amount) {
    return this.availableBalance >= amount;
};

walletSchema.methods.lockFunds = async function (amount) {
    if (!this.hasBalance(amount)) {
        throw new Error('Insufficient balance');
    }

    this.lockedBalance = parseFloat(this.lockedBalance) + amount;
    return this.save();
};

walletSchema.methods.unlockFunds = async function (amount) {
    this.lockedBalance = Math.max(0, parseFloat(this.lockedBalance) - amount);
    return this.save();
};

walletSchema.methods.addBalance = async function (amount) {
    this.balance = parseFloat(this.balance) + amount;
    return this.save();
};

walletSchema.methods.deductBalance = async function (amount) {
    if (!this.hasBalance(amount)) {
        throw new Error('Insufficient balance');
    }

    this.balance = parseFloat(this.balance) - amount;
    return this.save();
};

module.exports = mongoose.model('Wallet', walletSchema);
