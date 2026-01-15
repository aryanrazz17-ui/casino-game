const axios = require('axios');
const config = require('../../config/env');
const { logger } = require('../../utils/logger');

class TatumService {
    constructor() {
        this.baseURL = config.TATUM_TESTNET
            ? 'https://api.tatum.io/v3'
            : 'https://api.tatum.io/v3';

        this.headers = {
            'x-api-key': config.TATUM_API_KEY,
            'Content-Type': 'application/json',
        };
    }

    /**
     * Generate wallet for cryptocurrency
     */
    async generateWallet(currency) {
        try {
            let endpoint = '';

            switch (currency) {
                case 'BTC':
                    endpoint = '/bitcoin/wallet';
                    break;
                case 'ETH':
                    endpoint = '/ethereum/wallet';
                    break;
                case 'TRON':
                    endpoint = '/tron/wallet';
                    break;
                default:
                    throw new Error('Unsupported currency');
            }

            const response = await axios.get(`${this.baseURL}${endpoint}`, {
                headers: this.headers,
            });

            logger.info(`Tatum wallet generated: ${currency}`);

            return {
                success: true,
                data: response.data,
            };
        } catch (error) {
            logger.error('Tatum wallet generation failed:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message,
            };
        }
    }

    /**
     * Generate deposit address
     */
    async generateAddress(currency, xpub, index = 0) {
        try {
            let endpoint = '';

            switch (currency) {
                case 'BTC':
                    endpoint = `/bitcoin/address/${xpub}/${index}`;
                    break;
                case 'ETH':
                    endpoint = `/ethereum/address/${xpub}/${index}`;
                    break;
                case 'TRON':
                    endpoint = `/tron/address/${xpub}/${index}`;
                    break;
                default:
                    throw new Error('Unsupported currency');
            }

            const response = await axios.get(`${this.baseURL}${endpoint}`, {
                headers: this.headers,
            });

            logger.info(`Tatum address generated: ${currency}`);

            return {
                success: true,
                data: response.data,
            };
        } catch (error) {
            logger.error('Tatum address generation failed:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message,
            };
        }
    }

    /**
     * Get wallet balance
     */
    async getBalance(currency, address) {
        try {
            let endpoint = '';

            switch (currency) {
                case 'BTC':
                    endpoint = `/bitcoin/address/balance/${address}`;
                    break;
                case 'ETH':
                    endpoint = `/ethereum/account/balance/${address}`;
                    break;
                case 'TRON':
                    endpoint = `/tron/account/${address}`;
                    break;
                default:
                    throw new Error('Unsupported currency');
            }

            const response = await axios.get(`${this.baseURL}${endpoint}`, {
                headers: this.headers,
            });

            return {
                success: true,
                data: response.data,
            };
        } catch (error) {
            logger.error('Tatum balance fetch failed:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message,
            };
        }
    }

    /**
     * Send transaction
     */
    async sendTransaction(currency, fromPrivateKey, toAddress, amount) {
        try {
            let endpoint = '';
            let payload = {};

            switch (currency) {
                case 'BTC':
                    endpoint = '/bitcoin/transaction';
                    payload = {
                        fromUTXO: [], // Need to fetch UTXOs first
                        to: [{ address: toAddress, value: amount }],
                        fromPrivateKey,
                    };
                    break;
                case 'ETH':
                    endpoint = '/ethereum/transaction';
                    payload = {
                        to: toAddress,
                        amount: amount.toString(),
                        currency: 'ETH',
                        fromPrivateKey,
                    };
                    break;
                case 'TRON':
                    endpoint = '/tron/transaction';
                    payload = {
                        to: toAddress,
                        amount: amount.toString(),
                        fromPrivateKey,
                    };
                    break;
                default:
                    throw new Error('Unsupported currency');
            }

            const response = await axios.post(`${this.baseURL}${endpoint}`, payload, {
                headers: this.headers,
            });

            logger.info(`Tatum transaction sent: ${currency} - ${amount}`);

            return {
                success: true,
                data: response.data,
            };
        } catch (error) {
            logger.error('Tatum transaction failed:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message,
            };
        }
    }

    /**
     * Get transaction by hash
     */
    async getTransaction(currency, txHash) {
        try {
            let endpoint = '';

            switch (currency) {
                case 'BTC':
                    endpoint = `/bitcoin/transaction/${txHash}`;
                    break;
                case 'ETH':
                    endpoint = `/ethereum/transaction/${txHash}`;
                    break;
                case 'TRON':
                    endpoint = `/tron/transaction/${txHash}`;
                    break;
                default:
                    throw new Error('Unsupported currency');
            }

            const response = await axios.get(`${this.baseURL}${endpoint}`, {
                headers: this.headers,
            });

            return {
                success: true,
                data: response.data,
            };
        } catch (error) {
            logger.error('Tatum transaction fetch failed:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message,
            };
        }
    }
}

module.exports = new TatumService();
