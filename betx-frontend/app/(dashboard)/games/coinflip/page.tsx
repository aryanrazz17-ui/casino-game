'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSocket } from '@/hooks/useSocket'
import { useWallet } from '@/hooks/useWallet'
import { formatCurrency, generateClientSeed } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Coin from '@/components/games/coinflip/Coin'
import toast from 'react-hot-toast'
import { ArrowLeft, History, ShieldCheck, Zap } from 'lucide-react'
import Link from 'next/link'

interface GameState {
    isPlaying: boolean
    result?: 'heads' | 'tails'
    history: string[]
}

export default function CoinflipGame() {
    const { socket, isConnected } = useSocket('/coinflip')
    const { currentWallet, selectedCurrency, fetchWallets } = useWallet()

    // Game State
    const [choice, setChoice] = useState<'heads' | 'tails'>('heads')
    const [betAmount, setBetAmount] = useState<string>('10')
    const [gameState, setGameState] = useState<GameState>({
        isPlaying: false,
        result: undefined,
        history: []
    })

    const handlePlay = () => {
        if (!socket || !isConnected) return toast.error('Check your connection')
        const amount = Number(betAmount)
        if (amount <= 0) return toast.error('Invalid bet amount')
        if (!currentWallet || currentWallet.balance < amount) return toast.error('Insufficient balance')

        setGameState(prev => ({ ...prev, isPlaying: true, result: undefined }))

        socket.emit('coinflip:play', {
            betAmount: amount,
            choice,
            currency: selectedCurrency,
            clientSeed: generateClientSeed()
        }, (response: any) => {
            if (response.success) {
                const result = response.data.result
                const isWin = response.data.isWin
                const payout = response.data.payout

                setTimeout(() => {
                    setGameState(prev => ({
                        isPlaying: false,
                        result,
                        history: [result, ...prev.history].slice(0, 10)
                    }))

                    fetchWallets()

                    if (isWin) {
                        toast.success(`You won! +${formatCurrency(payout, selectedCurrency)}`)
                    }
                }, 2000)
            } else {
                setGameState(prev => ({ ...prev, isPlaying: false }))
                toast.error(response.message || 'Game failed')
            }
        })
    }

    const quickBets = [10, 50, 100, 500, 1000]

    return (
        <div className="min-h-screen bg-[#0a0a0f] p-4 pb-24">
            <div className="max-w-6xl mx-auto flex items-center justify-between mb-8">
                <Link href="/games" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                    <ArrowLeft size={20} />
                    Back to Lobby
                </Link>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-sm text-gray-400">
                        <ShieldCheck size={14} className="text-green-500" />
                        Provably Fair
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="min-h-[500px] flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-b from-zinc-900 to-black border-zinc-800">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-900/10 rounded-full blur-[100px]" />

                        <div className="relative z-10 w-full text-center">
                            <Coin isFlipping={gameState.isPlaying} result={gameState.result} />

                            <AnimatePresence>
                                {!gameState.isPlaying && gameState.result && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className={`text-4xl font-black uppercase tracking-widest ${gameState.result === choice ? 'text-green-500' : 'text-zinc-500'}`}
                                    >
                                        {gameState.result === choice ? 'You Won!' : 'Better Luck!'}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </Card>

                    <Card className="p-6 bg-zinc-900/50 border-zinc-800">
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <label className="text-sm text-gray-400 font-medium tracking-wider uppercase">Bet Amount</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={betAmount}
                                        onChange={(e) => setBetAmount(e.target.value)}
                                        className="w-full bg-black border border-zinc-700 rounded-xl py-4 pl-4 pr-4 text-xl font-bold text-white focus:outline-none focus:border-primary-500 transition-colors"
                                    />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {quickBets.map(amt => (
                                        <button
                                            key={amt}
                                            onClick={() => setBetAmount(amt.toString())}
                                            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-medium transition-colors"
                                        >
                                            {amt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-sm text-gray-400 font-medium tracking-wider uppercase">Choose Side</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setChoice('heads')}
                                        className={`relative p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 touch-manipulation ${choice === 'heads'
                                            ? 'border-yellow-500 bg-yellow-500/10'
                                            : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50'
                                            }`}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-yellow-500 border-2 border-yellow-300" />
                                        <span className={`font-bold ${choice === 'heads' ? 'text-yellow-500' : 'text-gray-400'}`}>HEADS</span>
                                    </button>

                                    <button
                                        onClick={() => setChoice('tails')}
                                        className={`relative p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 touch-manipulation ${choice === 'tails'
                                            ? 'border-zinc-400 bg-zinc-400/10'
                                            : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50'
                                            }`}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-zinc-400 border-2 border-zinc-200" />
                                        <span className={`font-bold ${choice === 'tails' ? 'text-white' : 'text-gray-400'}`}>TAILS</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <Button
                            onClick={handlePlay}
                            disabled={gameState.isPlaying || Number(betAmount) <= 0 || !isConnected}
                            className={`w-full mt-6 py-6 text-xl font-black uppercase tracking-wider shadow-xl transition-all ${gameState.isPlaying
                                ? 'bg-zinc-800 text-zinc-500'
                                : 'bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 hover:scale-[1.02]'
                                }`}
                        >
                            {gameState.isPlaying ? 'Flipping...' : 'Flip Coin'}
                        </Button>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="p-6 bg-zinc-900/50 border-zinc-800 space-y-4">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <Zap className="text-yellow-400" size={18} /> Game Info
                        </h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between text-gray-400">
                                <span>Multiplier</span>
                                <span className="text-white font-mono">1.98x</span>
                            </div>
                            <div className="flex justify-between text-gray-400">
                                <span>House Edge</span>
                                <span className="text-white font-mono">2%</span>
                            </div>
                            <div className="flex justify-between text-gray-400">
                                <span>Status</span>
                                <span className={`font-bold ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
                                    {isConnected ? 'ONLINE' : 'OFFLINE'}
                                </span>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 bg-zinc-900/50 border-zinc-800">
                        <h3 className="font-bold text-lg flex items-center gap-2 mb-4">
                            <History className="text-primary-400" size={18} /> Recent Flips
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {gameState.history.length === 0 && <span className="text-gray-500 text-sm">No recent games</span>}
                            {gameState.history.map((res, i) => (
                                <div
                                    key={i}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 shadow-sm ${res === 'heads'
                                        ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500'
                                        : 'bg-zinc-500/20 border-zinc-400 text-zinc-300'
                                        }`}
                                >
                                    {res === 'heads' ? 'H' : 'T'}
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    )
}
