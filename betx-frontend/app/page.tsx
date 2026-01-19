import Link from 'next/link'
import { Gamepad2, TrendingUp, Shield, Zap } from 'lucide-react'
import GameCard from '@/components/GameCard'

export default function Home() {
    const games = [
        {
            name: "Dice",
            description: "Roll the dice and predict the outcome. Simple, fast, and provably fair betting.",
            image: "/games/dice.png",
            path: "/games/dice"
        },
        {
            name: "Coinflip",
            description: "Heads or Tails? Flip the golden coin and double your money instantly.",
            image: "/games/coinflip.png",
            path: "/games/coinflip"
        },
        {
            name: "Wheel",
            description: "Spin the wheel of fortune with customizable risk and win up to 50x.",
            image: "/games/wheel.png",
            path: "/games/wheel"
        },
        {
            name: "Crash",
            description: "Watch the multiplier rise and cash out before it crashes! High risk, high reward.",
            image: "/games/crash.png",
            path: "/games/crash"
        },
        {
            name: "Mines",
            description: "Navigate the minefield to uncover gems. Increase your multiplier with every safe step.",
            image: "/games/mines.png",
            path: "/games/mines"
        },
        {
            name: "Plinko",
            description: "Drop the ball and watch it bounce to big multipliers.",
            image: "/games/plinko.png",
            path: "/games/plinko"
        },
        {
            name: "Slots",
            description: "Spin the reels for massive jackpots and bonus features.",
            image: "/games/slot.png",
            path: "/games/slots"
        },
        {
            name: "Baccarat",
            description: "Punto Banco - predict if the Player or Banker will get closer to 9.",
            image: "/games/baccarat.png",
            path: "/games/baccarat"
        },
        {
            name: "Blackjack",
            description: "Beat the dealer by getting closer to 21 without busting.",
            image: "/games/blackjack.png",
            path: "/games/blackjack"
        }
    ]

    return (
        <main className="min-h-screen bg-[#0a0a0f]">
            {/* Hero Section */}
            <section className="relative overflow-hidden py-24 px-4 sm:px-6 lg:px-8">
                {/* Background Effects */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-600/20 rounded-full blur-[100px]" />
                    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px]" />
                </div>

                <div className="relative max-w-7xl mx-auto text-center z-10">
                    <div className="inline-block mb-4 px-4 py-1.5 rounded-full border border-primary-500/30 bg-primary-500/10 text-primary-400 text-sm font-medium">
                        🚀 The Future of Crypto Gambling
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight">
                        <span className="bg-gradient-to-r from-white via-primary-200 to-primary-400 bg-clip-text text-transparent">
                            Next Gen
                        </span>{" "}
                        <span className="bg-gradient-to-r from-primary-400 to-purple-500 bg-clip-text text-transparent">
                            Casino
                        </span>
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                        Experience fair, transparent, and instant gaming with the best odds in the market.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <Link
                            href="/auth/register"
                            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 rounded-xl font-bold text-lg text-white shadow-lg shadow-primary-900/20 transition-all hover:scale-105"
                        >
                            Start Playing Now
                        </Link>
                        <Link
                            href="/games/crash"
                            className="w-full sm:w-auto px-8 py-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-xl font-bold text-lg text-white transition-all hover:scale-105"
                        >
                            View Games
                        </Link>
                    </div>
                </div>
            </section>

            {/* Popular Games Section */}
            <section className="py-20 px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-12">
                        <div>
                            <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">Popular Games</h2>
                            <p className="text-gray-400">Choose your favorite game and start winning</p>
                        </div>
                        <Link href="/games" className="hidden md:flex items-center gap-2 text-primary-400 hover:text-primary-300 transition-colors font-medium">
                            View All <TrendingUp size={16} />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {games.map((game) => (
                            <GameCard
                                key={game.name}
                                {...game}
                            />
                        ))}
                    </div>

                    <div className="mt-8 md:hidden text-center">
                        <Link href="/games" className="inline-flex items-center gap-2 text-primary-400 hover:text-primary-300 transition-colors font-medium">
                            View All <TrendingUp size={16} />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-zinc-900 bg-zinc-950/50">
                <div className="max-w-7xl mx-auto">
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <FeatureCard
                            icon={<Shield className="w-10 h-10 text-primary-400" />}
                            title="Provably Fair"
                            description="Every game result is verifiable on the blockchain."
                        />
                        <FeatureCard
                            icon={<Zap className="w-10 h-10 text-yellow-400" />}
                            title="Instant Payouts"
                            description="Withdraw your winnings instantly to your wallet."
                        />
                        <FeatureCard
                            icon={<Gamepad2 className="w-10 h-10 text-purple-400" />}
                            title="Diverse Games"
                            description="From classics to modern crypto games."
                        />
                        <FeatureCard
                            icon={<TrendingUp className="w-10 h-10 text-green-400" />}
                            title="High RTP"
                            description="Enjoy some of the best odds in the industry."
                        />
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-4 border-t border-zinc-900 bg-[#050507]">
                <div className="max-w-7xl mx-auto text-center">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-400 to-purple-400 bg-clip-text text-transparent mb-6">
                        BetX Casino
                    </h2>
                    <p className="text-gray-500 mb-8 max-w-md mx-auto">
                        The world's most trusted crypto casino. Play smart, win big.
                    </p>
                    <div className="text-zinc-600 text-sm">
                        <p>&copy; 2026 BetX Casino. All rights reserved.</p>
                        <p className="mt-2 text-xs">Please gamble responsibly. 18+ only.</p>
                    </div>
                </div>
            </footer>
        </main>
    )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 hover:border-primary-500/30 transition-all hover:-translate-y-1">
            <div className="mb-4 bg-zinc-900 w-16 h-16 rounded-xl flex items-center justify-center shadow-inner">
                {icon}
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
            <p className="text-gray-400 leading-relaxed">{description}</p>
        </div>
    )
}
