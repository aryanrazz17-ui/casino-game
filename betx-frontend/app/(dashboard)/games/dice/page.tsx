'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useSocket } from '@/hooks/useSocket'
import { useWallet } from '@/hooks/useWallet'
import { DiceResult } from '@/types'
import { formatCurrency, generateClientSeed, calculateMultiplier, calculatePayout } from '@/lib/utils'
import { Dice1, TrendingUp, TrendingDown, History, Zap, Shield, Target } from 'lucide-react'
import toast from 'react-hot-toast'
import { DiceSlider } from '@/components/games/DiceSlider'

export default function DicePage() {
    const { socket, isConnected } = useSocket('/dice')
    const { currentWallet, selectedCurrency, fetchWallets } = useWallet()

    const [betAmount, setBetAmount] = useState('100')
    const [prediction, setPrediction] = useState<'over' | 'under'>('over')
    const [targetValue, setTargetValue] = useState(50)
    const [isPlaying, setIsPlaying] = useState(false)
    const [lastResult, setLastResult] = useState<DiceResult | null>(null)
    const [history, setHistory] = useState<DiceResult[]>([])

    const multiplier = calculateMultiplier(prediction, targetValue)
    const winChance = prediction === 'over' ? 100 - targetValue : targetValue
    const potentialPayout = calculatePayout(parseFloat(betAmount) || 0, multiplier)

    const handlePlay = () => {
        if (!socket || !isConnected) {
            toast.error('Not connected to game server')
            return
        }

        const amount = parseFloat(betAmount)
        if (isNaN(amount) || amount <= 0) {
            toast.error('Invalid bet amount')
            return
        }

        if (!currentWallet || currentWallet.balance < amount) {
            toast.error('Insufficient balance')
            return
        }

        setIsPlaying(true)
        setLastResult(null)

        socket.emit(
            'dice:play',
            {
                betAmount: amount,
                prediction,
                target: targetValue,
                currency: selectedCurrency,
                clientSeed: generateClientSeed(),
            },
            (response: any) => {
                setIsPlaying(false)

                if (response.success) {
                    const result = response.data as DiceResult
                    setLastResult(result)
                    setHistory((prev) => [result, ...prev].slice(0, 10))

                    if (result.isWin) {
                        toast.success(`Victory! You won ${formatCurrency(result.payout, selectedCurrency)}`, { icon: '🎯' })
                    } else {
                        toast.error('Unlucky! Try again.')
                    }

                    fetchWallets()
                } else {
                    toast.error(response.message || 'Game error')
                }
            }
        )
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-indigo-500/20 rounded-2xl">
                            <Dice1 className="w-8 h-8 text-indigo-400" />
                        </div>
                        <h1 className="text-4xl font-black tracking-tight uppercase">Dice</h1>
                    </div>
                    <p className="text-gray-400">Predict the roll outcome and multiply your balance!</p>
                </div>

                <div className="glass px-4 py-2 rounded-xl border border-white/5 flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className="text-sm font-medium text-gray-300">Live</span>
                    </div>
                    <div className="h-4 w-px bg-white/10" />
                    <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary-400" />
                        <span className="text-sm font-medium text-gray-300">Provably Fair</span>
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-6">
                {/* Main Game Area */}
                <div className="lg:col-span-8 space-y-6">
                    <Card className="p-8 md:p-12 bg-dark-200/50 border-white/10 shadow-2xl overflow-hidden relative">
                        {/* Decorative Background Elements */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 blur-[100px] pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 blur-[100px] pointer-events-none" />

                        <div className="relative z-10 space-y-12">
                            {/* Roll Display */}
                            <div className="flex flex-col items-center">
                                <div className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">Previous Roll</div>
                                <div className={`text-8xl font-black transition-all duration-500 ${lastResult?.isWin ? 'text-green-400 scale-110 drop-shadow-glow-green' : lastResult ? 'text-red-400' : 'text-white opacity-20'}`}>
                                    {lastResult?.result.toFixed(2) || '00.00'}
                                </div>
                            </div>

                            {/* Slider */}
                            <DiceSlider
                                value={targetValue}
                                onChange={setTargetValue}
                                prediction={prediction}
                                result={lastResult?.result}
                            />

                            {/* Predicted Outcome Info */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center transition-all hover:bg-white/10">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Multiplier</p>
                                    <p className="text-xl font-black text-primary-400">{multiplier.toFixed(4)}x</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center transition-all hover:bg-white/10">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Win Chance</p>
                                    <p className="text-xl font-black text-indigo-400">{winChance.toFixed(2)}%</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center transition-all hover:bg-white/10">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Roll Prediction</p>
                                    <p className={`text-xl font-black uppercase ${prediction === 'over' ? 'text-green-400' : 'text-red-400'}`}>
                                        {prediction} {targetValue}
                                    </p>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center transition-all hover:bg-white/10">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Potential Win</p>
                                    <p className="text-xl font-black text-emerald-400">{formatCurrency(potentialPayout, selectedCurrency)}</p>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Result Callouts */}
                    <div className="grid md:grid-cols-2 gap-6">
                        <Card className="p-6 bg-dark-200/50 border-white/10">
                            <div className="flex items-center gap-3 mb-4">
                                <TrendingUp className="w-5 h-5 text-green-400" />
                                <h3 className="font-bold text-sm uppercase tracking-wider">Strategy Info</h3>
                            </div>
                            <p className="text-sm text-gray-400 leading-relaxed">
                                Lowering your win chance increases your potential multiplier. High risk strategies can yield payouts up to <span className="text-white font-bold">99.00x</span>.
                            </p>
                        </Card>
                        <Card className="p-6 bg-dark-200/50 border-white/10">
                            <div className="flex items-center gap-3 mb-4">
                                <Shield className="w-5 h-5 text-indigo-400" />
                                <h3 className="font-bold text-sm uppercase tracking-wider">Security</h3>
                            </div>
                            <p className="text-sm text-gray-400 leading-relaxed">
                                Every roll is generated using SHA256 hashed seeds. You can verify the fairness of any result anytime.
                            </p>
                        </Card>
                    </div>
                </div>

                {/* Controls Area */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="p-6 bg-dark-200/50 border-white/10 backdrop-blur-xl">
                        <div className="space-y-6">
                            {/* Bet Amount */}
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">
                                    Bet Amount
                                </label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        value={betAmount}
                                        onChange={(e) => setBetAmount(e.target.value)}
                                        className="pl-12 h-14 bg-dark-400/50 border-white/5 font-bold text-lg"
                                        placeholder="0.00"
                                    />
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-400 font-bold">
                                        {selectedCurrency === 'INR' ? '₹' : '₿'}
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 gap-2 mt-3">
                                    {[100, 500, 1000, 2000].map(amt => (
                                        <button key={amt} onClick={() => setBetAmount(amt.toString())} className="py-2 text-[10px] font-black rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                                            {amt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Mode Selection */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setPrediction('over')}
                                    className={`py-4 rounded-xl border-2 transition-all font-black text-xs uppercase flex flex-col items-center gap-2 ${prediction === 'over'
                                        ? 'border-green-500 bg-green-500/10 text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.1)]'
                                        : 'border-white/5 bg-white/5 text-gray-500 hover:border-white/10'
                                        }`}
                                >
                                    <TrendingUp className="w-5 h-5" />
                                    Over
                                </button>
                                <button
                                    onClick={() => setPrediction('under')}
                                    className={`py-4 rounded-xl border-2 transition-all font-black text-xs uppercase flex flex-col items-center gap-2 ${prediction === 'under'
                                        ? 'border-red-500 bg-red-500/10 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.1)]'
                                        : 'border-white/5 bg-white/5 text-gray-500 hover:border-white/10'
                                        }`}
                                >
                                    <TrendingDown className="w-5 h-5" />
                                    Under
                                </button>
                            </div>

                            <Button
                                onClick={handlePlay}
                                disabled={!isConnected || isPlaying}
                                className="w-full h-20 text-xl font-black uppercase tracking-tighter bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 shadow-xl shadow-primary-500/20 active:scale-95 transition-all"
                            >
                                {isPlaying ? 'Rolling...' : 'Roll Dice'}
                            </Button>
                        </div>
                    </Card>

                    {/* Simple History */}
                    <Card className="p-6 bg-dark-200/50 border-white/10">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold flex items-center gap-2 text-sm">
                                <History className="w-4 h-4 text-gray-400" />
                                Recent Rolls
                            </h3>
                            <Zap className="w-4 h-4 text-yellow-500" />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {history.length === 0 ? (
                                <p className="text-gray-500 text-xs py-4 text-center w-full bg-white/5 rounded-lg border border-dashed border-white/10">Waiting for first roll...</p>
                            ) : (
                                history.map((game, i) => (
                                    <div
                                        key={i}
                                        className={`px-3 py-1.5 rounded-lg font-black text-xs border ${game.isWin
                                            ? 'bg-green-500/10 border-green-500/20 text-green-400'
                                            : 'bg-red-500/10 border-red-500/20 text-red-400'
                                            }`}
                                    >
                                        {game.result.toFixed(2)}
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    )
}
