'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useSocket } from '@/hooks/useSocket'
import { useWallet } from '@/hooks/useWallet'
import { AviatorPlane } from '@/components/games/AviatorPlane'
import { formatCurrency, generateClientSeed, cn } from '@/lib/utils'
import { Plane, History as HistoryIcon, Shield, Zap, TrendingUp, Clock, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

type GamePhase = 'betting' | 'flying' | 'crashed'

export default function AviatorPage() {
    const { socket, isConnected } = useSocket('/aviator')
    const { currentWallet, selectedCurrency, fetchWallets } = useWallet()

    const [betAmount, setBetAmount] = useState('100')
    const [autoCashout, setAutoCashout] = useState('')
    const [hasBet, setHasBet] = useState(false)
    const [canCashout, setCanCashout] = useState(false)

    const [gamePhase, setGamePhase] = useState<GamePhase>('betting')
    const [currentMultiplier, setCurrentMultiplier] = useState(1.00)
    const [crashPoint, setCrashPoint] = useState<number | null>(null)
    const [bettingTimeLeft, setBettingTimeLeft] = useState(5)

    const [history, setHistory] = useState<number[]>([])
    const [activePlayers, setActivePlayers] = useState<any[]>([])
    const [lastCashout, setLastCashout] = useState<any>(null)

    useEffect(() => {
        if (!socket) return

        // Game state
        socket.on('aviator:state', (data: any) => {
            if (data.bettingPhase) {
                setGamePhase('betting')
            }
        })

        // Betting phase started
        socket.on('aviator:betting_phase', (data: any) => {
            setGamePhase('betting')
            setHasBet(false)
            setCanCashout(false)
            setCurrentMultiplier(1.00)
            setCrashPoint(null)
            setLastCashout(null)
            setBettingTimeLeft(5)

            // Countdown
            const interval = setInterval(() => {
                setBettingTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(interval)
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
        })

        // Flight started
        socket.on('aviator:flight_started', (data: any) => {
            setGamePhase('flying')
            setBettingTimeLeft(0)
            if (hasBet) {
                setCanCashout(true)
            }
        })

        // Multiplier update
        socket.on('aviator:multiplier_update', (data: any) => {
            setCurrentMultiplier(data.multiplier)
        })

        // Plane crashed
        socket.on('aviator:crashed', (data: any) => {
            setGamePhase('crashed')
            setCrashPoint(data.crashPoint)
            setCanCashout(false)
            setHistory(prev => [data.crashPoint, ...prev].slice(0, 20))

            if (hasBet && !lastCashout) {
                toast.error(`Crashed at ${data.crashPoint}x!`, { icon: '💥' })
            }
        })

        // Player bet placed
        socket.on('aviator:bet_placed', (data: any) => {
            setActivePlayers(prev => [...prev, data])
        })

        // Player cashed out
        socket.on('aviator:player_cashed_out', (data: any) => {
            toast.success(`${data.username} cashed out at ${data.multiplier}x!`, {
                icon: '💰',
                duration: 2000
            })
        })

        return () => {
            socket.off('aviator:state')
            socket.off('aviator:betting_phase')
            socket.off('aviator:flight_started')
            socket.off('aviator:multiplier_update')
            socket.off('aviator:crashed')
            socket.off('aviator:bet_placed')
            socket.off('aviator:player_cashed_out')
        }
    }, [socket, hasBet, lastCashout])

    const handlePlaceBet = () => {
        if (!socket || !isConnected) {
            toast.error('Not connected to game server')
            return
        }

        if (gamePhase !== 'betting') {
            toast.error('Betting is closed')
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

        const autoValue = autoCashout ? parseFloat(autoCashout) : null
        if (autoValue !== null && (autoValue < 1.01 || autoValue > 10000)) {
            toast.error('Auto cashout must be between 1.01x and 10000x')
            return
        }

        socket.emit('aviator:bet', {
            betAmount: amount,
            autoCashout: autoValue,
            currency: selectedCurrency,
            clientSeed: generateClientSeed()
        }, (response: any) => {
            if (response.success) {
                setHasBet(true)
                toast.success('Bet placed! Good luck! 🛫')
                fetchWallets()
            } else {
                toast.error(response.message || 'Bet failed')
            }
        })
    }

    const handleCashout = () => {
        if (!socket || !canCashout) return

        socket.emit('aviator:cashout', {}, (response: any) => {
            if (response.success) {
                setCanCashout(false)
                setLastCashout(response.data)
                toast.success(`Cashed out at ${response.data.multiplier}x! Won ${formatCurrency(response.data.payout, selectedCurrency)}`, {
                    icon: '🎉'
                })
                fetchWallets()
            } else {
                toast.error(response.message || 'Cashout failed')
            }
        })
    }

    const potentialWin = parseFloat(betAmount) * currentMultiplier || 0

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-blue-500/20 rounded-2xl">
                            <Plane className="w-8 h-8 text-blue-400" />
                        </div>
                        <h1 className="text-4xl font-black tracking-tight uppercase">Aviator</h1>
                    </div>
                    <p className="text-gray-400">Watch the plane fly and cash out before it crashes!</p>
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
                    <Card className="p-6 md:p-8 bg-dark-200/50 border-white/10 shadow-2xl relative overflow-hidden">
                        {/* Background Glows */}
                        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/5 blur-[120px] pointer-events-none" />
                        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/5 blur-[120px] pointer-events-none" />

                        <div className="relative z-10 space-y-4">
                            {/* Status Bar */}
                            <div className="flex items-center justify-between px-4 py-3 bg-white/5 rounded-xl border border-white/5">
                                <div className="flex items-center gap-4">
                                    {gamePhase === 'betting' && (
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-5 h-5 text-yellow-500 animate-pulse" />
                                            <span className="text-lg font-bold text-yellow-400">
                                                Betting: {bettingTimeLeft}s
                                            </span>
                                        </div>
                                    )}
                                    {gamePhase === 'flying' && (
                                        <div className="flex items-center gap-2">
                                            <Zap className="w-5 h-5 text-green-500 animate-bounce" />
                                            <span className="text-lg font-bold text-green-400">
                                                Flying...
                                            </span>
                                        </div>
                                    )}
                                    {gamePhase === 'crashed' && crashPoint && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg font-bold text-red-400">
                                                Crashed at {crashPoint.toFixed(2)}x
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm font-medium text-gray-300">
                                        {activePlayers.length} players
                                    </span>
                                </div>
                            </div>

                            {/* Plane Animation */}
                            <AviatorPlane
                                multiplier={currentMultiplier}
                                crashed={gamePhase === 'crashed'}
                                flying={gamePhase === 'flying'}
                            />

                            {/* Last Cashout Info */}
                            {lastCashout && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-400">You cashed out at</p>
                                            <p className="text-2xl font-black text-green-400">
                                                {lastCashout.multiplier.toFixed(2)}x
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-gray-400">Won</p>
                                            <p className="text-2xl font-black text-green-400">
                                                {formatCurrency(lastCashout.payout, selectedCurrency)}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </Card>

                    {/* Crash History */}
                    <Card className="p-6 bg-dark-200/50 border-white/10">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold flex items-center gap-2 text-sm">
                                <HistoryIcon className="w-4 h-4 text-gray-400" />
                                Last 20 Crashes
                            </h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {history.length === 0 ? (
                                <p className="text-gray-500 text-xs py-4 text-center w-full bg-white/5 rounded-lg border border-dashed border-white/10">
                                    No history yet
                                </p>
                            ) : (
                                history.map((crash, i) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg font-black text-xs border",
                                            crash >= 2 ? "bg-green-500/10 border-green-500/20 text-green-400" :
                                                crash >= 1.5 ? "bg-blue-500/10 border-blue-500/20 text-blue-400" :
                                                    "bg-red-500/10 border-red-500/20 text-red-400"
                                        )}
                                    >
                                        {crash.toFixed(2)}x
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>
                </div>

                {/* Controls Area */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="p-6 bg-dark-200/50 border-white/10 backdrop-blur-xl sticky top-24">
                        <div className="space-y-6">
                            {/* Bet Amount */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                        Bet Amount
                                    </label>
                                    <span className="text-[10px] text-primary-400 font-bold">
                                        Balance: {formatCurrency(currentWallet?.balance || 0, selectedCurrency)}
                                    </span>
                                </div>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        value={betAmount}
                                        onChange={(e) => setBetAmount(e.target.value)}
                                        className="pl-12 h-14 bg-dark-400/50 border-white/5 font-bold text-lg"
                                        placeholder="0.00"
                                        disabled={gamePhase !== 'betting' || hasBet}
                                    />
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-400 font-bold">
                                        {selectedCurrency === 'INR' ? '₹' : '₿'}
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 gap-2 mt-3">
                                    {[100, 500, 1000, 2000].map(amt => (
                                        <button
                                            key={amt}
                                            onClick={() => setBetAmount(amt.toString())}
                                            disabled={gamePhase !== 'betting' || hasBet}
                                            className="py-2 text-[10px] font-black rounded-lg bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
                                        >
                                            {amt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Auto Cashout */}
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">
                                    Auto Cashout (Optional)
                                </label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        value={autoCashout}
                                        onChange={(e) => setAutoCashout(e.target.value)}
                                        className="pr-12 h-14 bg-dark-400/50 border-white/5 font-bold text-lg"
                                        placeholder="1.50"
                                        step="0.01"
                                        disabled={gamePhase !== 'betting' || hasBet}
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">
                                        x
                                    </div>
                                </div>
                            </div>

                            {/* Potential Win */}
                            {hasBet && gamePhase === 'flying' && (
                                <div className="p-4 bg-primary-500/10 border border-primary-500/20 rounded-xl">
                                    <p className="text-xs text-gray-400 mb-1">Potential Win</p>
                                    <p className="text-2xl font-black text-primary-400">
                                        {formatCurrency(potentialWin, selectedCurrency)}
                                    </p>
                                </div>
                            )}

                            {/* Action Buttons */}
                            {!hasBet && gamePhase === 'betting' && (
                                <Button
                                    onClick={handlePlaceBet}
                                    disabled={!isConnected}
                                    className="w-full h-20 text-xl font-black uppercase tracking-tighter bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <Plane className="w-6 h-6" />
                                        Place Bet
                                    </div>
                                </Button>
                            )}

                            {hasBet && gamePhase === 'betting' && (
                                <div className="w-full h-20 flex items-center justify-center bg-yellow-500/10 border-2 border-yellow-500 rounded-xl">
                                    <p className="text-lg font-bold text-yellow-400">Bet Placed! Waiting...</p>
                                </div>
                            )}

                            {canCashout && gamePhase === 'flying' && (
                                <Button
                                    onClick={handleCashout}
                                    className="w-full h-20 text-xl font-black uppercase tracking-tighter bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 shadow-xl shadow-green-500/20 active:scale-95 transition-all animate-pulse"
                                >
                                    <div className="flex flex-col items-center">
                                        <span>Cash Out</span>
                                        <span className="text-sm font-medium opacity-75">
                                            {formatCurrency(potentialWin, selectedCurrency)}
                                        </span>
                                    </div>
                                </Button>
                            )}

                            {hasBet && !canCashout && gamePhase === 'flying' && (
                                <div className="w-full h-20 flex items-center justify-center bg-blue-500/10 border-2 border-blue-500 rounded-xl">
                                    <p className="text-lg font-bold text-blue-400">Auto Cashout Active</p>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Game Info */}
                    <Card className="p-6 bg-dark-200/50 border-white/10">
                        <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-primary-400" />
                            How to Play
                        </h3>
                        <ul className="space-y-2 text-xs text-gray-400">
                            <li className="flex items-start gap-2">
                                <span className="text-primary-400 font-bold">1.</span>
                                Place your bet during the betting phase (5s)
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-primary-400 font-bold">2.</span>
                                Watch the plane fly and multiplier increase
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-primary-400 font-bold">3.</span>
                                Cash out before the plane crashes!
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-primary-400 font-bold">4.</span>
                                Set auto-cashout for automatic wins
                            </li>
                        </ul>
                    </Card>
                </div>
            </div>
        </div>
    )
}
