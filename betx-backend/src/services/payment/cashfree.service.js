const axios = require('axios');
const config = require('../../config/env');
const { logger } = require('../../utils/logger');
const crypto = require('crypto');

class CashfreeService {
    constructor() {
        this.baseURL =
            config.CASHFREE_ENV === 'production'
                ? 'https://api.cashfree.com/pg'
                : 'https://sandbox.cashfree.com/pg';

        this.headers = {
            'x-client-id': config.CASHFREE_APP_ID,
            'x-client-secret': config.CASHFREE_SECRET_KEY,
            'x-api-version': '2023-08-01',
            'Content-Type': 'application/json',
        };
    }

    /**
     * Create payment order
     */
    async createOrder(orderId, amount, customerDetails, returnUrl) {
        try {
            const payload = {
                order_id: orderId,
                order_amount: amount,
                order_currency: 'INR',
                customer_details: {
                    customer_id: customerDetails.customerId,
                    customer_email: customerDetails.email,
                    customer_phone: customerDetails.phone || '9999999999',
                    customer_name: customerDetails.name,
                },
                order_meta: {
                    return_url: returnUrl,
                    notify_url: `${config.CLIENT_URL}/api/webhooks/cashfree`,
                },
            };

            const response = await axios.post(`${this.baseURL}/orders`, payload, {
                headers: this.headers,
            });

            logger.info(`Cashfree order created: ${orderId}`);

            return {
                success: true,
                data: response.data,
            };
        } catch (error) {
            logger.error('Cashfree order creation failed:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message,
            };
        }
    }

    /**
     * Get order status
     */
    async getOrderStatus(orderId) {
        try {
            const response = await axios.get(`${this.baseURL}/orders/${orderId}`, {
                headers: this.headers,
            });

            return {
                success: true,
                data: response.data,
            };
        } catch (error) {
            logger.error('Cashfree order status fetch failed:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message,
            };
        }
    }

    /**
     * Verify webhook signature
     */
    verifyWebhookSignature(payload, signature, timestamp) {
        const signatureData = `${timestamp}${JSON.stringify(payload)}`;
        const expectedSignature = crypto
            .createHmac('sha256', config.CASHFREE_WEBHOOK_SECRET)
            .update(signatureData)
            .digest('base64');

        return signature === expectedSignature;
    }

    /**
     * Create payout (for withdrawals)
     */
    async createPayout(transferId, amount, beneficiaryDetails) {
        try {
            const payload = {
                transfer_id: transferId,
                transfer_amount: amount,
                transfer_mode: beneficiaryDetails.mode || 'upi',
                bene_details: {
                    bene_id: beneficiaryDetails.id,
                    name: beneficiaryDetails.name,
                    email: beneficiaryDetails.email,
                    phone: beneficiaryDetails.phone,
                    address1: beneficiaryDetails.address || 'India',
                    vpa: beneficiaryDetails.upiId,
                },
            };

            const response = await axios.post(`${this.baseURL}/transfers`, payload, {
                headers: this.headers,
            });

            logger.info(`Cashfree payout created: ${transferId}`);

            return {
                success: true,
                data: response.data,
            };
        } catch (error) {
            logger.error('Cashfree payout creation failed:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message,
            };
        }
    }

    /**
     * Get payout status
     */
    async getPayoutStatus(transferId) {
        try {
            const response = await axios.get(`${this.baseURL}/transfers/${transferId}`, {
                headers: this.headers,
            });

            return {
                success: true,
                data: response.data,
            };
        } catch (error) {
            logger.error('Cashfree payout status fetch failed:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message,
            };
        }
    }
}

module.exports = new CashfreeService();
