'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useWallet } from '@/hooks/useWallet'
import { formatCurrency } from '@/lib/utils'
import { Wallet, ArrowDownCircle, ArrowUpCircle, History, Bitcoin, Banknote } from 'lucide-react'
import DepositForm from '@/components/wallet/DepositForm'

export default function WalletPage() {
    const { wallets, selectedCurrency, selectCurrency } = useWallet()
    const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'history'>('deposit')

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
                    <div className="text-center py-12">
                        <ArrowUpCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
                        <h3 className="text-2xl font-bold mb-2">Withdraw Funds</h3>
                        <p className="text-gray-400 mb-6">Withdraw from your {selectedCurrency} wallet</p>
                        <Button variant="secondary">Coming Soon</Button>
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
