'use client'

import { useState, useEffect } from 'react'
import { useWalletStore } from '@/store/walletStore'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Copy, RefreshCw, CheckCircle, AlertCircle, ArrowRight, Wallet } from 'lucide-react'
import toast from 'react-hot-toast'
import Image from 'next/image'
import { Card } from '@/components/ui/Card'

export default function DepositForm() {
    const { selectedCurrency, selectCurrency, wallets } = useWalletStore()
    const [amount, setAmount] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [depositData, setDepositData] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)

    const currencies = ['INR', 'BTC', 'ETH', 'TRON', 'USDT'] as const

    // Clear data when currency changes
    useEffect(() => {
        setDepositData(null)
        setAmount('')
        setError(null)
    }, [selectedCurrency])

    const handleGenerateDeposit = async () => {
        if (selectedCurrency === 'INR' && (!amount || Number(amount) <= 0)) {
            toast.error('Please enter a valid amount')
            return
        }

        try {
            setIsLoading(true)
            setError(null)

            // For crypto, we might just fetch the address if not present,
            // or create a new transaction intent.
            // Following requirements to call /wallet/deposit
            const response = await api.post('/wallet/deposit', {
                currency: selectedCurrency,
                amount: selectedCurrency === 'INR' ? Number(amount) : undefined
            })

            // Assuming response.data.data contains { address, qrCode, paymentUrl, ... }
            setDepositData(response.data.data)
            toast.success(selectedCurrency === 'INR' ? 'Payment link generated' : 'Deposit address generated')

        } catch (error: any) {
            console.error('Deposit error:', error)
            const msg = error.response?.data?.message || 'Failed to initiate deposit'
            setError(msg)
            toast.error(msg)
        } finally {
            setIsLoading(false)
        }
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        toast.success('Copied to clipboard!')
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            {/* Currency Selection - redundant if parent has it, but requested in requirements */}
            <div className="space-y-4">
                <label className="text-sm text-gray-400 font-medium">Select Currency</label>
                <div className="flex flex-wrap gap-2">
                    {currencies.map((currency) => (
                        <button
                            key={currency}
                            onClick={() => selectCurrency(currency)}
                            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${selectedCurrency === currency
                                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/20'
                                    : 'bg-zinc-900 text-gray-400 hover:bg-zinc-800'
                                }`}
                        >
                            {/* Icons could be added here */}
                            {currency}
                        </button>
                    ))}
                </div>
            </div>

            {/* Amount Input (Only for INR usually, but maybe for crypto tracking too?) */}
            {selectedCurrency === 'INR' && (
                <div className="space-y-2">
                    <label className="text-sm text-gray-400 font-medium">Deposit Amount (INR)</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Enter amount (e.g. 500)"
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl py-3 pl-8 pr-4 text-white focus:outline-none focus:border-primary-500 transition-colors"
                        />
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-center gap-3">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                </div>
            )}

            {/* Generate Button */}
            {!depositData && (
                <Button
                    onClick={handleGenerateDeposit}
                    disabled={isLoading}
                    className="w-full py-4 text-lg font-bold bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 shadow-xl"
                >
                    {isLoading ? (
                        <span className="flex items-center gap-2">
                            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                            Processing...
                        </span>
                    ) : (
                        <span className="flex items-center justify-center gap-2">
                            {selectedCurrency === 'INR' ? 'Proceed to Pay' : 'Generate Address'}
                            <ArrowRight size={20} />
                        </span>
                    )}
                </Button>
            )}

            {/* Deposit Info / QR Code */}
            {depositData && (
                <Card className="bg-zinc-900/50 border-zinc-800 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <CheckCircle className="text-green-500" size={24} />
                                Deposit Details
                            </h3>
                            <button
                                onClick={() => setDepositData(null)}
                                className="text-sm text-gray-500 hover:text-white flex items-center gap-1"
                            >
                                <RefreshCw size={14} /> New Deposit
                            </button>
                        </div>

                        {selectedCurrency === 'INR' ? (
                            <div className="text-center space-y-4">
                                <p className="text-gray-400">Scan QR or use UPI ID to pay</p>
                                {/* Accessing qrCode and vpa from response data */}
                                {depositData.qrCode && (
                                    <div className="bg-white p-4 rounded-xl inline-block">
                                        {/* Fallback if backend sends raw base64 or URL */}
                                        <img
                                            src={depositData.qrCode}
                                            alt="Payment QR"
                                            className="w-48 h-48 object-contain"
                                        />
                                    </div>
                                )}
                                {depositData.paymentUrl && (
                                    <div className="mt-4">
                                        <a
                                            href={depositData.paymentUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-block px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg text-white font-bold transition-colors"
                                        >
                                            Pay Now
                                        </a>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center space-y-6">
                                <p className="text-gray-400 text-center text-sm">
                                    Send only <strong className="text-primary-400">{selectedCurrency}</strong> to this address.
                                    Sending any other coin may result in permanent loss.
                                </p>

                                {/* Crypto QR */}
                                <div className="bg-white p-4 rounded-xl">
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${depositData.address}`}
                                        alt="Wallet Address QR"
                                        width={200}
                                        height={200}
                                    />
                                </div>

                                {/* Address Display */}
                                <div className="w-full space-y-2">
                                    <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">Deposit Address</label>
                                    <div className="flex items-center gap-2 bg-black/40 border border-zinc-800 p-3 rounded-lg group hover:border-zinc-700 transition-colors">
                                        <code className="flex-1 text-sm font-mono text-zinc-300 break-all">
                                            {depositData.address}
                                        </code>
                                        <button
                                            onClick={() => copyToClipboard(depositData.address)}
                                            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                                            title="Copy Address"
                                        >
                                            <Copy size={18} />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex w-full gap-4 text-sm text-gray-500 bg-zinc-900/50 p-4 rounded-lg">
                                    <div className="flex-1 text-center border-r border-zinc-800">
                                        <p className="mb-1">Minimum Deposit</p>
                                        <p className="font-bold text-white">0.001 {selectedCurrency}</p>
                                    </div>
                                    <div className="flex-1 text-center">
                                        <p className="mb-1">Expected Time</p>
                                        <p className="font-bold text-white">~3 Confirmations</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
            )}
        </div>
    )
}
