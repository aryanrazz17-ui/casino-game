'use client'

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useWallet } from "@/hooks/useWallet";
import { formatCurrency } from "@/lib/utils";
import { Card as UICard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
    Gamepad2,
    History,
    Zap,
    Shield,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Coins,
    Award
} from "lucide-react";
import toast from "react-hot-toast";

// --- Game Constants & Helpers ---

const suits = {
    "Hearts": { color: "#e9113c", icon: "♥" },
    "Diamonds": { color: "#e9113c", icon: "♦" },
    "Clubs": { color: "#1a2c38", icon: "♣" },
    "Spades": { color: "#1a2c38", icon: "♠" }
};

interface Card {
    rank: string;
    suit: "Hearts" | "Diamonds" | "Clubs" | "Spades";
    value: number;
}

const PlayingCard = ({ card, isHidden }: { card: Card | null, isHidden?: boolean }) => {
    if (isHidden || !card) {
        return (
            <div className="w-24 h-36 md:w-32 md:h-48 bg-primary-900/20 border-2 border-primary-500/20 rounded-xl flex items-center justify-center">
                <div className="w-full h-full bg-gradient-to-br from-primary-900 via-primary-800 to-indigo-900 rounded-lg flex items-center justify-center border-2 border-white/5">
                    <div className="w-12 h-12 rounded-full border-4 border-white/10 flex items-center justify-center">
                        <Zap className="w-6 h-6 text-white/20" />
                    </div>
                </div>
            </div>
        );
    }

    const { color } = suits[card.suit] || { color: '#fff' };

    return (
        <div className="w-24 h-36 md:w-32 md:h-48 bg-white rounded-xl shadow-2xl flex flex-col p-3 transition-all duration-300 animate-in zoom-in-50" style={{ color }}>
            <div className="text-2xl md:text-4xl font-black">{card.rank}</div>
            <div className="flex-1 flex items-center justify-center text-5xl md:text-7xl">
                {suits[card.suit].icon}
            </div>
            <div className="text-2xl md:text-4xl font-black self-end rotate-180">{card.rank}</div>
        </div>
    );
};

