const mongoose = require('mongoose');

const adminQRSchema = new mongoose.Schema(
    {
        currency: {
            type: String,
            enum: ['INR', 'BTC', 'ETH', 'TRON'],
            required: true,
        },
        paymentMethod: {
            type: String,
            enum: ['upi', 'bank', 'crypto'],
            required: true,
        },
        qrCode: {
            type: String,
            required: true,
        },
        upiId: {
            type: String,
            sparse: true,
        },
        accountDetails: {
            accountNumber: String,
            ifscCode: String,
            accountHolderName: String,
            bankName: String,
        },
        cryptoAddress: {
            type: String,
            sparse: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        minAmount: {
            type: mongoose.Schema.Types.Decimal128,
            default: 100,
            get: (v) => parseFloat(v.toString()),
        },
        maxAmount: {
            type: mongoose.Schema.Types.Decimal128,
            default: 100000,
            get: (v) => parseFloat(v.toString()),
        },
        dailyLimit: {
            type: mongoose.Schema.Types.Decimal128,
            default: 500000,
            get: (v) => parseFloat(v.toString()),
        },
        usageCount: {
            type: Number,
            default: 0,
        },
        lastUsedAt: Date,
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    {
        timestamps: true,
        toJSON: { getters: true },
        toObject: { getters: true },
    }
);

// Indexes
adminQRSchema.index({ currency: 1, paymentMethod: 1, isActive: 1 });

module.exports = mongoose.model('AdminQR', adminQRSchema);
