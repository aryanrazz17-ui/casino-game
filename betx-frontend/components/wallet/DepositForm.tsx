'use client'

import { useState, useEffect } from 'react'
import { useWalletStore } from '@/store/walletStore'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Copy, RefreshCw, CheckCircle, AlertCircle, ArrowRight, Wallet, IndianRupee, QrCode } from 'lucide-react'
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

    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    const currencies = ['INR', 'BTC', 'ETH', 'TRON', 'USDT'] as const

    // Clear data when currency changes
    useEffect(() => {
        setDepositData(null)
        setAmount('')
        setError(null)
        setSelectedMethod(null)
        setUtr('')
        setSelectedFile(null)
        setPreviewUrl(null)

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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error('File too large (max 5MB)')
                return
            }
            setSelectedFile(file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleGenerateDeposit = async () => {
        if (selectedCurrency === 'INR') {
            // INR now only used manual UPI
            return;
        }

        try {
            setIsLoading(true)
            setError(null)

            // Crypto Flow
            const response = await api.post('/wallet/deposit/initiate', {
                currency: selectedCurrency,
                paymentMethod: 'crypto'
            })
            setDepositData(response.data.data)
            toast.success('Deposit address generated')

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
        if (!selectedFile) return toast.error('Please upload payment screenshot');
        if (Number(amount) < 100) return toast.error('Minimum deposit is ₹100');

        try {
            setSubmittingUtr(true)
            const formData = new FormData()
            formData.append('amount', amount)
            formData.append('currency', 'INR')
            formData.append('paymentMethod', selectedMethod.name)
            formData.append('utr', utr)
            formData.append('screenshot', selectedFile)

            await api.post('/wallet/deposit/manual', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
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
                <label className="text-sm text-gray-400 font-medium tracking-wide uppercase text-[11px]">Select Currency</label>
                <div className="flex flex-wrap gap-2">
                    {currencies.map((currency) => (
                        <button
                            key={currency}
                            onClick={() => selectCurrency(currency)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${selectedCurrency === currency
                                ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
                                : 'bg-zinc-900/50 text-gray-400 hover:bg-zinc-800 border border-white/5'
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
                    {selectedCurrency === 'INR' && (
                        <div className="space-y-6">
                            {activeMethods.length > 0 ? (
                                <>
                                    <div className="space-y-4">
                                        <label className="text-sm text-gray-400 font-medium tracking-wide uppercase text-[10px]">Step 1: Select Payment Method</label>
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

                                    {selectedMethod && (
                                        <div className="glass p-6 rounded-2xl border border-primary-500/20 space-y-6 animate-in fade-in slide-in-from-bottom-2">
                                            <div className="flex flex-col items-center text-center space-y-4">
                                                <div className="bg-white p-3 rounded-xl shadow-2xl">
                                                    {selectedMethod.qr_image_url ? (
                                                        <img src={selectedMethod.qr_image_url} alt="QR Code" className="w-48 h-48 object-contain" />
                                                    ) : (
                                                        <div className="w-48 h-48 flex items-center justify-center bg-gray-100 rounded-lg">
                                                            <QrCode size={48} className="text-gray-300" />
                                                        </div>
                                                    )}
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
                                                            placeholder="Minimum ₹100"
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
                                                        placeholder="Enter 12-digit UTR number"
                                                        className="w-full bg-black/20 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary-500"
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-sm text-gray-400 font-medium">3. Upload Proof (Screenshot)</label>
                                                    <div className="relative group">
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={handleFileChange}
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                        />
                                                        <div className={`p-8 border-2 border-dashed rounded-xl transition-all flex flex-col items-center gap-2 ${previewUrl ? 'border-primary-500/50 bg-primary-500/5' : 'border-zinc-800 hover:border-zinc-700 bg-white/5'}`}>
                                                            {previewUrl ? (
                                                                <div className="relative w-full aspect-video md:aspect-auto md:h-32 mb-2">
                                                                    <img src={previewUrl} alt="Preview" className="w-full h-full object-contain rounded-lg shadow-xl" />
                                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                                                                        <RefreshCw size={24} className="text-white" />
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-1">
                                                                        <Copy size={24} className="text-gray-500" />
                                                                    </div>
                                                                    <p className="text-sm text-gray-400">Click to upload or drag & drop</p>
                                                                    <p className="text-[10px] text-gray-600 uppercase font-bold tracking-widest">PNG, JPG up to 5MB</p>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <Button
                                                    onClick={handleManualSubmit}
                                                    disabled={submittingUtr || !amount || !utr || !selectedFile}
                                                    className="w-full py-4 bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-600/20"
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

                                            <div className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-xl space-y-2 text-[11px]">
                                                <p className="text-yellow-500 font-bold flex items-center gap-1 uppercase tracking-wider"><AlertCircle size={14} /> Important Note</p>
                                                <p className="text-gray-500 leading-relaxed">
                                                    1. Make payment to the UPI ID above.<br />
                                                    2. Copy the 12-digit UTR/Ref number from your payment app.<br />
                                                    3. Upload a screenshot of the successful transaction.<br />
                                                    4. Paste UTR and click Confirm. Verification takes 15-30 mins.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="p-12 text-center glass rounded-2xl border border-white/5">
                                    <IndianRupee size={48} className="mx-auto text-gray-700 mb-4" />
                                    <h3 className="text-xl font-bold mb-1">No Methods Available</h3>
                                    <p className="text-gray-500">Please check back later or contact support.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {selectedCurrency !== 'INR' && (
                        <div className="space-y-6">
                            <div className="p-8 text-center glass rounded-2xl border border-white/5 space-y-6">
                                <Wallet size={48} className="mx-auto text-primary-500" />
                                <div>
                                    <h3 className="text-xl font-bold mb-1">Deposit {selectedCurrency}</h3>
                                    <p className="text-gray-400 text-sm">Generate a unique address to deposit {selectedCurrency}</p>
                                </div>
                                <Button
                                    onClick={handleGenerateDeposit}
                                    disabled={isLoading}
                                    className="w-full py-4 text-lg font-bold bg-primary-600 hover:bg-primary-700 shadow-xl"
                                >
                                    {isLoading ? 'Generating...' : 'Generate Address'}
                                    {!isLoading && <ArrowRight className="ml-2" size={20} />}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* Success View */
                <Card className="bg-zinc-900/50 border-zinc-800 p-8 text-center animate-in zoom-in duration-300">
                    {depositData.success && depositData.manual ? (
                        <div className="space-y-6">
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle className="text-green-500" size={32} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold uppercase tracking-tight">Request Submitted</h3>
                                <p className="text-gray-400 mt-2">Your deposit of <span className="text-white font-bold">₹{amount}</span> is currently being verified by our team.</p>
                                <p className="text-xs text-gray-500 mt-4">Transaction ID: {depositData.transactionId || 'N/A'}</p>
                            </div>
                            <Button onClick={() => window.location.reload()} className="w-full bg-white/5 hover:bg-white/10 border border-white/10">
                                Back to Wallet
                            </Button>
                        </div>
                    ) : depositData.address ? (
                        /* Crypto Deposit Info */
                        <div className="space-y-6 text-left">
                            <div className="flex items-center justify-between pb-4 border-b border-white/5">
                                <h3 className="text-xl font-bold">Deposit {selectedCurrency}</h3>
                                <button onClick={() => setDepositData(null)} className="text-xs text-primary-400 hover:underline">New Deposit</button>
                            </div>
                            <div className="flex flex-col items-center gap-6">
                                <div className="bg-white p-4 rounded-2xl shadow-2xl">
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${depositData.address}`}
                                        alt="QR"
                                        className="w-48 h-48"
                                    />
                                </div>
                                <div className="w-full space-y-2">
                                    <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Your Private Deposit Address</label>
                                    <div className="flex items-center gap-2 bg-black/40 p-4 rounded-xl border border-white/5">
                                        <code className="flex-1 text-sm font-mono break-all text-primary-300">{depositData.address}</code>
                                        <button onClick={() => copyToClipboard(depositData.address)} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all"><Copy size={18} /></button>
                                    </div>
                                </div>
                                <div className="p-4 bg-primary-500/5 rounded-xl border border-primary-500/10 w-full">
                                    <p className="text-[10px] text-center text-gray-400 leading-relaxed">
                                        Only send <span className="text-white font-bold">{selectedCurrency}</span> to this address. Sending any other coin may result in permanent loss.
                                        Wait for ~3 network confirmations. Balance will update automatically.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 text-center">
                            <AlertCircle className="text-red-500 mx-auto" size={48} />
                            <h3 className="text-xl font-bold">Unexpected State</h3>
                            <Button onClick={() => window.location.reload()}>Reload</Button>
                        </div>
                    )}
                </Card>
            )}
        </div>
    )
}