export default function HiloGame() {
    const { currentWallet, selectedCurrency, fetchWallets } = useWallet();

    const [betAmount, setBetAmount] = useState('100');
    const [gameId, setGameId] = useState<string | null>(null);
    const [currentCard, setCurrentCard] = useState<Card | null>(null);
    const [multiplier, setMultiplier] = useState(1);
    const [payout, setPayout] = useState(0);
    const [history, setHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGameOver, setIsGameOver] = useState(false);

    // Initial check for active game
    useEffect(() => {
        const fetchGame = async () => {
            try {
                const { data } = await api.get("/hilo/game");
                if (data.status) {
                    setGameId(data.gameId);
                    setMultiplier(data.odds);
                    setPayout(data.profit + data.amount);
                    setCurrentCard(data.rounds[data.rounds.length - 1].card);
                    setHistory(data.rounds.map((r: any) => r.card));
                }
            } catch (err) {
                console.error("Failed to fetch HiLo game", err);
            }
        };
        fetchGame();
    }, []);

    const handleCreateGame = async () => {
        const amount = parseFloat(betAmount);
        if (isNaN(amount) || amount <= 0) return toast.error("Invalid amount");
        if (!currentWallet || currentWallet.balance < amount) return toast.error("Insufficient balance");

        setIsLoading(true);
        try {
            const { data } = await api.post("/hilo/create", {
                amount,
                currency: selectedCurrency
            });
            if (data.status) {
                setGameId(data.gameId);
                setMultiplier(1);
                setPayout(amount);
                const firstCard = data.rounds[0].card;
                setCurrentCard(firstCard);
                setHistory([firstCard]);
                setIsGameOver(false);
                fetchWallets();
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to start game");
        } finally {
            setIsLoading(false);
        }
    };

    const handleMove = async (type: 'Higher' | 'Lower') => {
        if (!gameId || isLoading) return;

        setIsLoading(true);
        try {
            const { data } = await api.post("/hilo/bet", { type });
            if (data.status) {
                const lastMove = data.rounds[data.rounds.length - 1];
                setCurrentCard(lastMove.card);
                setHistory(prev => [...prev, lastMove.card]);

                if (data.type === 'LOST') {
                    setMultiplier(0);
                    setPayout(0);
                    setIsGameOver(true);
                    setGameId(null);
                    toast.error("Unlucky! You lost.");
                } else {
                    setMultiplier(data.odds);
                    setPayout(data.profit + parseFloat(betAmount));
                    toast.success("Correct guess!", { icon: '🎯' });
                }
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Move failed");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCashout = async () => {
        if (!gameId || history.length < 2 || isLoading) return;

        setIsLoading(true);
        try {
            const { data } = await api.post("/hilo/cashout");
            if (data.status) {
                toast.success(`Cashed out! You won ${formatCurrency(data.profit + parseFloat(betAmount), selectedCurrency)}`, { icon: '💰' });
                setGameId(null);
                setPayout(0);
                setMultiplier(1);
                fetchWallets();
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Cashout failed");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-indigo-500/20 rounded-2xl">
                            <Gamepad2 className="w-8 h-8 text-indigo-400" />
                        </div>
                        <h1 className="text-4xl font-black tracking-tight uppercase">HiLo</h1>
                    </div>
                    <p className="text-gray-400 font-medium">Predict the next card high or low to win!</p>
                </div>

                <div className="glass px-4 py-2 rounded-xl border border-white/5 flex items-center gap-4 bg-dark-200/50 backdrop-blur-md">
                    <div className="flex items-center gap-2 text-primary-400">
                        <Shield className="w-4 h-4" />
                        <span className="text-sm font-bold">Provably Fair</span>
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-6">
                {/* Main Game Area */}
                <div className="lg:col-span-8 space-y-6">
                    <UICard className="p-8 md:p-12 bg-dark-200/50 border-white/10 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[450px]">
                        {/* Decorative background */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 blur-[100px] pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 blur-[100px] pointer-events-none" />

                        <div className="relative z-10 flex flex-col items-center gap-8">
                            <div className="flex flex-col items-center gap-4">
                                <div className="px-6 py-2 rounded-full bg-primary-500/10 border border-primary-500/20 mb-4 animate-bounce">
                                    <span className="text-sm font-black text-primary-400 uppercase tracking-widest">
                                        Current Card
                                    </span>
                                </div>
                                <PlayingCard card={currentCard} />
                            </div>

                            {/* Multiplier Badge */}
                            <div className="flex flex-col items-center gap-1">
                                <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Potential Multiplier</span>
                                <div className="px-8 py-3 rounded-2xl bg-gradient-to-r from-primary-600 to-indigo-600 text-3xl font-black text-white shadow-xl shadow-primary-500/20">
                                    {multiplier.toFixed(2)}x
                                </div>
                            </div>
                        </div>

                        {/* Recent History */}
                        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 px-6 overflow-x-auto no-scrollbar">
                            {history.slice(-10).map((h, i) => (
                                <div
                                    key={i}
                                    className="min-w-[40px] h-14 bg-white rounded flex flex-col items-center justify-center shadow-lg transition-all hover:scale-110"
                                    style={{ color: suits[h.suit as keyof typeof suits]?.color || '#000' }}
                                >
                                    <span className="text-[10px] font-black">{h.rank}</span>
                                    <span className="text-sm leading-none">{suits[h.suit as keyof typeof suits]?.icon}</span>
                                </div>
                            ))}
                        </div>
                    </UICard>

                    {/* Controls Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        <Button
                            onClick={() => handleMove('Higher')}
                            disabled={!gameId || isLoading}
                            variant="secondary"
                            className="h-24 md:h-32 flex flex-col gap-3 group border-green-500/20 hover:border-green-500/50 bg-green-500/5"
                        >
                            <TrendingUp className="w-8 h-8 text-green-400 group-hover:scale-125 transition-transform" />
                            <span className="font-black uppercase tracking-tighter text-green-400">Higher</span>
                        </Button>

                        <Button
                            onClick={() => handleMove('Lower')}
                            disabled={!gameId || isLoading}
                            variant="secondary"
                            className="h-24 md:h-32 flex flex-col gap-3 group border-red-500/20 hover:border-red-500/50 bg-red-500/5"
                        >
                            <TrendingDown className="w-8 h-8 text-red-400 group-hover:scale-125 transition-transform" />
                            <span className="font-black uppercase tracking-tighter text-red-400">Lower</span>
                        </Button>

                        <div className="hidden md:flex flex-col gap-4">
                            <UICard className="flex-1 bg-white/5 border-white/5 flex flex-col items-center justify-center p-4">
                                <Coins className="w-5 h-5 text-amber-400 mb-1" />
                                <span className="text-[10px] font-bold text-gray-500 uppercase">Current Payout</span>
                                <span className="text-lg font-black text-amber-400">{formatCurrency(payout, selectedCurrency)}</span>
                            </UICard>
                        </div>
                    </div>
                </div>

                {/* Sidebar Controls */}
                <div className="lg:col-span-4 space-y-6">
                    <UICard className="p-6 bg-dark-200/50 border-white/10 backdrop-blur-xl">
                        <div className="space-y-6">
                            {!gameId ? (
                                <>
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
                                                placeholder="0.00"
                                            />
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-400 font-bold">
                                                {selectedCurrency === 'INR' ? '₹' : '₿'}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-4 gap-2 mt-3">
                                            {[100, 500, 1000, 2000].map(amt => (
                                                <button key={amt} onClick={() => setBetAmount(amt.toString())} className="py-2 text-[10px] font-black rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                                                    {amt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <Button
                                        onClick={handleCreateGame}
                                        isLoading={isLoading}
                                        className="w-full h-16 text-xl font-black uppercase bg-gradient-to-r from-primary-600 to-indigo-600 shadow-xl shadow-primary-500/20"
                                    >
                                        Play HiLo
                                    </Button>
                                </>
                            ) : (
                                <div className="space-y-4">
                                    <div className="p-6 rounded-2xl bg-primary-600 shadow-2xl shadow-primary-600/30 text-center animate-in slide-in-from-top-4 duration-500">
                                        <Award className="w-8 h-8 text-white mx-auto mb-2 opacity-50" />
                                        <p className="text-sm font-bold text-white/70 uppercase tracking-widest mb-1">Cashing Out Wins</p>
                                        <p className="text-3xl font-black text-white">{formatCurrency(payout, selectedCurrency)}</p>
                                    </div>

                                    <Button
                                        onClick={handleCashout}
                                        variant="secondary"
                                        disabled={history.length < 2 || isLoading}
                                        className="w-full h-16 text-xl font-black uppercase border-white/10 bg-white/5 hover:bg-white/10"
                                    >
                                        Cash Out
                                    </Button>

                                    <div className="flex items-center gap-2 text-xs text-yellow-500/70 bg-yellow-500/5 border border-yellow-500/10 p-4 rounded-xl">
                                        <History className="w-4 h-4 shrink-0" />
                                        <p>Make at least <span className="text-yellow-500 font-bold">1 guess</span> to enable cash out.</p>
                                    </div>
                                </div>
                            )}

                            <div className="p-4 rounded-xl bg-dark-400/30 border border-white/5 space-y-3">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500 font-bold uppercase">Balance After</span>
                                    <span className="text-gray-300 font-black">
                                        {formatCurrency((currentWallet?.balance || 0) + (gameId ? 0 : -parseFloat(betAmount)), selectedCurrency)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500 font-bold uppercase">Game Status</span>
                                    <span className={`font-black ${gameId ? 'text-primary-400' : 'text-gray-400'}`}>
                                        {gameId ? 'ROUND ACTIVE' : 'WAITING'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </UICard>

                    {/* Stats */}
                    <UICard className="p-6 bg-dark-200/50 border-white/10">
                        <div className="flex items-center gap-2 mb-4">
                            <History className="w-4 h-4 text-gray-400" />
                            <h3 className="font-bold text-sm uppercase tracking-tighter">Round Stats</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-white/5 rounded-lg">
                                <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Steps Taken</p>
                                <p className="text-lg font-black">{history.length - 1}</p>
                            </div>
                            <div className="p-3 bg-white/5 rounded-lg">
                                <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Max Multiplier</p>
                                <p className="text-lg font-black text-primary-400">{multiplier.toFixed(2)}x</p>
                            </div>
                        </div>
                    </UICard>
                </div>
            </div>
        </div>
    );
}
