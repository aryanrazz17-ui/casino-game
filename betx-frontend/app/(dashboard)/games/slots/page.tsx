'use client'

import { useState, useRef } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useSocket } from '@/hooks/useSocket'
import { useWallet } from '@/hooks/useWallet'
import { formatCurrency, generateClientSeed } from '@/lib/utils'
import { Sparkles, History, Zap, Shield, Trophy } from 'lucide-react'
import toast from 'react-hot-toast'
import { SlotReel } from '@/components/games/SlotReel'

interface SlotsResult {
    gameId: string
    reels: string[][]
    multiplier: number
    payout: number
    isWin: boolean
    balance: number
}

export default function SlotsPage() {
    const { socket, isConnected } = useSocket('/slots')
    const { currentWallet, selectedCurrency, fetchWallets } = useWallet()

    const [betAmount, setBetAmount] = useState('100')
    const [lines, setLines] = useState(1)
    const [isSpinning, setIsSpinning] = useState(false)
    const [lastResult, setLastResult] = useState<SlotsResult | null>(null)
    const [history, setHistory] = useState<SlotsResult[]>([])
    const [currentReels, setCurrentReels] = useState<string[][]>([
        ['🍒', '🍋', '🍊'],
        ['🍇', '🔔', '💎'],
        ['7️⃣', '🍒', '🍋'],
    ])

    const handleSpin = () => {
        if (!socket || !isConnected) {
            toast.error('Not connected to game server')
            return
        }

        const amount = parseFloat(betAmount)
        if (isNaN(amount) || amount <= 0) {
            toast.error('Invalid bet amount')
            return
        }

        const totalBet = amount * lines
        if (!currentWallet || currentWallet.balance < totalBet) {
            toast.error('Insufficient balance')
            return
        }

        setIsSpinning(true)
        setLastResult(null)

        socket.emit(
            'slots:spin',
            {
                betAmount: amount,
                lines,
                currency: selectedCurrency,
                clientSeed: generateClientSeed(),
            },
            (response: any) => {
                if (response.success) {
                    const result = response.data as SlotsResult

                    // Delay to show animation
                    setTimeout(() => {
                        setIsSpinning(false)
                        setLastResult(result)
                        setCurrentReels(result.reels)
                        setHistory((prev) => [result, ...prev].slice(0, 10))

                        if (result.isWin) {
                            toast.success(`JACKPOT! You won ${formatCurrency(result.payout, selectedCurrency)}`, {
                                icon: '🎰',
                                duration: 5000,
                            })
                        }

                        fetchWallets()
                    }, 2000)
                } else {
                    setIsSpinning(false)
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
                        <div className="p-3 bg-yellow-500/20 rounded-2xl">
                            <Trophy className="w-8 h-8 text-yellow-400" />
                        </div>
                        <h1 className="text-4xl font-black tracking-tight uppercase">Lucky Slots</h1>
                    </div>
                    <p className="text-gray-400">Spin the reels and hit the jackpot!</p>
                </div>

                <div className="glass px-4 py-2 rounded-xl border border-white/5 flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className="text-sm font-medium text-gray-300">Live</span>
                    </div>
                    <div className="h-4 w-px bg-white/10" />
                    <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary-400" />
                        <span className="text-sm font-medium text-gray-300">Fair Play</span>
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-6">
                {/* Game Display */}
                <div className="lg:col-span-8 space-y-6">
                    <Card className="relative p-8 bg-gradient-to-br from-dark-200 to-dark-300 border-yellow-500/20 shadow-2xl overflow-hidden">
                        {/* Machine Frame Decoration */}
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600" />
                        <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600" />

                        {/* Winning Glow */}
                        {lastResult?.isWin && (
                            <div className="absolute inset-0 bg-yellow-500/5 animate-pulse pointer-events-none" />
                        )}

                        <div className="grid grid-cols-3 gap-6 relative z-10">
                            {currentReels.map((reel, i) => (
                                <div key={i} className="space-y-4">
                                    <SlotReel
                                        symbol={reel[1]}
                                        isSpinning={isSpinning}
                                        delay={i * 200}
                                    />
                                    <SlotReel
                                        symbol={reel[0]}
                                        isSpinning={isSpinning}
                                        delay={i * 200}
                                    />
                                    <SlotReel
                                        symbol={reel[2]}
                                        isSpinning={isSpinning}
                                        delay={i * 200}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Paylines Visualization (Subtle) */}
                        <div className="absolute top-1/2 left-0 w-full h-px bg-yellow-500/20 -translate-y-1/2 z-0" />
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="p-6 bg-dark-200/50 border-white/10">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Bet Settings</h3>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs text-gray-500 mb-2 uppercase">Base Bet</p>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            value={betAmount}
                                            onChange={(e) => setBetAmount(e.target.value)}
                                            className="pl-10 bg-dark-400/50 border-white/5 h-12 font-bold"
                                        />
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-400">
                                            {selectedCurrency === 'INR' ? '₹' : '₿'}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <p className="text-xs text-gray-500 uppercase font-bold">Lines: <span className="text-yellow-400">{lines}</span></p>
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max="5"
                                        value={lines}
                                        onChange={(e) => setLines(parseInt(e.target.value))}
                                        className="w-full h-1 bg-dark-400 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                                    />
                                </div>
                            </div>
                        </Card>

                        <Card className="p-6 bg-dark-200/50 border-white/10 flex flex-col justify-center">
                            <div className="text-center">
                                <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Total Stake</p>
                                <p className="text-3xl font-black text-white">
                                    {formatCurrency(parseFloat(betAmount) * lines || 0, selectedCurrency)}
                                </p>
                            </div>
                            <Button
                                onClick={handleSpin}
                                disabled={!isConnected || isSpinning}
                                className={`mt-4 h-16 text-xl font-black uppercase tracking-tighter transition-all ${isSpinning
                                    ? 'bg-gray-700 cursor-wait'
                                    : 'bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 shadow-xl shadow-yellow-600/20 active:scale-95'
                                    }`}
                            >
                                {isSpinning ? 'Spinning...' : 'Spin Now'}
                            </Button>
                        </Card>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Winner Announcement */}
                    {lastResult?.isWin && (
                        <Card className="p-6 bg-green-500/10 border-green-500/20 animate-bounce">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-green-500/20 rounded-full">
                                    <Sparkles className="w-6 h-6 text-green-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-green-400 font-bold uppercase">Mega Win!</p>
                                    <p className="text-2xl font-black text-white">+{formatCurrency(lastResult.payout, selectedCurrency)}</p>
                                </div>
                            </div>
                        </Card>
                    )}

                    <Card className="p-6 bg-dark-200/50 border-white/10">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold flex items-center gap-2">
                                <History className="w-4 h-4 text-gray-400" />
                                Recent Spins
                            </h3>
                        </div>
                        <div className="space-y-3">
                            {history.length === 0 ? (
                                <div className="py-8 text-center bg-white/5 rounded-xl border border-dashed border-white/10">
                                    <p className="text-gray-500 text-sm">No spins recorded yet</p>
                                </div>
                            ) : (
                                history.map((game, i) => (
                                    <div
                                        key={i}
                                        className={`p-3 rounded-xl border flex items-center justify-between transition-all ${game.isWin
                                            ? 'bg-green-500/5 border-green-500/20'
                                            : 'bg-white/5 border-white/5'
                                            }`}
                                    >
                                        <div className="flex gap-1">
                                            {game.reels.map((reel, ri) => (
                                                <span key={ri} className="text-lg">{reel[1]}</span>
                                            ))}
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-bold text-xs ${game.isWin ? 'text-green-400' : 'text-gray-400'}`}>
                                                {game.isWin ? '+' : '-'}
                                                {formatCurrency(game.isWin ? game.payout : parseFloat(betAmount) * lines, selectedCurrency)}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>

                    <Card className="p-6 bg-dark-200/50 border-white/10">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Paytable</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { symbol: '7️⃣', mult: '100x' },
                                { symbol: '💎', mult: '50x' },
                                { symbol: '🔔', mult: '10x' },
                                { symbol: '🍇', mult: '5x' },
                                { symbol: '🍊', mult: '3x' },
                                { symbol: '🍋', mult: '2x' },
                            ].map((item, i) => (
                                <div key={i} className="flex justify-between items-center p-2 rounded bg-white/5 border border-white/5">
                                    <span className="text-xl">{item.symbol}</span>
                                    <span className="text-xs font-black text-yellow-400">{item.mult}</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    )
}
