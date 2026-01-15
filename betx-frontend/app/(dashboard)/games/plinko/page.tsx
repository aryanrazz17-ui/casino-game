'use client'

import { useState, useRef } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useSocket } from '@/hooks/useSocket'
import { useWallet } from '@/hooks/useWallet'
import { formatCurrency, generateClientSeed } from '@/lib/utils'
import { Target, History, Zap, Shield, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { PlinkoBoard } from '@/components/games/PlinkoBoard'

interface PlinkoResult {
    gameId: string
    path: number[]
    bucket: number
    multiplier: number
    payout: number
    isWin: boolean
    balance: number
}

const RISK_COLORS = {
    low: 'text-blue-400',
    medium: 'text-yellow-400',
    high: 'text-red-400',
}

export default function PlinkoPage() {
    const { socket, isConnected } = useSocket('/plinko')
    const { currentWallet, selectedCurrency, fetchWallets } = useWallet()

    const [betAmount, setBetAmount] = useState('100')
    const [risk, setRisk] = useState<'low' | 'medium' | 'high'>('medium')
    const [rows, setRows] = useState<8 | 12 | 16>(16)
    const [isPlaying, setIsPlaying] = useState(false)
    const [activePath, setActivePath] = useState<number[] | null>(null)
    const [history, setHistory] = useState<PlinkoResult[]>([])

    // Store pending results to show after animation
    const pendingResultRef = useRef<PlinkoResult | null>(null)

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
        setActivePath(null)

        socket.emit(
            'plinko:play',
            {
                betAmount: amount,
                risk,
                rows,
                currency: selectedCurrency,
                clientSeed: generateClientSeed(),
            },
            (response: any) => {
                if (response.success) {
                    const result = response.data as PlinkoResult
                    pendingResultRef.current = result
                    setActivePath(result.path)
                    // Animation starts automatically when activePath is set
                } else {
                    setIsPlaying(false)
                    toast.error(response.message || 'Game error')
                }
            }
        )
    }

    const handleBallComplete = () => {
        const result = pendingResultRef.current
        if (result) {
            setHistory((prev) => [result, ...prev].slice(0, 10))
            if (result.isWin) {
                toast.success(`Win! ${result.multiplier.toFixed(2)}x payout`)
            } else {
                toast(`Landed in ${result.multiplier.toFixed(2)}x`, { icon: '🎯' })
            }
            fetchWallets()
        }
        setIsPlaying(false)
        setActivePath(null)
        pendingResultRef.current = null
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-primary-500/20 rounded-2xl">
                            <Target className="w-8 h-8 text-primary-400" />
                        </div>
                        <h1 className="text-4xl font-black tracking-tight uppercase">Plinko</h1>
                    </div>
                    <p className="text-gray-400">Choose your risk and watch the balls drop for massive multipliers!</p>
                </div>

                <div className="glass px-4 py-2 rounded-xl border border-white/5 flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className="text-sm font-medium text-gray-300">Live</span>
                    </div>
                    <div className="h-4 w-px bg-white/10" />
                    <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm font-medium text-gray-300">Randomized</span>
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-6">
                {/* Game Display */}
                <div className="lg:col-span-8 space-y-6">
                    <PlinkoBoard
                        rows={rows}
                        path={activePath}
                        onComplete={handleBallComplete}
                    />
                </div>

                {/* Controls */}
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

                            {/* Risk Level */}
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">
                                    Risk Level
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['low', 'medium', 'high'] as const).map((r) => (
                                        <button
                                            key={r}
                                            onClick={() => setRisk(r)}
                                            className={`py-3 rounded-xl border-2 transition-all font-black text-xs uppercase ${risk === r
                                                ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                                                : 'border-white/5 bg-white/5 text-gray-500 hover:border-white/10'
                                                }`}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Rows */}
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">
                                    Rows
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[8, 12, 16].map((r) => (
                                        <button
                                            key={r}
                                            onClick={() => setRows(r as any)}
                                            className={`py-3 rounded-xl border-2 transition-all font-black text-xs uppercase ${rows === r
                                                ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                                                : 'border-white/5 bg-white/5 text-gray-500 hover:border-white/10'
                                                }`}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Play Button */}
                            <Button
                                onClick={handlePlay}
                                disabled={!isConnected || isPlaying}
                                className="w-full h-16 text-xl font-black uppercase bg-gradient-to-r from-primary-600 to-indigo-600 shadow-xl shadow-primary-500/20"
                            >
                                {isPlaying ? 'Dropping...' : 'Drop Ball'}
                            </Button>
                        </div>
                    </Card>

                    {/* History */}
                    <Card className="p-6 bg-dark-200/50 border-white/10">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold flex items-center gap-2">
                                <History className="w-4 h-4 text-gray-400" />
                                History
                            </h3>
                            <Zap className="w-4 h-4 text-yellow-500" />
                        </div>
                        <div className="space-y-3">
                            {history.length === 0 ? (
                                <div className="py-8 text-center bg-white/5 rounded-xl border border-dashed border-white/10">
                                    <p className="text-gray-500 text-sm">Waiting for drops...</p>
                                </div>
                            ) : (
                                history.map((game, i) => (
                                    <div
                                        key={i}
                                        className={`p-3 rounded-xl border flex items-center justify-between group transition-all ${game.isWin
                                            ? 'bg-green-500/5 border-green-500/20'
                                            : 'bg-white/5 border-white/5'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-dark-400 flex items-center justify-center font-black text-[10px]">
                                                {game.multiplier.toFixed(1)}x
                                            </div>
                                            <span className="text-xs text-gray-400">Bucket {game.bucket}</span>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-bold text-xs ${game.isWin ? 'text-green-400' : 'text-gray-400'}`}>
                                                {game.isWin ? '+' : ''}
                                                {formatCurrency(game.isWin ? game.payout : -parseFloat(betAmount), selectedCurrency)}
                                            </p>
                                        </div>
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
