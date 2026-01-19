'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useSocket } from '@/hooks/useSocket'
import { useWallet } from '@/hooks/useWallet'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import { DollarSign, ShieldCheck, ChevronRight, User, LayoutGrid } from 'lucide-react'

// Types
type CardData = { rank: string; suit: string; value: number; index: number; isRed: boolean }
type Hand = { cards: CardData[]; status: 'active' | 'stand' | 'bust' | 'blackjack'; bet: number; result?: string; payout?: number }
type GameState = {
    id: string
    playerHands: Hand[]
    dealerHand: { cards: CardData[]; revealed: boolean }
    activeHandIndex: number
    isComplete: boolean
    betAmount: number
    fairness?: { serverSeedHash: string; clientSeed: string; nonce: number }
}

const SUIT_ICONS: Record<string, string> = {
    Hearts: '♥',
    Diamonds: '♦',
    Clubs: '♣',
    Spades: '♠',
    '?': '?'
}

export default function BlackjackPage() {
    const { socket, isConnected } = useSocket('/blackjack')
    const { currentWallet, fetchWallets } = useWallet()

    // Game State
    const [gameState, setGameState] = useState<GameState | null>(null)
    const [betAmount, setBetAmount] = useState('100')
    const [loading, setLoading] = useState(false)

    // Sync state on connect
    useEffect(() => {
        if (isConnected && socket) {
            socket.emit('blackjack:get-state', (response: any) => {
                if (response.success) {
                    setGameState(response.data)
                }
            })
        }
    }, [isConnected, socket])

    const handleActionResponse = useCallback((response: any) => {
        setLoading(false)
        if (response.success) {
            setGameState(response.data)
            if (response.data.isComplete) {
                fetchWallets()
                // Check results for each hand
                response.data.playerHands.forEach((hand: Hand, idx: number) => {
                    if (hand.result === 'WIN' || hand.result === 'BLACKJACK') {
                        toast.success(`Hand ${idx + 1}: ${hand.result}! Won ${formatCurrency(hand.payout || 0)}`)
                    } else if (hand.result === 'PUSH') {
                        toast(`Hand ${idx + 1}: PUSH (Tie)`)
                    } else if (hand.result === 'LOSE') {
                        toast.error(`Hand ${idx + 1}: LOST`)
                    }
                })
            }
        } else {
            toast.error(response.message || 'Action failed')
        }
    }, [fetchWallets])

    const startRound = () => {
        if (!socket || !isConnected) return
        const amount = parseFloat(betAmount)
        if (isNaN(amount) || amount <= 0) return toast.error('Invalid bet amount')

        setLoading(true)
        socket.emit('blackjack:start', { betAmount: amount }, handleActionResponse)
    }

    const hit = () => {
        if (loading || !socket) return
        setLoading(true)
        socket.emit('blackjack:hit', handleActionResponse)
    }

    const stand = () => {
        if (loading || !socket) return
        setLoading(true)
        socket.emit('blackjack:stand', handleActionResponse)
    }

    const double = () => {
        if (loading || !socket) return
        setLoading(true)
        socket.emit('blackjack:double', handleActionResponse)
    }

    const split = () => {
        if (loading || !socket) return
        setLoading(true)
        socket.emit('blackjack:split', handleActionResponse)
    }

    // Render Helpers
    const PlayingCard = ({ card, hidden = false, index = 0 }: { card: CardData; hidden?: boolean, index?: number }) => (
        <div
            className={`
                relative w-20 h-32 md:w-24 md:h-36 bg-white rounded-lg shadow-xl 
                flex flex-col items-center justify-center border-2 
                transition-all duration-300
                ${hidden ? 'bg-indigo-900 border-indigo-700' : (card.isRed ? 'text-red-600 border-red-200' : 'text-slate-900 border-slate-200')}
                animate-in zoom-in duration-300
            `}
            style={{ marginLeft: index > 0 ? '-3rem' : '0', zIndex: index }}
        >
            {hidden ? (
                <div className="w-full h-full flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-indigo-400/30 rounded-full animate-pulse" />
                </div>
            ) : (
                <>
                    <span className="absolute top-2 left-2 text-sm font-bold">{card.rank}</span>
                    <span className="text-3xl md:text-5xl">{SUIT_ICONS[card.suit]}</span>
                    <span className="absolute bottom-2 right-2 text-sm font-bold rotate-180">{card.rank}</span>
                </>
            )}
        </div>
    )

    const HandValue = ({ cards }: { cards: CardData[] }) => {
        let total = 0
        let faces = 0
        cards.forEach(c => {
            if (c.rank === '?') return
            total += c.value
            if (c.rank === 'A') faces++
        })
        while (total > 21 && faces > 0) {
            total -= 10
            faces--
        }
        return <span className="text-xs font-mono bg-black/40 px-2 py-0.5 rounded text-white">{total === 0 ? '?' : total}</span>
    }

    const activeHand = gameState?.playerHands[gameState.activeHandIndex]
    const canHit = !gameState?.isComplete && activeHand?.status === 'active'
    const canStand = !gameState?.isComplete && activeHand?.status === 'active'
    const canDouble = canHit && activeHand?.cards.length === 2
    const canSplit = canHit && activeHand?.cards.length === 2 && activeHand.cards[0].rank === activeHand.cards[1].rank

    return (
        <div className="space-y-6 animate-in fade-in duration-700 min-h-screen pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black tracking-tight uppercase text-white">Blackjack</h1>
                    <p className="text-gray-400">Beat the Dealer • 3:2 Blackjack Payout</p>
                </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-6">
                {/* GAME TABLE */}
                <div className="lg:col-span-8 space-y-6">
                    <Card className="p-4 md:p-8 bg-[#1a3c30] border-[#2d5a4a] relative overflow-hidden min-h-[500px] flex flex-col justify-between rounded-3xl shadow-2xl">
                        {/* Table Background Decoration */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                            <span className="text-9xl font-black text-white outline-text">CASINO</span>
                        </div>

                        {/* Dealer Area */}
                        <div className="flex flex-col items-center">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2 py-0.5 rounded border border-red-500/30 uppercase tracking-widest">Dealer</span>
                                {gameState && <HandValue cards={gameState.dealerHand.cards} />}
                            </div>
                            <div className="flex min-h-[140px] items-center justify-center">
                                {gameState ? (
                                    gameState.dealerHand.cards.map((c, i) => (
                                        <PlayingCard key={i} card={c} hidden={c.rank === '?'} index={i} />
                                    ))
                                ) : (
                                    <div className="flex gap-2">
                                        <div className="w-24 h-36 border-2 border-dashed border-white/10 rounded-xl" />
                                        <div className="w-24 h-36 border-2 border-dashed border-white/10 rounded-xl" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Player Area */}
                        <div className="flex flex-wrap justify-center gap-12 mt-12 mb-8">
                            {gameState?.playerHands.map((hand, hIdx) => (
                                <div key={hIdx} className={`flex flex-col items-center transition-all duration-500 ${gameState.activeHandIndex === hIdx ? 'scale-110' : 'opacity-60 grayscale-[0.5] scale-90'}`}>
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded border uppercase tracking-widest ${gameState.activeHandIndex === hIdx ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-white/10 text-white/40 border-white/5'}`}>
                                            Hand {hIdx + 1}
                                        </span>
                                        <HandValue cards={hand.cards} />
                                        {hand.status !== 'active' && (
                                            <span className={`text-[10px] font-black px-1.5 rounded ${hand.status === 'bust' ? 'bg-red-500 text-white' : 'bg-yellow-500 text-black'}`}>
                                                {hand.status.toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex min-h-[140px] relative">
                                        {hand.cards.map((c, i) => (
                                            <PlayingCard key={i} card={c} index={i} />
                                        ))}
                                    </div>
                                    <div className="mt-2 text-xs font-mono text-white/40">
                                        Bet: {formatCurrency(hand.bet)}
                                    </div>
                                </div>
                            ))}
                            {!gameState && (
                                <div className="flex flex-col items-center mt-12">
                                    <div className="w-24 h-36 border-2 border-dashed border-white/10 rounded-xl" />
                                    <p className="text-white/20 text-xs mt-4 uppercase font-bold tracking-tighter">Place your bet</p>
                                </div>
                            )}
                        </div>

                        {/* Result Overlay */}
                        {gameState?.isComplete && (
                            <div className="absolute inset-0 z-20 bg-black/40 flex items-center justify-center backdrop-blur-[2px] animate-in fade-in duration-500 rounded-3xl">
                                <div className="text-center bg-dark-200/90 p-8 rounded-3xl border border-white/10 shadow-3xl">
                                    <h2 className="text-4xl font-black uppercase text-white mb-4 italic tracking-tighter">Round Over</h2>
                                    <Button onClick={() => setGameState(null)} variant="primary" className="px-8">New Round</Button>
                                </div>
                            </div>
                        )}
                    </Card>

                    {/* Fairness Info */}
                    {gameState && (
                        <Card className="p-4 bg-dark-200/50 border-white/5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-green-400" />
                                    <h3 className="font-bold text-xs uppercase text-gray-400">Provably Fair Round</h3>
                                </div>
                                <div className="text-[10px] text-gray-500 font-mono">
                                    ID: {gameState.id.substring(0, 8)} | Nonce: {gameState.fairness?.nonce}
                                </div>
                            </div>
                        </Card>
                    )}
                </div>

                {/* BETTING CONTROLS */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="p-6 bg-dark-200/50 border-white/10 backdrop-blur-md rounded-2xl">
                        <div className="space-y-6">
                            {/* Amount Input */}
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">Bet Amount</label>
                                <div className="flex gap-2 mb-3">
                                    {[10, 50, 100, 500].map(amt => (
                                        <button
                                            key={amt}
                                            onClick={() => setBetAmount(amt.toString())}
                                            className="flex-1 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg py-1.5 text-xs font-bold transition-all active:scale-95"
                                        >
                                            {amt}
                                        </button>
                                    ))}
                                </div>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <Input
                                        type="number"
                                        value={betAmount}
                                        onChange={e => setBetAmount(e.target.value)}
                                        className="bg-black/40 pl-9 border-white/10 h-12 text-lg font-bold"
                                        disabled={!!gameState && !gameState.isComplete}
                                    />
                                </div>
                            </div>

                            {/* Game Actions */}
                            <div className="space-y-3">
                                {!gameState || gameState.isComplete ? (
                                    <Button
                                        onClick={startRound}
                                        disabled={loading}
                                        className="w-full h-14 text-lg font-black bg-green-600 hover:bg-green-500 shadow-[0_0_20px_rgba(22,163,74,0.3)] transition-all"
                                    >
                                        PLACE BET
                                    </Button>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3">
                                        <Button
                                            onClick={hit}
                                            disabled={!canHit || loading}
                                            className="h-20 text-xl font-black bg-blue-600 hover:bg-blue-500 flex flex-col items-center justify-center"
                                        >
                                            <ChevronRight className="w-6 h-6 rotate-90" />
                                            <span>HIT</span>
                                        </Button>
                                        <Button
                                            onClick={stand}
                                            disabled={!canStand || loading}
                                            className="h-20 text-xl font-black bg-red-600 hover:bg-red-500 flex flex-col items-center justify-center"
                                        >
                                            <User className="w-6 h-6" />
                                            <span>STAND</span>
                                        </Button>
                                        <Button
                                            onClick={double}
                                            disabled={!canDouble || loading}
                                            className="h-20 text-xl font-black bg-yellow-600 hover:bg-yellow-500 flex flex-col items-center justify-center col-span-1"
                                        >
                                            <DollarSign className="w-6 h-6" />
                                            <span>DOUBLE</span>
                                        </Button>
                                        <Button
                                            onClick={split}
                                            disabled={!canSplit || loading}
                                            className="h-20 text-xl font-black bg-purple-600 hover:bg-purple-500 flex flex-col items-center justify-center col-span-1"
                                        >
                                            <LayoutGrid className="w-6 h-6" />
                                            <span>SPLIT</span>
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Wallet Info */}
                            <div className="pt-4 border-t border-white/5 flex justify-between items-center text-sm">
                                <span className="text-gray-500">Balance</span>
                                <span className="text-white font-mono font-bold">
                                    {currentWallet ? formatCurrency(currentWallet.balance) : '0.00'}
                                </span>
                            </div>
                        </div>
                    </Card>

                    {/* How to play hint */}
                    <div className="px-2">
                        <p className="text-[10px] text-gray-500 leading-relaxed">
                            Blackjack pays 3:2. Dealer must stand on 17. Insurance pays 2:1. Splitting allows playing two independent hands.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
