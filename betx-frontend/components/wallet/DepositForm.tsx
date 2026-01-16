'use client'

import { useState, useEffect } from 'react'
import { useWalletStore } from '@/store/walletStore'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Copy, RefreshCw, CheckCircle, AlertCircle, ArrowRight, Wallet, IndianRupee } from 'lucide-react'
import toast from 'react-hot-toast'
import { Card } from '@/components/ui/Card'

export default function DepositForm() {
    const { selectedCurrency, selectCurrency } = useWalletStore()
    const [amount, setAmount] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [depositData, setDepositData] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)

    // Manual Payment State
    const [activeMethods, setActiveMethods] = useState<any[]>([])
    const [selectedMethod, setSelectedMethod] = useState<any>(null)
    const [utr, setUtr] = useState('')
    const [submittingUtr, setSubmittingUtr] = useState(false)

    const currencies = ['INR', 'BTC', 'ETH', 'TRON', 'USDT'] as const

    // Clear data when currency changes
    useEffect(() => {
        setDepositData(null)
        setAmount('')
        setError(null)
        setSelectedMethod(null)
        setUtr('')

        if (selectedCurrency === 'INR') {
            fetchMethods()
        }
    }, [selectedCurrency])

    const fetchMethods = async () => {
        try {
            const response = await api.get('/payment/methods')
            setActiveMethods(response.data.data)
        } catch (error) {
            console.error('Failed to fetch payment methods', error)
        }
    }

    const handleGenerateDeposit = async () => {
        if (selectedCurrency === 'INR' && (!amount || Number(amount) <= 0)) {
            toast.error('Please enter a valid amount')
            return
        }

        try {
            setIsLoading(true)
            setError(null)

            if (selectedCurrency === 'INR') {
                // Razorpay Flow
                const response = await api.post('/payment/razorpay/order', {
                    amount: Number(amount),
                    currency: 'INR'
                })

                const { order_id, key_id, amount: rzpAmount, currency: rzpCurrency, transaction_id } = response.data.data

                const options = {
                    key: key_id,
                    amount: rzpAmount,
                    currency: rzpCurrency,
                    name: "BetX Casino",
                    description: "Wallet Deposit",
                    order_id: order_id,
                    handler: async function (response: any) {
                        try {
                            const verifyRes = await api.post('/payment/razorpay/verify', {
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                transaction_id: transaction_id
                            })

                            if (verifyRes.data.success) {
                                toast.success("Payment Successful!")
                                window.location.reload()
                            }
                        } catch (error: any) {
                            toast.error(error.response?.data?.message || 'Verification failed')
                        }
                    },
                    prefill: {
                        name: "User",
                        email: "user@example.com",
                    },
                    theme: { color: "#6366f1" },
                    modal: { ondismiss: () => setIsLoading(false) }
                }

                const rzp1 = new (window as any).Razorpay(options)
                rzp1.open()
            } else {
                // Crypto Flow
                const response = await api.post('/wallet/deposit/initiate', {
                    currency: selectedCurrency,
                    paymentMethod: 'crypto'
                })
                setDepositData(response.data.data)
                toast.success('Deposit address generated')
            }

        } catch (error: any) {
            const msg = error.response?.data?.message || 'Failed to initiate deposit'
            setError(msg)
            toast.error(msg)
        } finally {
            setIsLoading(false)
        }
    }

    const handleManualSubmit = async () => {
        if (!amount || !utr) return toast.error('Please enter amount and UTR');
        try {
            setSubmittingUtr(true)
            await api.post('/wallet/deposit/manual', {
                amount: Number(amount),
                currency: 'INR',
                paymentMethod: selectedMethod.name,
                utr: utr
            })
            toast.success('Deposit request submitted!')
            setDepositData({ success: true, manual: true })
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Submission failed')
        } finally {
            setSubmittingUtr(false)
        }
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        toast.success('Copied!')
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            {/* Currency Selection */}
            <div className="space-y-4">
                <label className="text-sm text-gray-400 font-medium">Select Currency</label>
                <div className="flex flex-wrap gap-2">
                    {currencies.map((currency) => (
                        <button
                            key={currency}
                            onClick={() => selectCurrency(currency)}
                            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${selectedCurrency === currency
                                ? 'bg-primary-600 text-white'
                                : 'bg-zinc-900 text-gray-400 hover:bg-zinc-800'
                                }`}
                        >
                            {currency}
                        </button>
                    ))}
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-center gap-3">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                </div>
            )}

            {/* Main Content Area */}
            {!depositData ? (
                <div className="space-y-8">
                    {selectedCurrency === 'INR' && activeMethods.length > 0 && (
                        <div className="space-y-4">
                            <label className="text-sm text-gray-400 font-medium tracking-wide uppercase text-[10px]">Fast UPI Transfer (Manual Verification)</label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {activeMethods.map((method) => (
                                    <button
                                        key={method.id}
                                        onClick={() => setSelectedMethod(method)}
                                        className={`p-4 rounded-xl border transition-all text-center space-y-2 ${selectedMethod?.id === method.id
                                            ? 'bg-primary-600/10 border-primary-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.1)]'
                                            : 'bg-zinc-900/50 border-zinc-800 text-gray-400 hover:border-zinc-700'
                                            }`}
                                    >
                                        <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center mx-auto transition-colors">
                                            <IndianRupee size={20} className={selectedMethod?.id === method.id ? 'text-primary-400' : 'text-gray-500'} />
                                        </div>
                                        <p className="text-sm font-bold">{method.name}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {selectedCurrency === 'INR' && selectedMethod ? (
                        <div className="glass p-6 rounded-2xl border border-primary-500/20 space-y-6 animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex flex-col items-center text-center space-y-4">
                                <div className="bg-white p-3 rounded-xl shadow-2xl">
                                    <img src={selectedMethod.qr_image_url} alt="QR Code" className="w-48 h-48 object-contain" />
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm mb-1">Scan QR or Pay to UPI ID</p>
                                    <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-lg border border-white/5">
                                        <code className="text-primary-400 font-bold">{selectedMethod.upi_id}</code>
                                        <button onClick={() => copyToClipboard(selectedMethod.upi_id)} className="text-gray-500 hover:text-white">
                                            <Copy size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-white/5">
                                <div className="space-y-2">
                                    <label className="text-sm text-gray-400 font-medium">1. Deposit Amount</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                                        <input
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            placeholder="Enter amount"
                                            className="w-full bg-black/20 border border-zinc-800 rounded-xl py-3 pl-8 pr-4 text-white focus:outline-none focus:border-primary-500"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm text-gray-400 font-medium">2. Transaction ID / UTR</label>
                                    <input
                                        type="text"
                                        value={utr}
                                        onChange={(e) => setUtr(e.target.value)}
                                        placeholder="12-digit UTR number"
                                        className="w-full bg-black/20 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary-500"
                                    />
                                </div>

                                <Button
                                    onClick={handleManualSubmit}
                                    disabled={submittingUtr}
                                    className="w-full py-4 bg-primary-600 hover:bg-primary-700"
                                >
                                    {submittingUtr ? 'Submitting...' : 'Confirm Deposit'}
                                </Button>

                                <button
                                    onClick={() => setSelectedMethod(null)}
                                    className="w-full text-xs text-gray-500 hover:text-white transition-colors"
                                >
                                    Cancel and try another method
                                </button>
                            </div>

                            <div className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-xl space-y-2 text-xs">
                                <p className="text-yellow-500 font-bold flex items-center gap-1"><AlertCircle size={14} /> WARNING</p>
                                <p className="text-gray-500 leading-relaxed">
                                    After payment, you must enter the 12-digit UTR number. Incorrect UTR will lead to rejected deposits. Verification takes 15-30 mins.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {selectedCurrency === 'INR' && (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-sm text-gray-400 font-medium">Deposit Amount (INR)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                                            <input
                                                type="number"
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                                placeholder="Enter amount"
                                                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl py-3 pl-8 pr-4 text-white focus:outline-none focus:border-primary-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="relative py-4">
                                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/5"></span></div>
                                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#0a0a0f] px-2 text-gray-500">Insta-Deposit Gateway</span></div>
                                    </div>
                                </>
                            )}

                            <Button
                                onClick={handleGenerateDeposit}
                                disabled={isLoading}
                                className="w-full py-4 text-lg font-bold bg-gradient-to-r from-primary-600 to-purple-600 shadow-xl"
                            >
                                {isLoading ? 'Processing...' : selectedCurrency === 'INR' ? 'Pay with Razorpay' : 'Generate Address'}
                                {!isLoading && <ArrowRight className="ml-2" size={20} />}
                            </Button>
                        </div>
                    )}
                </div>
            ) : (
                /* Success or Deposit Data View */
                <Card className="bg-zinc-900/50 border-zinc-800 p-8 text-center animate-in zoom-in duration-300">
                    {depositData.success ? (
                        <div className="space-y-6">
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle className="text-green-500" size={32} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold">Request Submitted</h3>
                                <p className="text-gray-400 mt-2">Your deposit of ₹{amount} is being verified.</p>
                            </div>
                            <Button onClick={() => window.location.reload()} className="bg-white/5 hover:bg-white/10 px-8">
                                Back to Wallet
                            </Button>
                        </div>
                    ) : (
                        /* Crypto Deposit Info */
                        <div className="space-y-6 text-left">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold">Deposit {selectedCurrency}</h3>
                                <button onClick={() => setDepositData(null)} className="text-xs text-gray-500 hover:text-white">New Deposit</button>
                            </div>
                            <div className="flex flex-col items-center gap-6">
                                <div className="bg-white p-4 rounded-xl">
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${depositData.address}`}
                                        alt="QR"
                                        className="w-40 h-40"
                                    />
                                </div>
                                <div className="w-full space-y-2">
                                    <label className="text-[10px] text-gray-500 uppercase font-black">Address</label>
                                    <div className="flex items-center gap-2 bg-black/40 p-3 rounded-lg border border-white/5">
                                        <code className="flex-1 text-sm font-mono break-all text-primary-300">{depositData.address}</code>
                                        <button onClick={() => copyToClipboard(depositData.address)} className="text-gray-500 hover:text-white"><Copy size={16} /></button>
                                    </div>
                                </div>
                                <p className="text-xs text-center text-gray-500">Wait for ~3 network confirmations. Balance will update automatically.</p>
                            </div>
                        </div>
                    )}
                </Card>
            )}
        </div>
    )
}
