'use client'

import { useState, useCallback, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useSocket } from '@/hooks/useSocket'
import { useWallet } from '@/hooks/useWallet'
import { KenoBoard } from '@/components/games/KenoBoard'
import { KENO_PAYOUTS } from '@/lib/keno-payouts'
import { formatCurrency, generateClientSeed, cn } from '@/lib/utils'
import { Grid, History as HistoryIcon, Shield, Zap, Trash2, Wand2, Trophy, Coins } from 'lucide-react'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

export default function KenoPage() {
    const { socket, isConnected } = useSocket('/keno')
    const { currentWallet, selectedCurrency, fetchWallets } = useWallet()

    const [betAmount, setBetAmount] = useState('100')
    const [selectedNumbers, setSelectedNumbers] = useState<number[]>([])
    const [isDrawing, setIsDrawing] = useState(false)
    const [drawnNumbers, setDrawnNumbers] = useState<number[]>([])
    const [hits, setHits] = useState<number[]>([])
    const [history, setHistory] = useState<any[]>([])
    const [lastGame, setLastGame] = useState<any>(null)

    const handleToggleNumber = (num: number) => {
        if (selectedNumbers.includes(num)) {
            setSelectedNumbers(prev => prev.filter(n => n !== num))
        } else {
            if (selectedNumbers.length >= 10) {
                toast.error('Maximum 10 numbers allowed')
                return
            }
            setSelectedNumbers(prev => [...prev, num])
        }
        // Reset board if new game starts being prepared
        if (drawnNumbers.length > 0) {
            setDrawnNumbers([])
            setHits([])
        }
    }

    const handleAutoPick = () => {
        const pool = Array.from({ length: 40 }, (_, i) => i + 1)
        const shuffled = pool.sort(() => 0.5 - Math.random())
        setSelectedNumbers(shuffled.slice(0, 10))
        setDrawnNumbers([])
        setHits([])
    }

    const handleClear = () => {
        setSelectedNumbers([])
        setDrawnNumbers([])
        setHits([])
    }

    const handlePlay = async () => {
        if (!socket || !isConnected) {
            toast.error('Not connected to game server')
            return
        }

        const amount = parseFloat(betAmount)
        if (isNaN(amount) || amount <= 0) {
            toast.error('Invalid bet amount')
            return
        }

        if (selectedNumbers.length === 0) {
            toast.error('Select at least 1 number')
            return
        }

        if (!currentWallet || currentWallet.balance < amount) {
            toast.error('Insufficient balance')
            return
        }

        setIsDrawing(true)
        setDrawnNumbers([])
        setHits([])
        setLastGame(null)

        socket.emit('keno:play', {
            betAmount: amount,
            selectedNumbers,
            currency: selectedCurrency,
            clientSeed: generateClientSeed()
        }, async (response: any) => {
            if (response.success) {
                const { draw, hits: winHits, isWin, payout, balance, multiplier } = response.data

                // Animation: Show numbers one by one
                for (let i = 0; i < draw.length; i++) {
                    await new Promise(resolve => setTimeout(resolve, 150))
                    setDrawnNumbers(prev => [...prev, draw[i]])
                    if (selectedNumbers.includes(draw[i])) {
                        setHits(prev => [...prev, draw[i]])
                    }
                }

                setIsDrawing(false)
                setLastGame(response.data)
                setHistory(prev => [response.data, ...prev].slice(0, 10))

                if (isWin) {
                    toast.success(`Victory! Won ${formatCurrency(payout, selectedCurrency)}`, { icon: '🏆' })
                }

                fetchWallets()
            } else {
                setIsDrawing(false)
                toast.error(response.message || 'Game error')
            }
        })
    }

    const currentPayouts = KENO_PAYOUTS[selectedNumbers.length] || {}

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-primary-500/20 rounded-2xl">
                            <Grid className="w-8 h-8 text-primary-400" />
                        </div>
                        <h1 className="text-4xl font-black tracking-tight uppercase">Keno</h1>
                    </div>
                    <p className="text-gray-400">Select up to 10 numbers and match the draw to win big!</p>
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
                    <Card className="p-4 md:p-8 bg-dark-200/50 border-white/10 shadow-2xl relative overflow-hidden">
                        {/* Background Glows */}
                        <div className="absolute top-0 left-0 w-96 h-96 bg-primary-500/5 blur-[120px] pointer-events-none" />
                        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/5 blur-[120px] pointer-events-none" />

                        <div className="relative z-10 flex flex-col items-center">
                            {/* Stats Bar */}
                            <div className="w-full flex justify-between items-center mb-6 px-4 py-3 bg-white/5 rounded-xl border border-white/5">
                                <div className="flex items-center gap-2">
                                    <div className="px-3 py-1 bg-primary-500/20 text-primary-400 rounded-lg text-xs font-bold uppercase tracking-wider">
                                        Picks: {selectedNumbers.length}/10
                                    </div>
                                    <div className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-xs font-bold uppercase tracking-wider">
                                        Hits: {hits.length}
                                    </div>
                                </div>
                                {lastGame && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-lg font-black text-white"
                                    >
                                        Multiplier: <span className="text-primary-400">{lastGame.multiplier}x</span>
                                    </motion.div>
                                )}
                            </div>

                            {/* Board */}
                            <KenoBoard
                                selectedNumbers={selectedNumbers}
                                onToggleNumber={handleToggleNumber}
                                drawnNumbers={drawnNumbers}
                                hits={hits}
                                isDrawing={isDrawing}
                            />

                            {/* Payout Table visualization */}
                            <div className="w-full mt-8 overflow-x-auto pb-4">
                                <div className="flex gap-2 min-w-max">
                                    {Object.entries(currentPayouts).map(([hit, mult]) => (
                                        <div
                                            key={hit}
                                            className={cn(
                                                "flex flex-col items-center p-3 rounded-xl border transition-all min-w-[80px]",
                                                hits.length === parseInt(hit) && !isDrawing
                                                    ? "bg-green-500/20 border-green-500 scale-110 shadow-lg shadow-green-500/20"
                                                    : "bg-white/5 border-white/5 opacity-60"
                                            )}
                                        >
                                            <span className="text-[10px] uppercase font-bold text-gray-400">{hit} Hits</span>
                                            <span className="text-lg font-black text-white">{mult}x</span>
                                        </div>
                                    ))}
                                    {Object.keys(currentPayouts).length === 0 && (
                                        <div className="w-full py-4 text-center text-gray-500 font-medium italic">
                                            Select numbers to see potential payouts
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Features */}
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="p-4 bg-dark-200/50 border-white/10 flex items-center gap-4">
                            <div className="p-2 bg-yellow-500/20 rounded-lg">
                                <Trophy className="w-5 h-5 text-yellow-500" />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold uppercase text-gray-400">Max Win</h4>
                                <p className="text-sm font-black">4,000x Payout</p>
                            </div>
                        </Card>
                        <Card className="p-4 bg-dark-200/50 border-white/10 flex items-center gap-4">
                            <div className="p-2 bg-blue-500/20 rounded-lg">
                                <Zap className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold uppercase text-gray-400">Fast Draws</h4>
                                <p className="text-sm font-black">Instant Results</p>
                            </div>
                        </Card>
                        <Card className="p-4 bg-dark-200/50 border-white/10 flex items-center gap-4">
                            <div className="p-2 bg-green-500/20 rounded-lg">
                                <Shield className="w-5 h-5 text-green-500" />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold uppercase text-gray-400">Fairness</h4>
                                <p className="text-sm font-black">SHA-256 Verified</p>
                            </div>
                        </Card>
                    </div>
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
                                    <span className="text-[10px] text-primary-400 font-bold">Balance: {formatCurrency(currentWallet?.balance || 0, selectedCurrency)}</span>
                                </div>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        value={betAmount}
                                        onChange={(e) => setBetAmount(e.target.value)}
                                        className="pl-12 h-14 bg-dark-400/50 border-white/5 font-bold text-lg"
                                        placeholder="0.00"
                                        disabled={isDrawing}
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
                                            disabled={isDrawing}
                                            className="py-2 text-[10px] font-black rounded-lg bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
                                        >
                                            {amt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="grid grid-cols-2 gap-3">
                                <Button
                                    variant="ghost"
                                    onClick={handleAutoPick}
                                    disabled={isDrawing}
                                    className="border-white/5 bg-white/5 hover:bg-white/10 h-12 flex gap-2"
                                >
                                    <Wand2 className="w-4 h-4" />
                                    Auto Pick
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={handleClear}
                                    disabled={isDrawing}
                                    className="border-white/5 bg-white/5 hover:bg-white/10 h-12 flex gap-2"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Clear
                                </Button>
                            </div>

                            {/* Play Button */}
                            <Button
                                onClick={handlePlay}
                                disabled={!isConnected || isDrawing || selectedNumbers.length === 0}
                                className="w-full h-20 text-xl font-black uppercase tracking-tighter bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 shadow-xl shadow-primary-500/20 active:scale-95 transition-all"
                            >
                                {isDrawing ? (
                                    <div className="flex items-center gap-3">
                                        <Zap className="w-6 h-6 animate-bounce" />
                                        Drawing...
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <span>Play Keno</span>
                                        <span className="text-[10px] font-medium opacity-50 tracking-normal mt-1">Select 1-10 numbers</span>
                                    </div>
                                )}
                            </Button>
                        </div>
                    </Card>

                    {/* Simple History */}
                    <Card className="p-6 bg-dark-200/50 border-white/10">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold flex items-center gap-2 text-sm">
                                <HistoryIcon className="w-4 h-4 text-gray-400" />
                                Recent Games
                            </h3>
                            <Coins className="w-4 h-4 text-yellow-500" />
                        </div>
                        <div className="space-y-3">
                            {history.length === 0 ? (
                                <p className="text-gray-500 text-xs py-8 text-center w-full bg-white/5 rounded-lg border border-dashed border-white/10">No games played yet</p>
                            ) : (
                                history.map((game, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5"
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-gray-400">{game.hitsCount} Hits</span>
                                            <span className="text-[10px] text-gray-500">Pick {game.result?.selectedNumbers?.length || 0}</span>
                                        </div>
                                        <div className="text-right">
                                            <div className={cn("font-black text-sm", game.isWin ? "text-green-400" : "text-gray-500")}>
                                                {game.isWin ? `+${formatCurrency(game.payout, selectedCurrency)}` : `-${formatCurrency(game.bet_amount || 0, selectedCurrency)}`}
                                            </div>
                                            <div className="text-[10px] font-bold opacity-50">{game.multiplier}x</div>
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
