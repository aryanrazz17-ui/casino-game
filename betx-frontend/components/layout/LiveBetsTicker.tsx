'use client'

import React, { useEffect, useState } from 'react'
import { TrendingUp, Users } from 'lucide-react'
import { motion } from 'framer-motion'

interface LiveBet {
    id: string
    player: string
    game: string
    amount: number
    multiplier: number
    payout: number
}

const LiveBetsTicker = () => {
    const [liveBets, setLiveBets] = useState<LiveBet[]>([])

    useEffect(() => {
        // Generate mock live bets
        const generateMockBet = (): LiveBet => {
            const games = ['Dice', 'Crash', 'Mines', 'Plinko', 'Slots', 'Roulette', 'Blackjack']
            const multipliers = [1.5, 2, 2.5, 3, 5, 10, 15, 20, 50, 100]
            const amounts = [100, 250, 500, 1000, 2500, 5000, 10000]

            const amount = amounts[Math.floor(Math.random() * amounts.length)]
            const multiplier = multipliers[Math.floor(Math.random() * multipliers.length)]

            return {
                id: Math.random().toString(36).substr(2, 9),
                player: `${['Lucky', 'Pro', 'King', 'Boss', 'Elite'][Math.floor(Math.random() * 5)]}${Math.floor(Math.random() * 9999)}`,
                game: games[Math.floor(Math.random() * games.length)],
                amount,
                multiplier,
                payout: amount * multiplier
            }
        }

        // Initialize with some bets
        setLiveBets(Array.from({ length: 5 }, generateMockBet))

        // Add new bets periodically
        const interval = setInterval(() => {
            setLiveBets(prev => {
                const newBets = [generateMockBet(), ...prev]
                return newBets.slice(0, 10)
            })
        }, 3000)

        return () => clearInterval(interval)
    }, [])

    return (
        <div className="w-full bg-zinc-900/30 border-y border-white/5 py-3 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase">
                        <TrendingUp size={14} className="text-green-400" />
                        <span>Live Wins</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                        <Users size={12} />
                        <span>{Math.floor(Math.random() * 500 + 1000)} playing</span>
                    </div>
                </div>

                <div className="relative overflow-hidden h-6">
                    <motion.div
                        className="flex gap-6 absolute"
                        animate={{ x: [0, -1000] }}
                        transition={{
                            duration: 20,
                            repeat: Infinity,
                            ease: "linear"
                        }}
                    >
                        {[...liveBets, ...liveBets].map((bet, index) => (
                            <div
                                key={`${bet.id}-${index}`}
                                className="flex items-center gap-2 text-sm whitespace-nowrap"
                            >
                                <span className="text-zinc-400 font-medium">{bet.player}</span>
                                <span className="text-zinc-600">won</span>
                                <span className="text-green-400 font-bold">₹{bet.payout.toLocaleString()}</span>
                                <span className="text-zinc-600">on</span>
                                <span className="text-primary-400 font-semibold">{bet.game}</span>
                                <span className="text-yellow-400 font-bold">{bet.multiplier}x</span>
                                <span className="text-zinc-700">•</span>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </div>
        </div>
    )
}

export default LiveBetsTicker
