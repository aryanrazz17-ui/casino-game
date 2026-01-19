'use client'

import { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useSocket } from '@/hooks/useSocket'
import { useWallet } from '@/hooks/useWallet'
import { formatCurrency } from '@/lib/utils'
// Helper for UUID
const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
import toast from 'react-hot-toast'
import { DollarSign, Clock, ShieldCheck, History } from 'lucide-react'

// Types
type GameState = 'PREPARING' | 'BETTING' | 'DEALING' | 'RESULT'
type BetTarget = 'PLAYER' | 'BANKER' | 'TIE'
type CardData = { hand: string; card: { rank: string; suit: string; isRed: boolean }; index: number; score: number | null }

const SUIT_ICONS: Record<string, string> = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠'
}

export default function BaccaratPage() {
    const { socket, isConnected } = useSocket('/baccarat')
    const { currentWallet, selectedCurrency, fetchWallets } = useWallet()

    // Game State
    const [gameState, setGameState] = useState<GameState>('PREPARING')
    const [timeLeft, setTimeLeft] = useState(0)
    const [roundId, setRoundId] = useState<string | null>(null)
    const [serverHash, setServerHash] = useState<string | null>(null)

    // Betting
    const [betAmount, setBetAmount] = useState('100')
    const [myBets, setMyBets] = useState<{ target: BetTarget; amount: number }[]>([])
    const [totalPools, setTotalPools] = useState({ PLAYER: 0, BANKER: 0, TIE: 0 })

    // Table/Cards
    const [playerCards, setPlayerCards] = useState<any[]>([])
    const [bankerCards, setBankerCards] = useState<any[]>([])
    const [playerScore, setPlayerScore] = useState(0)
    const [bankerScore, setBankerScore] = useState(0)
    const [result, setResult] = useState<{ winner: BetTarget; serverSeed: string } | null>(null)

    // History (local for now)
    const [history, setHistory] = useState<string[]>([])

    // Timer Logic
    useEffect(() => {
        if (timeLeft > 0) {
            const timer = setInterval(() => setTimeLeft(prev => Math.max(0, prev - 1000)), 1000)
            return () => clearInterval(timer)
        }
    }, [timeLeft])

    // Socket Event Listeners
    useEffect(() => {
        if (!socket) return

        socket.on('connect', () => {
            // Request sync handled by server on connection
        })

        socket.on('game-status', (data: any) => {
            setGameState(data.state)
            setRoundId(data.roundId)
            if (data.timeLeft) setTimeLeft(data.timeLeft)
            // If reconnecting mid-game, clear cards if starting new
            if (data.state === 'BETTING') resetTable()
        })

        socket.on('round-start', (data: any) => {
            setGameState('BETTING')
            setRoundId(data.roundId)
            setServerHash(data.hash)
            setTimeLeft(data.timers.betting)
            resetTable()
        })

        socket.on('bet-accepted', (data: any) => {
            const bet = data.bet
            setMyBets(prev => [...prev, { target: bet.target, amount: bet.amount }])
            fetchWallets()
            toast.success(`Bet placed on ${bet.target}`)
        })

        socket.on('bet-update', (data: any) => {
            // In a real app, this aggregates everyone's bets
            // setTotalPools(data.totals)
        })

        socket.on('deal-card', (data: CardData) => {
            setGameState('DEALING')
            if (data.hand === 'PLAYER') {
                setPlayerCards(prev => [...prev, data.card])
                if (data.score !== null) setPlayerScore(data.score)
            } else {
                setBankerCards(prev => [...prev, data.card])
                if (data.score !== null) setBankerScore(data.score)
            }
        })

        socket.on('game-result', (data: any) => {
            setGameState('RESULT')
            setResult({ winner: data.winner, serverSeed: data.serverSeed })
            setPlayerScore(data.playerScore)
            setBankerScore(data.bankerScore)

            // Add history
            setHistory(prev => [data.winner.charAt(0), ...prev].slice(0, 12))

            fetchWallets()

            let myWin = false
            myBets.forEach(bet => {
                if (bet.target === data.winner || (data.winner === 'TIE' && bet.target === 'TIE')) {
                    myWin = true
                }
            })
            if (myWin) toast.success(`You Won! ${data.winner}`)
        })

        return () => {
            socket.off('game-status')
            socket.off('round-start')
            socket.off('bet-accepted')
            socket.off('deal-card')
            socket.off('game-result')
        }
    }, [socket, myBets]) // Added myBets dependency to check win status correctly (though ref is better)

    const resetTable = () => {
        setPlayerCards([])
        setBankerCards([])
        setPlayerScore(0)
        setBankerScore(0)
        setResult(null)
        setMyBets([])
    }

    const placeBet = (target: BetTarget) => {
        if (!socket || !isConnected || gameState !== 'BETTING') return
        const amount = parseFloat(betAmount)
        if (amount <= 0 || !currentWallet || currentWallet.balance < amount) {
            toast.error('Invalid amount or insufficient funds')
            return
        }

        // @ts-ignore - Assuming userId exists on wallet type based on backend
        const uid = currentWallet.userId || currentWallet.user_id;

        socket.emit('place-bet', {
            betId: generateUUID(),
            amount,
            target,
            userId: uid
        })
    }

    // Render Helpers
    const renderCard = (card: any, index: number) => (
        <div key={index} className={`w-16 h-24 md:w-20 md:h-32 bg-white rounded-lg shadow-xl flex flex-col items-center justify-center border-2 ${card.isRed ? 'text-red-600 border-red-200' : 'text-slate-900 border-slate-200'} animate-in zoom-in duration-300`}>
            <span className="text-xl md:text-2xl font-black">{card.rank}</span>
            <span className="text-2xl md:text-4xl">{SUIT_ICONS[card.suit]}</span>
        </div>
    )

    return (
        <div className="space-y-6 animate-in fade-in duration-700 min-h-screen pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black tracking-tight uppercase text-white">Baccarat</h1>
                    <p className="text-gray-400">Punto Banco • Provably Fair</p>
                </div>
                <div className="flex gap-4">
                    <div className="glass px-4 py-2 rounded-xl border border-white/5 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary-400" />
                        <span className="font-mono text-xl text-white">{timeLeft > 0 ? (timeLeft / 1000).toFixed(1) : '0.0'}s</span>
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-6">
                {/* GAME TABLE */}
                <div className="lg:col-span-8 space-y-6">
                    <Card className="p-2 md:p-8 bg-[#1a3c30] border-[#2d5a4a] relative overflow-hidden min-h-[400px] flex flex-col justify-between">
                        {/* Table Marking */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                            <span className="text-9xl font-black text-white">BACCARAT</span>
                        </div>

                        {/* Dealer / Cards Area */}
                        <div className="relative z-10 grid grid-cols-2 gap-8 mt-8">
                            {/* PLAYER HAND */}
                            <div className="flex flex-col items-center">
                                <h3 className="text-blue-400 font-bold uppercase tracking-widest mb-4">Player {playerScore}</h3>
                                <div className="flex gap-2 min-h-[140px]">
                                    {playerCards.map((c, i) => renderCard(c, i))}
                                    {playerCards.length === 0 && gameState === 'BETTING' && (
                                        <div className="w-20 h-32 border-2 border-dashed border-white/20 rounded-lg" />
                                    )}
                                </div>
                            </div>

                            {/* BANKER HAND */}
                            <div className="flex flex-col items-center">
                                <h3 className="text-red-400 font-bold uppercase tracking-widest mb-4">Banker {bankerScore}</h3>
                                <div className="flex gap-2 min-h-[140px]">
                                    {bankerCards.map((c, i) => renderCard(c, i))}
                                    {bankerCards.length === 0 && gameState === 'BETTING' && (
                                        <div className="w-20 h-32 border-2 border-dashed border-white/20 rounded-lg" />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Result Overlay */}
                        {result && (
                            <div className="absolute inset-0 z-20 bg-black/60 flex items-center justify-center backdrop-blur-sm animate-in fade-in">
                                <div className="text-center">
                                    <h2 className={`text-6xl font-black uppercase mb-2 ${result.winner === 'PLAYER' ? 'text-blue-500' : result.winner === 'BANKER' ? 'text-red-500' : 'text-green-500'}`}>
                                        {result.winner} WINS
                                    </h2>
                                    <p className="text-gray-300 font-mono text-xs">Verify: {result.serverSeed.substring(0, 20)}...</p>
                                </div>
                            </div>
                        )}
                    </Card>

                    {/* Bead Road (Simple History) */}
                    <Card className="p-4 bg-dark-200/50">
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {history.map((res, i) => (
                                <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 
                                     ${res === 'P' ? 'bg-blue-500 text-white' : res === 'B' ? 'bg-red-500 text-white' : 'bg-green-500 text-green-900 border border-green-400'}`}>
                                    {res}
                                </div>
                            ))}
                            {history.length === 0 && <span className="text-gray-500 text-xs">No history</span>}
                        </div>
                    </Card>
                </div>

                {/* BETTING CONTROLS */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="p-6 bg-dark-200/50 border-white/10">
                        <div className="space-y-4">
                            {/* Amount Input */}
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Bet Amount</label>
                                <div className="grid grid-cols-4 gap-2 mb-2">
                                    {[10, 50, 100, 500].map(amt => (
                                        <button key={amt} onClick={() => setBetAmount(amt.toString())} className="bg-white/5 hover:bg-white/10 rounded py-1 text-xs font-bold transition-colors">
                                            {amt}
                                        </button>
                                    ))}
                                </div>
                                <Input
                                    type="number"
                                    value={betAmount}
                                    onChange={e => setBetAmount(e.target.value)}
                                    className="bg-black/20"
                                />
                            </div>

                            {/* Betting Buttons */}
                            <div className="space-y-3 pt-4">
                                <Button
                                    onClick={() => placeBet('PLAYER')}
                                    disabled={gameState !== 'BETTING'}
                                    className="w-full h-16 text-lg font-black bg-blue-600 hover:bg-blue-500 flex justify-between items-center px-6"
                                >
                                    <span>PLAYER</span>
                                    <span className="text-sm opacity-70">1:1</span>
                                </Button>

                                <Button
                                    onClick={() => placeBet('TIE')}
                                    disabled={gameState !== 'BETTING'}
                                    className="w-full h-12 text-md font-bold bg-green-700 hover:bg-green-600 flex justify-between items-center px-6"
                                >
                                    <span>TIE</span>
                                    <span className="text-sm opacity-70">8:1</span>
                                </Button>

                                <Button
                                    onClick={() => placeBet('BANKER')}
                                    disabled={gameState !== 'BETTING'}
                                    className="w-full h-16 text-lg font-black bg-red-600 hover:bg-red-500 flex justify-between items-center px-6"
                                >
                                    <span>BANKER</span>
                                    <span className="text-sm opacity-70">0.95:1</span>
                                </Button>
                            </div>

                            {/* Status */}
                            <div className="text-center pt-2">
                                {gameState === 'BETTING' ? (
                                    <span className="text-green-400 font-bold animate-pulse text-sm">BETS OPEN</span>
                                ) : (
                                    <span className="text-red-400 font-bold text-sm">BETS CLOSED</span>
                                )}
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4 bg-dark-200/50">
                        <div className="flex items-center gap-2 mb-2">
                            <ShieldCheck className="w-4 h-4 text-primary-400" />
                            <h3 className="font-bold text-xs uppercase text-gray-400">Provably Fair Info</h3>
                        </div>
                        <div className="text-[10px] space-y-1 text-gray-500 font-mono break-all">
                            <p>Round: {roundId?.substring(0, 8)}...</p>
                            <p>Hash: {serverHash ? serverHash.substring(0, 20) + '...' : 'Waiting...'}</p>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    )
}
