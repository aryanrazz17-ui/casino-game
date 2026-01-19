const HiloMService = require('../../services/game/hilo-m.service');
const WalletService = require('../../services/wallet.service');
const { logger } = require('../../utils/logger');
const { emitWalletUpdate, emitHistoryUpdate } = require('../../utils/socketUtils');

module.exports = (hiloM) => {
    // Initialize the service with the namespace
    HiloMService.init(hiloM);

    hiloM.on('connection', (socket) => {
        const user = socket.user;
        if (!user || !user.id) return;

        socket.on('fetch', () => {
            socket.emit('game', HiloMService.getGameState());
        });

        socket.on('place-bet', async (payload) => {
            try {
                const { amount, currency = 'INR', betType } = payload;

                const balance = await WalletService.getBalance(user.id, currency);
                if (balance < amount) {
                    return socket.emit('place-bet', { status: false, message: 'Insufficient balance' });
                }

                // Deduct balance
                const updatedWallet = await WalletService.deduct(user.id, amount, currency, {
                    gameType: 'hilo-multiplier',
                    type: 'bet'
                });

                const success = HiloMService.addBet(user.id, {
                    amount,
                    currency,
                    betType
                });

                if (success) {
                    socket.emit('place-bet', { status: true, betType });
                    hiloM.emit('bet', { userId: user.username, amount, status: 'BET' });

                    emitWalletUpdate(hiloM, user.id, {
                        currency,
                        newBalance: updatedWallet.balance,
                        type: 'bet',
                        amount
                    });
                    emitHistoryUpdate(hiloM, user.id);
                } else {
                    // Refund if betting closed
                    await WalletService.credit(user.id, amount, currency, {
                        gameType: 'hilo-multiplier',
                        type: 'refund'
                    });
                    socket.emit('place-bet', { status: false, message: 'Betting is closed' });
                }

            } catch (error) {
                socket.emit('place-bet', { status: false, message: error.message });
            }
        });

        socket.on('disconnect', () => {
            // No specific cleanup needed for multiplayer
        });
    });
};
