'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useSocket } from '@/hooks/useSocket'
import { useWallet } from '@/hooks/useWallet'
import { formatCurrency, generateClientSeed } from '@/lib/utils'
import { Bomb, Trophy, History, Zap, Shield, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { MinesTile } from '@/components/games/MinesTile'

interface MinesGameState {
    gameId: string
    minesCount: number
    revealedTiles: number[]
    currentMultiplier: number
    currentPayout: number
    isActive: boolean
}

export default function MinesPage() {
    const { socket, isConnected } = useSocket('/mines')
    const { currentWallet, selectedCurrency, fetchWallets } = useWallet()

    const [betAmount, setBetAmount] = useState('100')
    const [minesCount, setMinesCount] = useState(3)
    const [gameState, setGameState] = useState<MinesGameState | null>(null)
    const [revealedTiles, setRevealedTiles] = useState<number[]>([])
    const [minePositions, setMinePositions] = useState<number[]>([])
    const [gameOver, setGameOver] = useState(false)
    const [isStarting, setIsStarting] = useState(false)
    const [isCashingOut, setIsCashingOut] = useState(false)

    const handleStartGame = () => {
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

        setIsStarting(true)
        socket.emit(
            'mines:start',
            {
                betAmount: amount,
                minesCount,
                currency: selectedCurrency,
                clientSeed: generateClientSeed(),
            },
            (response: any) => {
                setIsStarting(false)
                if (response.success) {
                    setGameState({ ...response.data, isActive: true })
                    setRevealedTiles([])
                    setMinePositions([])
                    setGameOver(false)
                    toast.success('Good luck!')
                } else {
                    toast.error(response.message || 'Failed to start game')
                }
            }
        )
    }

    const handleRevealTile = (position: number) => {
        if (!socket || !gameState || !gameState.isActive || gameOver) return
        if (revealedTiles.includes(position)) return

        socket.emit(
            'mines:reveal',
            { position },
            (response: any) => {
                if (response.success) {
                    const data = response.data

                    if (data.hitMine) {
                        setRevealedTiles((prev) => [...prev, position])
                        setMinePositions(data.minePositions)
                        setGameOver(true)
                        setGameState((prev) => prev ? { ...prev, isActive: false } : null)
                        toast.error('BOOM! Better luck next time.')
                        fetchWallets()
                    } else {
                        setRevealedTiles(data.revealedTiles)
                        setGameState((prev) => prev ? {
                            ...prev,
                            revealedTiles: data.revealedTiles,
                            currentMultiplier: data.multiplier,
                            currentPayout: data.currentPayout,
                        } : null)
                    }
                } else {
                    toast.error(response.message || 'Error revealing tile')
                }
            }
        )
    }

    const handleCashout = () => {
        if (!socket || !gameState || !gameState.isActive) return

        setIsCashingOut(true)
        socket.emit('mines:cashout', {}, (response: any) => {
            setIsCashingOut(false)
            if (response.success) {
                const data = response.data
                setMinePositions(data.minePositions)
                setGameOver(true)
                setGameState((prev) => prev ? { ...prev, isActive: false } : null)
                toast.success(`Victory! You won ${formatCurrency(data.payout, selectedCurrency)}`)
                fetchWallets()
            } else {
                toast.error(response.message || 'Cashout failed')
            }
        })
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-red-500/20 rounded-2xl">
                            <Bomb className="w-8 h-8 text-red-400" />
                        </div>
                        <h1 className="text-4xl font-black tracking-tight">MINES</h1>
                    </div>
                    <p className="text-gray-400">Avoid the mines to increase your multiplier!</p>
                </div>

                <div className="glass px-4 py-2 rounded-xl border border-white/5 flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className="text-sm font-medium text-gray-300">Live</span>
                    </div>
                    <div className="h-4 w-px bg-white/10" />
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm font-medium text-gray-300">Fairness Verified</span>
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-6">
                {/* Game Board */}
                <div className="lg:col-span-8">
                    <Card className="p-4 md:p-8 bg-dark-300/30 border-white/5 shadow-2xl backdrop-blur-sm">
                        <div className="grid grid-cols-5 gap-3 sm:gap-4 aspect-square max-w-[500px] mx-auto">
                            {Array.from({ length: 25 }, (_, i) => (
                                <MinesTile
                                    key={i}
                                    index={i}
                                    isRevealed={revealedTiles.includes(i)}
                                    isMine={minePositions.includes(i)}
                                    isGameOver={gameOver}
                                    onClick={handleRevealTile}
                                    disabled={!gameState || !gameState.isActive}
                                />
                            ))}
                        </div>

                        {gameState?.isActive && revealedTiles.length > 0 && (
                            <div className="mt-8 animate-in slide-in-from-bottom-4 duration-300">
                                <Button
                                    onClick={handleCashout}
                                    className="w-full h-16 text-xl font-black uppercase bg-gradient-to-r from-green-600 to-emerald-600 shadow-xl shadow-green-500/20"
                                    isLoading={isCashingOut}
                                >
                                    Cash Out {formatCurrency(gameState.currentPayout, selectedCurrency)}
                                </Button>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Sidebar Controls */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="p-6 bg-dark-200/50 border-white/10">
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
                                        disabled={gameState?.isActive}
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
                                            disabled={gameState?.isActive}
                                            className="py-2 text-[10px] font-black rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 transition-colors"
                                        >
                                            {amt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Mines Count */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                        Mines
                                    </label>
                                    <span className="text-sm font-black text-red-400">{minesCount}</span>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="24"
                                    value={minesCount}
                                    onChange={(e) => setMinesCount(parseInt(e.target.value))}
                                    className="w-full h-2 bg-dark-400 rounded-lg appearance-none cursor-pointer accent-red-500"
                                    disabled={gameState?.isActive}
                                />
                                <div className="flex justify-between mt-2">
                                    {[1, 3, 5, 10, 15, 24].map(n => (
                                        <button
                                            key={n}
                                            onClick={() => setMinesCount(n)}
                                            className={`text-[10px] font-bold px-2 py-1 rounded ${minesCount === n ? 'bg-red-500 text-white' : 'text-gray-500'}`}
                                            disabled={gameState?.isActive}
                                        >
                                            {n}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {!gameState?.isActive ? (
                                <Button
                                    onClick={handleStartGame}
                                    disabled={!isConnected}
                                    isLoading={isStarting}
                                    className="w-full h-16 text-xl font-black uppercase bg-primary-600 hover:bg-primary-500 shadow-lg shadow-primary-500/20"
                                >
                                    Play Game
                                </Button>
                            ) : (
                                <div className="space-y-4">
                                    <div className="p-4 rounded-xl bg-primary-500/10 border border-primary-500/20">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm text-gray-400">Multiplier</span>
                                            <span className="text-xl font-black text-primary-400">
                                                {gameState.currentMultiplier.toFixed(2)}x
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-400">Current Win</span>
                                            <span className="text-xl font-black text-green-400">
                                                {formatCurrency(gameState.currentPayout, selectedCurrency)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-yellow-500 bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20">
                                        <AlertTriangle className="w-4 h-4" />
                                        <span>Game in progress. Reveal tiles carefully!</span>
                                    </div>
                                </div>
                            )}

                            {gameOver && !gameState?.isActive && (
                                <Button
                                    onClick={() => {
                                        setGameOver(false)
                                        setGameState(null)
                                        setRevealedTiles([])
                                        setMinePositions([])
                                    }}
                                    variant="secondary"
                                    className="w-full"
                                >
                                    Reset Board
                                </Button>
                            )}
                        </div>
                    </Card>

                    {/* Stats Card */}
                    <Card className="p-6 bg-dark-200/50 border-white/10">
                        <div className="flex items-center gap-2 mb-4">
                            <Shield className="w-4 h-4 text-gray-400" />
                            <h3 className="font-bold text-sm">Provably Fair</h3>
                        </div>
                        <div className="text-[10px] space-y-2 font-mono text-gray-500 break-all">
                            <p>CLIENT SEED: {generateClientSeed().slice(0, 16)}...</p>
                            <p>NONCE: 0</p>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    )
}
