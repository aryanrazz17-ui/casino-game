'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useSocket } from '@/hooks/useSocket'
import { useWallet } from '@/hooks/useWallet'
import { formatCurrency } from '@/lib/utils'
import { Target, Timer, History, Trophy, TrendingUp, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { AnimatePresence, motion } from 'framer-motion'
// @ts-ignore
import Confetti from 'react-confetti'
import { FairnessVerifier } from '@/components/games/FairnessVerifier'
import { Shield } from 'lucide-react'

// Types
type GameState = {
    roundId: number
    status: 'betting' | 'processing' | 'result'
    timeLeft: number
    history: GameResult[]
    currentBets: Bet[]
    nextPhase: number
}

type GameResult = {
    number: number
    colors: string[]
    size: 'big' | 'small'
    hash: string
    roundId: number
}

type Bet = {
    userId: string
    username: string
    amount: number
    type: 'color' | 'size'
    value: string
    timestamp: number
}

export default function ColorPredictionPage() {
    const { socket, isConnected } = useSocket('/color-prediction')
    const { currentWallet, selectedCurrency, fetchWallets } = useWallet()

    // Game State
    const [gameState, setGameState] = useState<GameState | null>(null)
    const [lastResult, setLastResult] = useState<GameResult | null>(null)

    // User Input
    const [betAmount, setBetAmount] = useState('100')
    const [activeTab, setActiveTab] = useState<'color' | 'size'>('color')
    const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null)
    const [isBetting, setIsBetting] = useState(false)
    const [myBets, setMyBets] = useState<Bet[]>([])
    const [isFairnessModalOpen, setIsFairnessModalOpen] = useState(false)

    // Listeners
    useEffect(() => {
        if (!socket) return

        socket.on('color:state', (state: GameState) => {
            setGameState(state)
            if (state.history.length > 0) {
                setLastResult(state.history[0])
            }
        })

        // Request initial state immediately
        socket.emit('getColorState')

        socket.on('timer', (time: number) => {
            setGameState(prev => prev ? { ...prev, timeLeft: time } : null)
        })

        socket.on('status', (status: 'betting' | 'processing' | 'result') => {
            setGameState(prev => prev ? { ...prev, status } : null)
            if (status === 'processing') {
                setSelectedPrediction(null) // Reset selection
            }
        })

        socket.on('result', (result: any) => {
            setLastResult(result)
            setGameState(prev => prev ? { ...prev, status: 'result' } : null)
            fetchWallets()
        })

        socket.on('newRound', (data: any) => {
            setMyBets([])
            setLastResult(null)
            setGameState(prev => prev ? {
                ...prev,
                status: 'betting',
                roundId: data.roundId,
                timeLeft: data.timeLeft
            } : null)
        })

        socket.on('betConfirmed', (bet: Bet) => {
            setMyBets(prev => [bet, ...prev])
            toast.success('Bet Placed!')
            setIsBetting(false)
        })

        socket.on('connect', () => {
            socket.emit('getColorState')
        })

        socket.on('error', (err: any) => {
            toast.error(err.message)
            setIsBetting(false)
        })

        return () => {
            socket.off('gameState')
            socket.off('color:state')
            socket.off('timer')
            socket.off('status')
            socket.off('result')
            socket.off('newRound')
            socket.off('betConfirmed')
            socket.off('error')
            socket.off('connect')
        }
    }, [socket, fetchWallets])

    const handleBet = () => {
        if (!socket || !isConnected) return
        if (!selectedPrediction) return toast.error('Select a prediction first')

        const amount = parseFloat(betAmount)
        if (isNaN(amount) || amount <= 0) return toast.error('Invalid amount')
        if (gameState?.status !== 'betting') return toast.error('Round is closed')

        setIsBetting(true)
        socket.emit('placeBet', {
            type: activeTab,
            value: selectedPrediction,
            amount: amount,
            currency: selectedCurrency
        })

    }

    // Helpers
    const getColorClass = (color: string) => {
        switch (color) {
            case 'green': return 'bg-emerald-500 text-white'
            case 'red': return 'bg-red-500 text-white'
            case 'violet': return 'bg-violet-500 text-white'
            default: return 'bg-gray-500'
        }
    }

    // Gradient for mixed balls (0 and 5)
    const getBallGradient = (number: number) => {
        if (number === 0) return 'bg-gradient-to-r from-red-500 to-violet-500' // Red + Violet
        if (number === 5) return 'bg-gradient-to-r from-emerald-500 to-violet-500' // Green + Violet

        if ([1, 3, 7, 9].includes(number)) return 'bg-emerald-500'
        if ([2, 4, 6, 8].includes(number)) return 'bg-red-500'
        return 'bg-gray-500'
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-700 min-h-screen">






            {/* Header */}
            {!gameState ? (
                <div className="flex h-[50vh] w-full items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
                        <div className="text-sm font-bold uppercase tracking-widest text-gray-500">Connecting to Game Server...</div>
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-3 bg-pink-500/20 rounded-2xl">
                                    <Target className="w-8 h-8 text-pink-400" />
                                </div>
                                <h1 className="text-4xl font-black tracking-tight uppercase">Color Prediction</h1>
                            </div>
                            <p className="text-gray-400">Join Green, Violet, Red to win huge!</p>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsFairnessModalOpen(true)}
                                className="glass px-4 py-2 rounded-xl border border-white/5 flex items-center gap-2 hover:bg-white/5 transition-colors"
                            >
                                <Shield className="w-4 h-4 text-green-400" />
                                <span className="text-sm font-medium text-gray-300">Unfair? Verify Here</span>
                            </button>

                            <div className="glass px-4 py-2 rounded-xl border border-white/5 flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                                    <span className="text-sm font-medium text-gray-300">Live Round: #{gameState?.roundId.toString().slice(-6)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <FairnessVerifier
                        isOpen={isFairnessModalOpen}
                        onClose={() => setIsFairnessModalOpen(false)}
                        gameType="color-prediction"
                        initialNonce={gameState?.roundId}
                    />

                    <div className="grid lg:grid-cols-12 gap-6">

                        {/* GAME INFO & HISTORY */}
                        <div className="lg:col-span-8 space-y-6">

                            {/* Timer & History Card */}
                            <Card className="p-8 bg-dark-200/50 border-white/10 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/5 blur-[100px] pointer-events-none" />

                                <div className="flex flex-col md:flex-row items-center justify-between gap-8">

                                    {/* Countdown */}
                                    <div className="text-center relative z-10 w-full md:w-auto">
                                        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Time Remaining</div>
                                        <div className={`text-5xl md:text-6xl font-black tabular-nums transition-colors ${(gameState?.timeLeft || 0) <= 5 ? 'text-red-500 animate-pulse' : 'text-white'
                                            }`}>
                                            {gameState?.status === 'betting'
                                                ? `00:${(gameState?.timeLeft || 0).toString().padStart(2, '0')}`
                                                : gameState?.status === 'processing'
                                                    ? 'DRAWING'
                                                    : 'ENDED'
                                            }
                                        </div>
                                        <div className="text-xs font-medium text-gray-400 mt-2">
                                            {gameState?.status === 'betting' ? 'Place your bets' : 'Calculating results...'}
                                        </div>
                                    </div>

                                    {/* Previous Results (Balls) */}
                                    <div className="flex-1 overflow-hidden">
                                        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <History className="w-4 h-4" /> History
                                        </div>
                                        <div className="flex gap-3 overflow-x-auto pb-2 noscrollbar">
                                            {gameState?.history.slice(0, 10).map((res, i) => (
                                                <div key={i} className="flex flex-col items-center gap-1 shrink-0">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-lg border-2 border-white/10 ${getBallGradient(res.number)}`}>
                                                        {res.number}
                                                    </div>
                                                    <div className="text-[10px] uppercase font-bold text-gray-500">{res.size && res.size.charAt(0)}</div>
                                                </div>
                                            ))}
                                            {(!gameState?.history || gameState.history.length === 0) && (
                                                <div className="text-sm text-gray-500 italic">No history yet</div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Recent Result/Loading Overlay */}
                                <AnimatePresence>
                                    {(lastResult && gameState?.status === 'result') && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.5 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="absolute inset-0 bg-dark-900/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center"
                                        >
                                            <Confetti numberOfPieces={200} recycle={false} />
                                            <div className="text-2xl font-black text-white uppercase mb-4">Winner</div>
                                            <div className={`w-32 h-32 rounded-full flex items-center justify-center text-8xl font-black text-white shadow-2xl border-8 border-white/20 ${getBallGradient(lastResult.number)}`}>
                                                {lastResult.number}
                                            </div>
                                            <div className="mt-4 flex gap-4">
                                                <div className="px-4 py-2 rounded-full bg-white/10 font-bold uppercase">{lastResult.colors.join(' & ')}</div>
                                                <div className="px-4 py-2 rounded-full bg-white/10 font-bold uppercase">{lastResult.size}</div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </Card>

                            {/* Betting Controls */}
                            <Card className="p-6 bg-dark-200/50 border-white/10">
                                {/* Tabs */}
                                <div className="flex bg-dark-400/50 p-1 rounded-xl mb-6 w-full md:w-1/2 mx-auto">
                                    <button
                                        onClick={() => { setActiveTab('color'); setSelectedPrediction(null); }}
                                        className={`flex-1 py-2 rounded-lg text-sm font-bold uppercase transition-all ${activeTab === 'color' ? 'bg-primary-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        Color
                                    </button>
                                    <button
                                        onClick={() => { setActiveTab('size'); setSelectedPrediction(null); }}
                                        className={`flex-1 py-2 rounded-lg text-sm font-bold uppercase transition-all ${activeTab === 'size' ? 'bg-primary-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        Big / Small
                                    </button>
                                </div>

                                {/* Bet Options */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                    {activeTab === 'color' ? (
                                        <>
                                            <button
                                                onClick={() => setSelectedPrediction('green')}
                                                className={`h-24 rounded-2xl bg-emerald-500/10 border-2 flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 ${selectedPrediction === 'green' ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'border-emerald-500/30'}`}
                                            >
                                                <div className="text-2xl font-black text-emerald-500">JOIN GREEN</div>
                                                <div className="text-xs font-bold text-emerald-400/70">X2</div>
                                            </button>
                                            <button
                                                onClick={() => setSelectedPrediction('violet')}
                                                className={`h-24 rounded-2xl bg-violet-500/10 border-2 flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 ${selectedPrediction === 'violet' ? 'border-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.3)]' : 'border-violet-500/30'}`}
                                            >
                                                <div className="text-2xl font-black text-violet-500">JOIN VIOLET</div>
                                                <div className="text-xs font-bold text-violet-400/70">X4.5</div>
                                            </button>
                                            <button
                                                onClick={() => setSelectedPrediction('red')}
                                                className={`h-24 rounded-2xl bg-red-500/10 border-2 flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 ${selectedPrediction === 'red' ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]' : 'border-red-500/30'}`}
                                            >
                                                <div className="text-2xl font-black text-red-500">JOIN RED</div>
                                                <div className="text-xs font-bold text-red-400/70">X2</div>
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <div /> {/* Spacer */}
                                            <div className="grid grid-cols-2 gap-4 col-span-1 md:col-start-1 md:col-span-3">
                                                <button
                                                    onClick={() => setSelectedPrediction('big')}
                                                    className={`h-24 rounded-2xl bg-orange-500/10 border-2 flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 ${selectedPrediction === 'big' ? 'border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.3)]' : 'border-orange-500/30'}`}
                                                >
                                                    <div className="text-2xl font-black text-orange-500">BIG</div>
                                                    <div className="text-xs font-bold text-orange-400/70">X2</div>
                                                </button>
                                                <button
                                                    onClick={() => setSelectedPrediction('small')}
                                                    className={`h-24 rounded-2xl bg-blue-500/10 border-2 flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 ${selectedPrediction === 'small' ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'border-blue-500/30'}`}
                                                >
                                                    <div className="text-2xl font-black text-blue-500">SMALL</div>
                                                    <div className="text-xs font-bold text-blue-400/70">X2</div>
                                                </button>
                                            </div>
                                            <div /> {/* Spacer */}
                                        </>
                                    )}
                                </div>

                                {/* Amount & Action */}
                                <div className="space-y-4 max-w-xl mx-auto">
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">
                                            Bet Amount
                                        </label>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                value={betAmount}
                                                onChange={(e) => setBetAmount(e.target.value)}
                                                className="pl-12 h-14 bg-dark-400/50 border-white/5 font-bold text-lg text-center"
                                                placeholder="0.00"
                                            />
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-400 font-bold">
                                                {selectedCurrency === 'INR' ? '₹' : '₿'}
                                            </div>
                                        </div>
                                        <div className="flex justify-center gap-2 mt-3">
                                            {[10, 100, 500, 1000, 5000].map(amt => (
                                                <button key={amt} onClick={() => setBetAmount(amt.toString())} className="px-3 py-1 text-[10px] font-black rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                                                    {amt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <Button
                                        onClick={handleBet}
                                        disabled={
                                            !isConnected ||
                                            isBetting ||
                                            !gameState ||
                                            gameState.status !== 'betting' ||
                                            (gameState?.timeLeft ?? 0) <= 5 || // Lock phase
                                            !selectedPrediction
                                        }
                                        className={`w-full h-16 text-xl font-black uppercase tracking-tighter shadow-xl transition-all ${(!isConnected || isBetting || !gameState || gameState.status !== 'betting' || (gameState?.timeLeft ?? 0) <= 5 || !selectedPrediction)
                                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                            : 'bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 shadow-primary-500/20 active:scale-95'
                                            }`}
                                    >
                                        {isBetting ? 'Processing...' :
                                            (gameState?.timeLeft ?? 0) <= 5 && gameState?.status === 'betting' ? 'Round Locked' :
                                                'Place Bet'}
                                    </Button>
                                </div>
                            </Card>

                            {/* My Bets */}
                            <Card className="p-6 bg-dark-200/50 border-white/10">
                                <h3 className="font-bold uppercase tracking-widest text-sm mb-4 flex items-center gap-2">
                                    <Trophy className="w-4 h-4 text-yellow-500" /> My Bets (Current Round)
                                </h3>
                                {myBets.length > 0 ? (
                                    <div className="space-y-2">
                                        {myBets.map((bet, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                                                <div className="flex items-center gap-3">
                                                    <div className="font-bold text-sm uppercase text-gray-300">{bet.type}</div>
                                                    <div className="font-black text-primary-400 uppercase">{bet.value}</div>
                                                </div>
                                                <div className="font-mono text-white">{formatCurrency(bet.amount, selectedCurrency)}</div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-8 text-center text-gray-500 text-sm">
                                        You haven't placed any bets this round.
                                    </div>
                                )}
                            </Card>
                        </div>

                        {/* SIDEBAR (Rules / Stats) */}
                        <div className="lg:col-span-4 space-y-6">
                            <Card className="p-6 bg-dark-200/50 border-white/10">
                                <div className="flex items-center gap-3 mb-4">
                                    <AlertCircle className="w-5 h-5 text-indigo-400" />
                                    <h3 className="font-bold text-sm uppercase tracking-wider">How to Play</h3>
                                </div>
                                <ul className="space-y-3 text-sm text-gray-400">
                                    <li className="flex gap-2">
                                        <span className="text-emerald-500 font-bold">• Green:</span>
                                        <span>Wins on 1, 3, 7, 9. (x2)</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-red-500 font-bold">• Red:</span>
                                        <span>Wins on 2, 4, 6, 8. (x2)</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-violet-500 font-bold">• Violet:</span>
                                        <span>Wins on 0, 5. (x4.5)</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-orange-500 font-bold">• Big:</span>
                                        <span>Sum 5-9. (x2)</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-blue-500 font-bold">• Small:</span>
                                        <span>Sum 0-4. (x2)</span>
                                    </li>
                                </ul>
                            </Card>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
