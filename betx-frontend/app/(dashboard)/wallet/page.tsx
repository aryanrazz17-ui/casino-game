'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useWallet } from '@/hooks/useWallet'
import api from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { Wallet, ArrowDownCircle, ArrowUpCircle, History, Bitcoin, Banknote } from 'lucide-react'
import DepositForm from '@/components/wallet/DepositForm'
import toast from 'react-hot-toast'

export default function WalletPage() {
    const { wallets, selectedCurrency, selectCurrency } = useWallet()
    const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'history'>('deposit')

    const [withdrawAmount, setWithdrawAmount] = useState('')
    const [withdrawDetails, setWithdrawDetails] = useState('')
    const [isWithdrawing, setIsWithdrawing] = useState(false)

    const handleWithdraw = async () => {
        if (!withdrawAmount || Number(withdrawAmount) <= 0) {
            toast.error('Please enter a valid amount')
            return
        }
        if (!withdrawDetails) {
            toast.error('Please enter withdrawal details')
            return
        }

        try {
            setIsWithdrawing(true)
            await api.post('/wallet/withdraw', {
                amount: Number(withdrawAmount),
                currency: selectedCurrency,
                method: selectedCurrency === 'INR' ? 'upi' : 'crypto',
                details: withdrawDetails
            })

            toast.success("Withdrawal request submitted for approval!")
            setWithdrawAmount('')
            setWithdrawDetails('')
            // Refresh balance
            window.location.reload()
        } catch (error: any) {
            console.error('Withdrawal error:', error)
            toast.error(error.response?.data?.message || 'Withdrawal failed')
        } finally {
            setIsWithdrawing(false)
        }
    }

    const currencies = ['INR', 'BTC', 'ETH', 'TRON', 'USDT'] as const

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-bold mb-2">💰 Wallet</h1>
                <p className="text-gray-400">Manage your funds</p>
            </div>

            {/* Currency Selector */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {currencies.map((currency) => (
                    <button
                        key={currency}
                        onClick={() => selectCurrency(currency)}
                        className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${selectedCurrency === currency
                            ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20'
                            : 'glass hover:bg-white/10 text-gray-400 hover:text-white'
                            }`}
                    >
                        {currency}
                    </button>
                ))}
            </div>

            {/* Balance Cards */}
            <div className="grid md:grid-cols-4 gap-4">
                {wallets.map((wallet) => (
                    <Card key={wallet.currency} className="border-zinc-800 bg-zinc-900/50">
                        <div className="flex items-center gap-3 mb-2">
                            {wallet.currency === 'INR' ? (
                                <Wallet className="w-6 h-6 text-primary-400" />
                            ) : (
                                <Bitcoin className="w-6 h-6 text-yellow-400" />
                            )}
                            <span className="font-semibold">{wallet.currency}</span>
                        </div>
                        <p className="text-2xl font-bold">{formatCurrency(wallet.balance, wallet.currency)}</p>
                        <p className="text-sm text-gray-400 mt-1">
                            Available: {formatCurrency(wallet.availableBalance, wallet.currency)}
                        </p>
                    </Card>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-dark-200 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('deposit')}
                    className={`px-4 py-2 font-semibold whitespace-nowrap transition-colors ${activeTab === 'deposit'
                        ? 'border-b-2 border-primary-500 text-primary-400'
                        : 'text-gray-400 hover:text-white'
                        }`}
                >
                    <ArrowDownCircle className="w-5 h-5 inline mr-2" />
                    Deposit
                </button>
                <button
                    onClick={() => setActiveTab('withdraw')}
                    className={`px-4 py-2 font-semibold whitespace-nowrap transition-colors ${activeTab === 'withdraw'
                        ? 'border-b-2 border-primary-500 text-primary-400'
                        : 'text-gray-400 hover:text-white'
                        }`}
                >
                    <ArrowUpCircle className="w-5 h-5 inline mr-2" />
                    Withdraw
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2 font-semibold whitespace-nowrap transition-colors ${activeTab === 'history'
                        ? 'border-b-2 border-primary-500 text-primary-400'
                        : 'text-gray-400 hover:text-white'
                        }`}
                >
                    <History className="w-5 h-5 inline mr-2" />
                    History
                </button>
            </div>

            {/* Tab Content */}
            <Card className="min-h-[400px] border-zinc-800 bg-zinc-900/30">
                {activeTab === 'deposit' && (
                    <div className="py-6">
                        <div className="text-center mb-8">
                            <h3 className="text-2xl font-bold mb-2">Deposit {selectedCurrency}</h3>
                            <p className="text-gray-400">Add funds to your wallet securely</p>
                        </div>
                        <DepositForm />
                    </div>
                )}

                {activeTab === 'withdraw' && (
                    <div className="py-8 max-w-lg mx-auto">
                        <div className="text-center mb-8">
                            <ArrowUpCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
                            <h3 className="text-2xl font-bold mb-2">Withdraw Funds</h3>
                            <p className="text-gray-400">Withdraw from your {selectedCurrency} wallet</p>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-zinc-800/40 p-4 rounded-xl border border-zinc-800">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm text-gray-400">Available Balance</span>
                                    <span className="text-sm font-bold text-white">
                                        {formatCurrency(wallets.find(w => w.currency === selectedCurrency)?.availableBalance || 0, selectedCurrency)}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Withdrawal Amount</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={withdrawAmount}
                                        onChange={(e) => setWithdrawAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl py-4 px-4 text-white focus:outline-none focus:border-primary-500"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                {selectedCurrency === 'INR' && (
                                    <div className="flex gap-2 p-1 bg-zinc-900/50 rounded-lg border border-zinc-800">
                                        <button
                                            onClick={() => {
                                                setWithdrawDetails('')
                                                // We can use a local state for method type if needed, but for now we'll just handle it in the UI
                                            }}
                                            className="flex-1 py-1.5 text-xs font-bold rounded-md transition-all bg-primary-600 text-white shadow-lg"
                                        >
                                            UPI / BANK
                                        </button>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400">
                                        {selectedCurrency === 'INR' ? 'Payment Details' : `${selectedCurrency} Address`}
                                    </label>
                                    <textarea
                                        value={withdrawDetails}
                                        onChange={(e) => setWithdrawDetails(e.target.value)}
                                        placeholder={selectedCurrency === 'INR'
                                            ? 'Enter UPI ID OR Bank Details (Name, Acc No, IFSC, Bank Name)'
                                            : `Enter your ${selectedCurrency} address`
                                        }
                                        rows={3}
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl py-4 px-4 text-white focus:outline-none focus:border-primary-500 resize-none"
                                    />
                                    {selectedCurrency === 'INR' && (
                                        <p className="text-[10px] text-gray-500 italic">
                                            For Bank: Provide Name, Account Number, IFSC, and Bank Name clearly.
                                        </p>
                                    )}
                                </div>
                            </div>

                            <Button
                                className="w-full py-4 text-lg font-bold bg-zinc-800 hover:bg-zinc-700 border border-zinc-700"
                                onClick={handleWithdraw}
                                disabled={isWithdrawing}
                            >
                                {isWithdrawing ? 'Processing...' : 'Submit Withdrawal'}
                            </Button>

                            <p className="text-center text-xs text-gray-500 italic">
                                * Withdrawals are manually reviewed by admin and may take up to 24 hours.
                            </p>
                        </div>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="text-center py-12">
                        <History className="w-16 h-16 mx-auto mb-4 text-blue-400" />
                        <h3 className="text-2xl font-bold mb-2">Transaction History</h3>
                        <p className="text-gray-400">No transactions yet</p>
                    </div>
                )}
            </Card>
        </div>
    )
}
