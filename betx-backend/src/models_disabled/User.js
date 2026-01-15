const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const config = require('../config/env');

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: [true, 'Username is required'],
            unique: true,
            trim: true,
            lowercase: true,
            minlength: [3, 'Username must be at least 3 characters'],
            maxlength: [20, 'Username cannot exceed 20 characters'],
            match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            trim: true,
            lowercase: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [8, 'Password must be at least 8 characters'],
            select: false,
        },
        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user',
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        profile: {
            avatar: {
                type: String,
                default: 'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
            },
            firstName: String,
            lastName: String,
            phone: String,
            dateOfBirth: Date,
        },
        security: {
            twoFactorEnabled: {
                type: Boolean,
                default: false,
            },
            twoFactorSecret: String,
            loginAttempts: {
                type: Number,
                default: 0,
            },
            lockUntil: Date,
            lastLogin: Date,
            lastLoginIP: String,
        },
        referralCode: {
            type: String,
            unique: true,
            sparse: true,
        },
        referredBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Indexes
// userSchema.index({ username: 1 });
// userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });

// Virtual for account locked status
userSchema.virtual('isLocked').get(function () {
    return !!(this.security.lockUntil && this.security.lockUntil > Date.now());
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(config.BCRYPT_ROUNDS);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw new Error('Password comparison failed');
    }
};

// Increment login attempts
userSchema.methods.incLoginAttempts = async function () {
    // Reset attempts if lock has expired
    if (this.security.lockUntil && this.security.lockUntil < Date.now()) {
        return this.updateOne({
            $set: { 'security.loginAttempts': 1 },
            $unset: { 'security.lockUntil': 1 },
        });
    }

    const updates = { $inc: { 'security.loginAttempts': 1 } };

    // Lock account after max attempts
    const needsLock = this.security.loginAttempts + 1 >= config.MAX_LOGIN_ATTEMPTS;
    if (needsLock) {
        updates.$set = {
            'security.lockUntil': Date.now() + config.LOCK_TIME * 60 * 1000,
        };
    }

    return this.updateOne(updates);
};

// Reset login attempts
userSchema.methods.resetLoginAttempts = async function () {
    return this.updateOne({
        $set: { 'security.loginAttempts': 0 },
        $unset: { 'security.lockUntil': 1 },
    });
};

// Generate referral code
userSchema.methods.generateReferralCode = function () {
    return `${this.username.toUpperCase()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
};

module.exports = mongoose.model('User', userSchema);
