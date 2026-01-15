'use client'

import { useState } from 'react'
import { useSocket } from '@/hooks/useSocket'
import { useWallet } from '@/hooks/useWallet'
import { formatCurrency, generateClientSeed } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Wheel from '@/components/games/wheel/Wheel'
import toast from 'react-hot-toast'
import { ArrowLeft, History, ShieldCheck, Zap, Info } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

interface GameState {
    isPlaying: boolean
    segmentIndex?: number
    history: { multiplier: number; isWin: boolean }[]
}

export default function WheelGame() {
    const { socket, isConnected } = useSocket('/wheel')
    const { currentWallet, selectedCurrency, fetchWallets } = useWallet()

    // Game State
    const [risk, setRisk] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('LOW')
    const [betAmount, setBetAmount] = useState<string>('10')
    const [gameState, setGameState] = useState<GameState>({
        isPlaying: false,
        segmentIndex: undefined,
        history: []
    })
    const [showResult, setShowResult] = useState(false)
    const [lastGame, setLastGame] = useState<any>(null)

    const handleSpin = () => {
        if (!socket || gameState.isPlaying || !isConnected) return
        const amount = Number(betAmount)
        if (amount <= 0) return toast.error('Invalid bet amount')
        if (!currentWallet || currentWallet.balance < amount) return toast.error('Insufficient balance')

        setShowResult(false)
        setGameState(prev => ({ ...prev, isPlaying: true, segmentIndex: undefined }))

        socket.emit('wheel:spin', {
            betAmount: amount,
            risk,
            currency: selectedCurrency,
            clientSeed: generateClientSeed()
        }, (response: any) => {
            if (response.success) {
                setGameState(prev => ({
                    ...prev,
                    segmentIndex: response.data.result
                }))
                setLastGame(response.data)
            } else {
                setGameState(prev => ({ ...prev, isPlaying: false }))
                toast.error(response.message || 'Game failed')
            }
        })
    }

    const onAnimationComplete = () => {
        setGameState(prev => ({
            ...prev,
            isPlaying: false,
            history: [{ multiplier: lastGame.multiplier, isWin: lastGame.isWin }, ...prev.history].slice(0, 10)
        }))
        setShowResult(true)
        fetchWallets()

        if (lastGame.isWin) {
            toast.success(`Win! ${lastGame.multiplier}x Payout: ${formatCurrency(lastGame.payout, selectedCurrency)}`)
        } else {
            toast.error('Better luck next time!')
        }
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

                        <div className="relative z-10 w-full flex flex-col items-center">
                            <Wheel
                                isSpinning={gameState.isPlaying && gameState.segmentIndex === undefined}
                                segmentIndex={gameState.segmentIndex}
                                risk={risk}
                                onAnimationComplete={onAnimationComplete}
                            />

                            <AnimatePresence>
                                {showResult && lastGame && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.5 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="mt-8 text-center"
                                    >
                                        <div className={`text-6xl font-black ${lastGame.isWin ? 'text-green-500' : 'text-zinc-500'} drop-shadow-lg mb-2`}>
                                            {lastGame.multiplier}x
                                        </div>
                                        <div className="text-xl font-bold text-gray-400 uppercase tracking-widest leading-none">
                                            {lastGame.isWin ? 'Winner!' : 'No Luck'}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </Card>

                    <Card className="p-6 bg-zinc-900/50 border-zinc-800">
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Bet Amount</label>
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
                                <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Risk Level</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['LOW', 'MEDIUM', 'HIGH'] as const).map((r) => (
                                        <button
                                            key={r}
                                            disabled={gameState.isPlaying}
                                            onClick={() => setRisk(r)}
                                            className={`py-3 rounded-xl border-2 font-bold transition-all text-xs ${risk === r
                                                    ? r === 'LOW' ? 'border-green-500 bg-green-500/10 text-green-500'
                                                        : r === 'MEDIUM' ? 'border-yellow-500 bg-yellow-500/10 text-yellow-500'
                                                            : 'border-red-500 bg-red-500/10 text-red-500'
                                                    : 'border-zinc-700 bg-zinc-800/50 text-gray-500'
                                                }`}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                                    <Info size={10} />
                                    {risk === 'LOW' ? 'Safe but small' : risk === 'MEDIUM' ? 'Balanced' : 'High stakes 50x'}
                                </p>
                            </div>
                        </div>

                        <Button
                            onClick={handleSpin}
                            disabled={gameState.isPlaying || Number(betAmount) <= 0 || !isConnected}
                            className={`w-full mt-6 py-6 text-xl font-black uppercase tracking-wider shadow-xl transition-all ${gameState.isPlaying
                                    ? 'bg-zinc-800 text-zinc-500'
                                    : 'bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 hover:scale-[1.02]'
                                }`}
                        >
                            {gameState.isPlaying ? 'Spinning...' : 'Spin Wheel'}
                        </Button>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="p-6 bg-zinc-900/50 border-zinc-800 space-y-4">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <Zap className="text-yellow-400" size={18} /> Paytable
                        </h3>
                        <div className="grid grid-cols-5 gap-1">
                            {[1.2, 1.5, 2, 3, 5, 10, 50].map(m => (
                                <div key={m} className="bg-zinc-800/50 border border-zinc-700 rounded p-1 text-center">
                                    <div className="text-[9px] text-zinc-500 tracking-tighter uppercase font-bold">Mult</div>
                                    <div className="text-xs font-black text-white">{m}x</div>
                                </div>
                            ))}
                        </div>
                        <p className="text-[11px] text-zinc-500 leading-relaxed pt-2">
                            Multipliers are distributed across 10 segments based on risk level. Higher risk has more 0x but massive top prizes.
                        </p>
                    </Card>

                    <Card className="p-6 bg-zinc-900/50 border-zinc-800">
                        <h3 className="font-bold text-lg flex items-center gap-2 mb-4">
                            <History className="text-primary-400" size={18} /> Recent Spins
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {gameState.history.length === 0 && <span className="text-gray-500 text-sm">No recent games</span>}
                            {gameState.history.map((game, i) => (
                                <div
                                    key={i}
                                    className={`px-3 py-1 rounded-full border-2 text-xs font-black ${game.isWin
                                            ? 'bg-green-500/10 border-green-500/30 text-green-400'
                                            : 'bg-zinc-500/10 border-zinc-800 text-zinc-500'
                                        }`}
                                >
                                    {game.multiplier}x
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    )
}
