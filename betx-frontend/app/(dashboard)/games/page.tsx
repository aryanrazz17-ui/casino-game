'use client'

import { Gamepad2, TrendingUp, Zap, Trophy } from 'lucide-react'
import GameCard from '@/components/GameCard'

const games = [
    {
        name: 'Dice',
        description: 'Classic dice game with customizable odds. Roll, bet, and win big!',
        path: '/games/dice',
        image: '/games/dice.png',
        status: 'LIVE' as const,
    },
    {
        name: 'Coinflip',
        description: 'Heads or Tails? Flip the coin and win up to 1.98x your bet.',
        path: '/games/coinflip',
        image: '/games/dice.png', // Fallback image
        status: 'LIVE' as const,
    },
    {
        name: 'Wheel',
        description: 'Spin the wheel of fortune. Choose your risk and win up to 50x.',
        path: '/games/wheel',
        image: '/games/dice.png', // Fallback image
        status: 'LIVE' as const,
    },
    {
        name: 'Crash',
        description: 'Multiplayer crash game. Cash out before the rocket explodes!',
        path: '/games/crash',
        image: '/games/crash.png',
        status: 'LIVE' as const,
    },
    {
        name: 'Mines',
        description: 'Uncover gems and avoid mines. The more you find, the more you win.',
        path: '/games/mines',
        image: '/games/mines.png',
        status: 'LIVE' as const,
    },
    {
        name: 'Plinko',
        description: 'Drop the ball and watch it bounce to big multipliers.',
        path: '/games/plinko',
        image: '/games/plinko.png',
        status: 'LIVE' as const,
    },
    {
        name: 'Slots',
        description: 'Spin the reels for massive jackpots and bonus features.',
        path: '/games/slots',
        image: '/games/slot.png',
        status: 'LIVE' as const,
    },
]

export default function GamesPage() {
    return (
        <div className="space-y-8 min-h-screen">
            {/* Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-900/50 to-primary-900/50 p-8 border border-white/5">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-primary-500/20 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />

                <div className="relative z-10">
                    <h1 className="text-4xl md:text-5xl font-black mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                        Game Lobby
                    </h1>
                    <p className="text-gray-400 max-w-xl text-lg">
                        Choose from our selection of premium crypto games.
                        Provably fair, instant payouts, and immersive gameplay.
                    </p>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    icon={<Gamepad2 className="w-6 h-6 text-primary-400" />}
                    label="Active Games"
                    value="7"
                />
                <StatCard
                    icon={<TrendingUp className="w-6 h-6 text-green-400" />}
                    label="RTP Range"
                    value="98-99.5%"
                />
                <StatCard
                    icon={<Zap className="w-6 h-6 text-yellow-400" />}
                    label="Total Bets"
                    value="2.4M+"
                />
                <StatCard
                    icon={<Trophy className="w-6 h-6 text-purple-400" />}
                    label="Total Paid"
                    value="$12M+"
                />
            </div>

            {/* Games Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {games.map((game) => (
                    <GameCard
                        key={game.name}
                        {...game}
                    />
                ))}
            </div>
        </div>
    )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl flex items-center gap-4 hover:border-zinc-700 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center">
                {icon}
            </div>
            <div>
                <p className="text-sm text-gray-400">{label}</p>
                <p className="text-xl font-bold text-white">{value}</p>
            </div>
        </div>
    )
}
