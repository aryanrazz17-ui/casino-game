'use client'

import { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useSocket } from '@/hooks/useSocket'
import { useWallet } from '@/hooks/useWallet'
import { formatCurrency, generateClientSeed } from '@/lib/utils'
import { CrashResult } from '@/types'
import { Rocket, History, Zap, Shield, HelpCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { CrashGraph } from '@/components/games/CrashGraph'

export default function CrashPage() {
    const { socket, isConnected } = useSocket('/crash')
    const { currentWallet, selectedCurrency, fetchWallets } = useWallet()

    const [betAmount, setBetAmount] = useState('100')
    const [autoCashout, setAutoCashout] = useState('2.00')
    const [isPlaying, setIsPlaying] = useState(false)
    const [isCrashed, setIsCrashed] = useState(false)
    const [currentMultiplier, setCurrentMultiplier] = useState(1.00)
    const [lastResult, setLastResult] = useState<CrashResult | null>(null)
    const [history, setHistory] = useState<CrashResult[]>([])

    const animationRef = useRef<number>()
    const startTimeRef = useRef<number>(0)
    const targetResultRef = useRef<CrashResult | null>(null)

    const handlePlay = () => {
        if (!socket || !isConnected) {
            toast.error('Not connected to game server')
            return
        }

        const amount = parseFloat(betAmount)
        const cashout = parseFloat(autoCashout)

        if (isNaN(amount) || amount <= 0) {
            toast.error('Invalid bet amount')
            return
        }

        if (isNaN(cashout) || cashout < 1.01) {
            toast.error('Auto cashout must be at least 1.01x')
            return
        }

        if (!currentWallet || currentWallet.balance < amount) {
            toast.error('Insufficient balance')
            return
        }

        setIsPlaying(true)
        setIsCrashed(false)
        setCurrentMultiplier(1.00)

        socket.emit(
            'crash:play',
            {
                betAmount: amount,
                autoCashout: cashout,
                currency: selectedCurrency,
                clientSeed: generateClientSeed(),
            },
            (response: any) => {
                if (response.success) {
                    targetResultRef.current = response.data as CrashResult
                    startAnimation()
                } else {
                    setIsPlaying(false)
                    toast.error(response.message || 'Game error')
                }
            }
        )
    }

    const startAnimation = () => {
        startTimeRef.current = Date.now()

        const update = () => {
            const result = targetResultRef.current
            if (!result) return

            const elapsed = (Date.now() - startTimeRef.current) / 1000
            // Realistic crash growth: e^(0.06 * elapsed)
            const multiplier = Math.pow(Math.E, 0.06 * elapsed)

            const stopPoint = result.isWin ? result.cashoutAt : result.crashPoint

            if (multiplier >= result.crashPoint) {
                // Game crashed
                setCurrentMultiplier(result.crashPoint)
                setIsCrashed(true)
                setIsPlaying(false)
                setLastResult(result)
                setHistory((prev) => [result, ...prev].slice(0, 10))

                if (!result.isWin) {
                    toast.error(`Crashed at ${result.crashPoint.toFixed(2)}x`)
                } else {
                    toast.success(`Won ${formatCurrency(result.payout, selectedCurrency)}!`)
                }

                fetchWallets()
                return
            }

            if (result.isWin && multiplier >= result.cashoutAt && !isCrashed) {
                // Technically we "won" here in the animation, but we continue to the crash point
                // To keep it simple, we'll just continue the animation until it hits the crash point
                // But we can show a "Cashed Out" notification early
            }

            setCurrentMultiplier(multiplier)
            animationRef.current = requestAnimationFrame(update)
        }

        animationRef.current = requestAnimationFrame(update)
    }

    useEffect(() => {
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current)
        }
    }, [])

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-primary-500/20 rounded-2xl">
                            <Rocket className="w-8 h-8 text-primary-400" />
                        </div>
                        <h1 className="text-4xl font-black tracking-tight">CRASH</h1>
                    </div>
                    <p className="text-gray-400 flex items-center gap-2">
                        Watch the multiplier rise and cash out before it crashes!
                        <HelpCircle className="w-4 h-4 cursor-help" />
                    </p>
                </div>

                <div className="glass px-4 py-2 rounded-xl border border-white/5 flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className="text-sm font-medium text-gray-300">{isConnected ? 'Server Live' : 'Offline'}</span>
                    </div>
                    <div className="h-4 w-px bg-white/10" />
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm font-medium text-gray-300">Provably Fair</span>
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-6">
                {/* Left Side: Game Display */}
                <div className="lg:col-span-8 space-y-6">
                    <CrashGraph multiplier={currentMultiplier} isCrashed={isCrashed} />

                    {/* Instant Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Bet Amount', value: formatCurrency(parseFloat(betAmount) || 0, selectedCurrency), icon: Zap },
                            { label: 'Auto Cashout', value: `${autoCashout}x`, icon: Rocket },
                            { label: 'Potential Win', value: formatCurrency((parseFloat(betAmount) || 0) * (parseFloat(autoCashout) || 0), selectedCurrency), icon: Shield },
                            { label: 'Last Crash', value: lastResult ? `${lastResult.crashPoint.toFixed(2)}x` : '---', icon: History },
                        ].map((stat, i) => (
                            <Card key={i} className="p-4 border-white/5 bg-dark-300/30">
                                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                                    <stat.icon className="w-3 h-3" />
                                    {stat.label}
                                </p>
                                <p className="text-xl font-bold">{stat.value}</p>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Right Side: Controls */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Controls Card */}
                    <Card className="p-6 border-white/10 bg-dark-200/50 backdrop-blur-xl">
                        <div className="space-y-6">
                            {/* Bet Amount */}
                            <div>
                                <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-widest">
                                    Bet Amount
                                </label>
                                <div className="relative">
                                    <Input
                                        type="tel" // optimized for mobile numeric keypad
                                        value={betAmount}
                                        onChange={(e) => setBetAmount(e.target.value)}
                                        className="pl-12 bg-dark-400/50 border-white/10 h-14 text-lg font-bold"
                                        placeholder="0.00"
                                    />
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-400 font-bold">
                                        {selectedCurrency === 'INR' ? '₹' : '₿'}
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 gap-2 mt-3">
                                    {[100, 500, 1000, 2000].map((amt) => (
                                        <button
                                            key={amt}
                                            onClick={() => setBetAmount(amt.toString())}
                                            className="py-3 md:py-2 text-xs font-bold rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 transition-colors active:scale-95"
                                        >
                                            +{amt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Auto Cashout */}
                            <div>
                                <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-widest">
                                    Auto Cashout
                                </label>
                                <div className="relative">
                                    <Input
                                        type="tel"
                                        value={autoCashout}
                                        onChange={(e) => setAutoCashout(e.target.value)}
                                        className="pl-12 bg-dark-400/50 border-white/10 h-14 text-lg font-bold"
                                        step="0.1"
                                    />
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 font-bold">
                                        x
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 gap-2 mt-3">
                                    {[1.5, 2.0, 5.0, 10.0].map((mul) => (
                                        <button
                                            key={mul}
                                            onClick={() => setAutoCashout(mul.toFixed(2))}
                                            className="py-3 md:py-2 text-xs font-bold rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 transition-colors active:scale-95"
                                        >
                                            {mul}x
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Play Button */}
                            <Button
                                onClick={handlePlay}
                                disabled={!isConnected || isPlaying}
                                className={`w-full h-16 text-xl font-black uppercase tracking-tighter transition-all duration-300 touch-manipulation ${isPlaying
                                    ? 'bg-primary-600/50 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 shadow-xl shadow-primary-500/20 active:scale-[0.98]'
                                    }`}
                            >
                                {isPlaying ? (
                                    <div className="flex items-center gap-3">
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Waiting...
                                    </div>
                                ) : (
                                    'Place Bet'
                                )}
                            </Button>
                        </div>
                    </Card>

                    {/* History */}
                    <Card className="p-4 md:p-6 border-white/10 bg-dark-200/50">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold flex items-center gap-2 text-sm md:text-base">
                                <History className="w-4 h-4 text-gray-400" />
                                Recent Games
                            </h3>
                        </div>
                        <div className="flex md:flex-col gap-3 overflow-x-auto pb-2 md:pb-0 md:overflow-visible noscrollbar">
                            {history.length === 0 ? (
                                <div className="w-full py-8 text-center bg-white/5 rounded-xl border border-dashed border-white/10">
                                    <p className="text-gray-500 text-sm">No games yet</p>
                                </div>
                            ) : (
                                history.map((game, i) => (
                                    <div
                                        key={i}
                                        className={`flex-shrink-0 w-32 md:w-full p-3 rounded-xl border flex flex-col md:flex-row items-center md:items-center justify-between group transition-all ${game.isWin
                                            ? 'bg-green-500/5 border-green-500/20'
                                            : 'bg-red-500/5 border-red-500/20'
                                            }`}
                                    >
                                        <div className="text-center md:text-left">
                                            <p className={`font-black text-lg md:text-base ${game.isWin ? 'text-green-400' : 'text-red-400'}`}>
                                                {game.crashPoint.toFixed(2)}x
                                            </p>
                                            <p className="text-[10px] text-gray-500 font-medium">
                                                ID: {game.gameId.slice(-6)}
                                            </p>
                                        </div>
                                        <div className="text-center md:text-right mt-1 md:mt-0">
                                            <p className="font-bold text-sm">
                                                {game.isWin ? '+' : '-'}
                                                {formatCurrency(game.isWin ? game.payout : parseFloat(betAmount), selectedCurrency)}
                                            </p>
                                            <p className="text-[10px] text-gray-400 hidden md:block">
                                                {game.isWin ? `Cashed @ ${game.cashoutAt}x` : 'Bust'}
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
