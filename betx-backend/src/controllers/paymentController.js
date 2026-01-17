const supabase = require('../config/supabase');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');

/**
 * @desc    Get All Active Payment Methods (UPI/QR)
 * @route   GET /api/payment/methods
 * @access  Private
 */
exports.getActivePaymentMethods = asyncHandler(async (req, res, next) => {
    const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    if (error) {
        logger.error('Error fetching payment methods:', error);
        throw new AppError(error.message, 500);
    }

    res.status(200).json({
        success: true,
        data
    });
});
