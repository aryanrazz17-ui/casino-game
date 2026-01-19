'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TrendingUp, Shield, Zap, Gamepad2, ArrowRight } from 'lucide-react'
import GameCard from '@/components/GameCard'
import BannerSlider from '@/components/layout/BannerSlider'
import LiveBetsTicker from '@/components/layout/LiveBetsTicker'
import GameCategoryTabs from '@/components/layout/GameCategoryTabs'

export default function Home() {
    const [activeCategory, setActiveCategory] = useState('all')

    const games = [
        {
            name: "Dice",
            description: "Roll the dice and predict the outcome. Simple, fast, and provably fair betting.",
            image: "/games/dice.png",
            path: "/games/dice",
            category: "originals"
        },
        {
            name: "Coinflip",
            description: "Heads or Tails? Flip the golden coin and double your money instantly.",
            image: "/games/coinflip.png",
            path: "/games/coinflip",
            category: "originals"
        },
        {
            name: "Wheel",
            description: "Spin the wheel of fortune with customizable risk and win up to 50x.",
            image: "/games/wheel.png",
            path: "/games/wheel",
            category: "originals"
        },
        {
            name: "Crash",
            description: "Watch the multiplier rise and cash out before it crashes! High risk, high reward.",
            image: "/games/crash.png",
            path: "/games/crash",
            category: "originals"
        },
        {
            name: "Mines",
            description: "Navigate the minefield to uncover gems. Increase your multiplier with every safe step.",
            image: "/games/mines.png",
            path: "/games/mines",
            category: "originals"
        },
        {
            name: "Plinko",
            description: "Drop the ball and watch it bounce to big multipliers.",
            image: "/games/plinko.png",
            path: "/games/plinko",
            category: "originals"
        },
        {
            name: "Slots",
            description: "Spin the reels for massive jackpots and bonus features.",
            image: "/games/slot.png",
            path: "/games/slots",
            category: "slots"
        },
        {
            name: "Baccarat",
            description: "Punto Banco - predict if the Player or Banker will get closer to 9.",
            image: "/games/baccarat.png",
            path: "/games/baccarat",
            category: "casino"
        },
        {
            name: "Blackjack",
            description: "Beat the dealer by getting closer to 21 without busting.",
            image: "/games/blackjack.png",
            path: "/games/blackjack",
            category: "casino"
        },
        {
            name: "HiLo Multiplier",
            description: "Join the crowd and predict the next card drop in real-time.",
            image: "/games/hilo.png",
            path: "/games/hilo",
            category: "casino"
        },
        {
            name: "Roulette",
            description: "Experience the thrill of the classic casino wheel. Predict the number and win up to 35x.",
            image: "/games/roulette.png",
            path: "/games/roulette",
            category: "casino"
        }
    ]

    const filteredGames = activeCategory === 'all'
        ? games
        : games.filter(game => game.category === activeCategory)

    return (
        <div className="min-h-screen bg-[#0a0a0f]">
            {/* Hero Section with Banner */}
            <section className="relative px-4 pt-6 pb-4">
                <div className="max-w-7xl mx-auto">
                    <BannerSlider />
                </div>
            </section>

            {/* Live Bets Ticker */}
            <LiveBetsTicker />

            {/* Quick Stats */}
            <section className="px-4 py-6">
                <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard
                        icon={<Gamepad2 className="w-5 h-5 text-primary-400" />}
                        label="Total Games"
                        value="11+"
                    />
                    <StatCard
                        icon={<TrendingUp className="w-5 h-5 text-green-400" />}
                        label="Total Wins"
                        value="₹2.5M+"
                    />
                    <StatCard
                        icon={<Shield className="w-5 h-5 text-purple-400" />}
                        label="Provably Fair"
                        value="100%"
                    />
                    <StatCard
                        icon={<Zap className="w-5 h-5 text-yellow-400" />}
                        label="Avg Payout"
                        value="< 5min"
                    />
                </div>
            </section>

            {/* Games Section */}
            <section className="px-4 py-6">
                <div className="max-w-7xl mx-auto">
                    {/* Section Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-2xl md:text-3xl font-black text-white mb-1">
                                Popular Games
                            </h2>
                            <p className="text-sm text-zinc-400">Choose your game and start winning</p>
                        </div>
                    </div>

                    {/* Category Tabs */}
                    <div className="mb-6">
                        <GameCategoryTabs
                            activeCategory={activeCategory}
                            onCategoryChange={setActiveCategory}
                        />
                    </div>

                    {/* Games Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                        {filteredGames.map((game) => (
                            <GameCard
                                key={game.name}
                                {...game}
                            />
                        ))}
                    </div>

                    {/* View All Button */}
                    <div className="mt-8 text-center">
                        <Link
                            href="/games"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-900/50 hover:bg-zinc-900 border border-white/5 hover:border-primary-500/30 rounded-xl text-white font-bold transition-all group"
                        >
                            <span>View All Games</span>
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="px-4 py-12 border-t border-white/5 bg-zinc-950/50">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-10">
                        <h2 className="text-2xl md:text-3xl font-black text-white mb-2">
                            Why Choose BetX?
                        </h2>
                        <p className="text-zinc-400">The most trusted casino platform</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                        <FeatureCard
                            icon={<Shield className="w-8 h-8 text-primary-400" />}
                            title="Provably Fair"
                            description="Every game result is verifiable and transparent."
                        />
                        <FeatureCard
                            icon={<Zap className="w-8 h-8 text-yellow-400" />}
                            title="Instant Payouts"
                            description="Withdraw your winnings in under 5 minutes."
                        />
                        <FeatureCard
                            icon={<Gamepad2 className="w-8 h-8 text-purple-400" />}
                            title="11+ Games"
                            description="From classics to modern crypto originals."
                        />
                        <FeatureCard
                            icon={<TrendingUp className="w-8 h-8 text-green-400" />}
                            title="High RTP"
                            description="Best odds in the industry, up to 99% RTP."
                        />
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="px-4 py-10 border-t border-white/5 bg-[#050507]">
                <div className="max-w-7xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 mb-4">
                        <div className="w-10 h-10 bg-primary-gradient rounded-xl flex items-center justify-center shadow-glow-primary">
                            <span className="text-white font-black text-2xl">B</span>
                        </div>
                        <h2 className="text-2xl font-black text-white">
                            BET<span className="text-primary-400">X</span>
                        </h2>
                    </div>
                    <p className="text-zinc-500 mb-6 max-w-md mx-auto text-sm">
                        The world's most trusted crypto casino. Play smart, win big.
                    </p>
                    <div className="text-zinc-600 text-xs">
                        <p>&copy; 2026 BetX Casino. All rights reserved.</p>
                        <p className="mt-2">Please gamble responsibly. 18+ only.</p>
                    </div>
                </div>
            </footer>
        </div>
    )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="glass-dark p-4 rounded-xl border border-white/5 hover:border-primary-500/20 transition-all">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-900/50 rounded-lg">
                    {icon}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-0.5">{label}</p>
                    <p className="text-lg font-black text-white truncate">{value}</p>
                </div>
            </div>
        </div>
    )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <div className="glass-dark p-6 rounded-2xl border border-white/5 hover:border-primary-500/20 transition-all hover:-translate-y-1 duration-300">
            <div className="mb-4 bg-zinc-900/50 w-14 h-14 rounded-xl flex items-center justify-center">
                {icon}
            </div>
            <h3 className="text-lg font-black text-white mb-2">{title}</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">{description}</p>
        </div>
    )
}
