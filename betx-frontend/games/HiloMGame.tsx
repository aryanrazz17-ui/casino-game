'use client'

import { useEffect, useState, useRef } from "react";
import { useSocket } from "@/hooks/useSocket";
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
    Play,
    Timer,
    CheckCircle2,
    XCircle
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

interface Bet {
    userId: string;
    amount: number;
    betType: string;
    status: "BET" | "WIN" | "LOST";
    multiplier: number;
    profit: number;
}

const multipliers = {
    'hi': 1.84,
    'low': 1.84,
    'black': 2.0,
    'red': 2.0,
    'range_2_9': 1.5,
    'range_j_q_k_a': 3.0,
    'range_k_a': 6.0,
    'a': 12.0
};

// --- Components ---

const PlayingCard = ({ card, isRevealing, isHidden }: { card: Card | null, isRevealing?: boolean, isHidden?: boolean }) => {
    if (isHidden || !card) {
        return (
            <div className="w-24 h-36 md:w-32 md:h-48 bg-primary-900/20 border-2 border-primary-500/20 rounded-xl flex items-center justify-center animate-pulse">
                <div className="w-12 h-12 rounded-full border-4 border-primary-500/20 border-t-primary-500 animate-spin" />
            </div>
        );
    }

    const { color } = suits[card.suit] || { color: '#fff' };

    return (
        <div className={`w-24 h-36 md:w-32 md:h-48 bg-white rounded-xl shadow-2xl flex flex-col p-3 transition-all duration-500 ${isRevealing ? 'scale-110 rotate-y-180' : ''}`} style={{ color }}>
            <div className="text-2xl md:text-4xl font-black">{card.rank}</div>
            <div className="flex-1 flex items-center justify-center text-5xl md:text-7xl">
                {suits[card.suit].icon}
            </div>
            <div className="text-2xl md:text-4xl font-black self-end rotate-180">{card.rank}</div>
        </div>
    );
};

export default function HiloMGame() {
    const { socket, isConnected } = useSocket('/hilo');
    const { currentWallet, selectedCurrency, fetchWallets } = useWallet();

    const [betAmount, setBetAmount] = useState('100');
    const [status, setStatus] = useState(1); // 1 = BETTING, 2 = CALCULATING
    const [startCard, setStartCard] = useState<Card | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [currentBets, setCurrentBets] = useState<Bet[]>([]);
    const [timer, setTimer] = useState(0);
    const [isBetting, setIsBetting] = useState(false);
    const [selectedBetType, setSelectedBetType] = useState<string | null>(null);

    // Socket Events
    useEffect(() => {
        if (!socket) return;

        socket.emit('fetch');

        socket.on('game', (data) => {
            setStatus(data.status);
            setStartCard(data.startCard);
            setHistory(data.history || []);
            // Calculate time left
            const elapsed = Date.now() - data.dt;
            const duration = data.status === 1 ? data.bettingTime : data.calculatingTime;
            setTimer(Math.max(0, duration - elapsed));
        });

        socket.on('game-status', (data) => {
            setStatus(data);
            setTimer(data === 1 ? 10000 : 3000);
            if (data === 1) {
                setIsBetting(false);
                setSelectedBetType(null);
                setCurrentBets([]);
            }
        });

        socket.on('game-start', (data) => {
            setIsBetting(false);
            setSelectedBetType(null);
            setCurrentBets([]);
        });

        socket.on('game-end', (data) => {
            setStartCard(data.card);
            setHistory(prev => [data.card, ...prev].slice(0, 50));
            setCurrentBets(data.bets || []);
            fetchWallets();
        });

        socket.on('bet', (data) => {
            setCurrentBets(prev => [data, ...prev]);
        });

        socket.on('wallet_update', () => fetchWallets());

        return () => {
            socket.off('game');
            socket.off('game-status');
            socket.off('game-start');
            socket.off('game-end');
            socket.off('bet');
            socket.off('wallet_update');
        };
    }, [socket, fetchWallets]);

    // Timer Logic
    useEffect(() => {
        const interval = setInterval(() => {
            setTimer(prev => Math.max(0, prev - 100));
        }, 100);
        return () => clearInterval(interval);
    }, []);

    const handlePlaceBet = (betType: string) => {
        if (!socket || !isConnected || status !== 1 || isBetting) return;

        const amount = parseFloat(betAmount);
        if (isNaN(amount) || amount <= 0) {
            toast.error('Invalid bet amount');
            return;
        }

        if (!currentWallet || currentWallet.balance < amount) {
            toast.error('Insufficient balance');
            return;
        }

        setIsBetting(true);
        setSelectedBetType(betType);

        socket.emit('place-bet', {
            amount,
            currency: selectedCurrency,
            betType
        }, (response: any) => {
            if (response && !response.status) {
                toast.error(response.message || 'Failed to place bet');
                setIsBetting(false);
                setSelectedBetType(null);
            } else {
                toast.success('Bet placed!');
            }
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-primary-500/20 rounded-2xl">
                            <Gamepad2 className="w-8 h-8 text-primary-400" />
                        </div>
                        <h1 className="text-4xl font-black tracking-tight uppercase">HiLo Multiplier</h1>
                    </div>
                    <p className="text-gray-400 font-medium">Predict the next card and multiply your winnings!</p>
                </div>

                <div className="glass px-4 py-2 rounded-xl border border-white/5 flex items-center gap-4 bg-dark-200/50 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className="text-sm font-bold text-gray-300">Live</span>
                    </div>
                    <div className="h-4 w-px bg-white/10" />
                    <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary-400" />
                        <span className="text-sm font-bold text-gray-300">Provably Fair</span>
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-6">
                {/* Main Game Area */}
                <div className="lg:col-span-8 space-y-6">
                    <UICard className="p-8 md:p-12 bg-dark-200/50 border-white/10 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[400px]">
                        {/* Status Timer */}
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10 w-full px-8">
                            <div className="flex justify-between items-center w-full max-w-sm mb-1">
                                <span className="text-xs font-black uppercase tracking-widest text-gray-400">
                                    {status === 1 ? 'Accepting Bets' : 'Revealing Card'}
                                </span>
                                <span className={`text-xs font-black ${(timer / 1000) < 3 && status === 1 ? 'text-red-400 animate-pulse' : 'text-primary-400'}`}>
                                    {(timer / 1000).toFixed(1)}s
                                </span>
                            </div>
                            <div className="w-full max-w-sm h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-100 ease-linear ${status === 1 ? 'bg-primary-500' : 'bg-amber-500'}`}
                                    style={{ width: `${(timer / (status === 1 ? 10000 : 3000)) * 100}%` }}
                                />
                            </div>
                        </div>

                        {/* Cards Display */}
                        <div className="flex items-center gap-8 md:gap-16 mt-8">
                            <div className="flex flex-col items-center gap-4">
                                <span className="text-xs font-bold uppercase text-gray-500 tracking-tighter">Current Card</span>
                                <PlayingCard card={startCard} />
                            </div>

                            <div className="flex items-center justify-center">
                                <div className="p-4 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm animate-pulse">
                                    <Zap className="w-6 h-6 text-primary-400" />
                                </div>
                            </div>

                            <div className="flex flex-col items-center gap-4">
                                <span className="text-xs font-bold uppercase text-gray-500 tracking-tighter">Next Card</span>
                                <PlayingCard card={null} isHidden={status === 1} />
                            </div>
                        </div>

                        {/* Recent History */}
                        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 px-6 overflow-x-auto no-scrollbar">
                            {history.slice(0, 10).map((h, i) => (
                                <div
                                    key={i}
                                    className="min-w-[40px] h-14 bg-white rounded flex flex-col items-center justify-center shadow-lg transform hover:-translate-y-1 transition-transform"
                                    style={{ color: suits[h.suit as keyof typeof suits]?.color || '#000' }}
                                >
                                    <span className="text-[10px] font-black">{h.rank}</span>
                                    <span className="text-sm leading-none">{suits[h.suit as keyof typeof suits]?.icon}</span>
                                </div>
                            ))}
                        </div>
                    </UICard>

                    {/* Betting Options Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <BetOption
                            label="Higher"
                            multiplier={multipliers.hi}
                            icon={<TrendingUp className="w-5 h-5 text-green-400" />}
                            color="green"
                            onClick={() => handlePlaceBet('hi')}
                            disabled={status !== 1 || isBetting}
                            isSelected={selectedBetType === 'hi'}
                        />
                        <BetOption
                            label="Lower"
                            multiplier={multipliers.low}
                            icon={<TrendingDown className="w-5 h-5 text-red-400" />}
                            color="red"
                            onClick={() => handlePlaceBet('low')}
                            disabled={status !== 1 || isBetting}
                            isSelected={selectedBetType === 'low'}
                        />
                        <BetOption
                            label="Black"
                            multiplier={multipliers.black}
                            icon={<div className="w-4 h-4 rounded-full bg-black border border-white/20" />}
                            color="zinc"
                            onClick={() => handlePlaceBet('black')}
                            disabled={status !== 1 || isBetting}
                            isSelected={selectedBetType === 'black'}
                        />
                        <BetOption
                            label="Red"
                            multiplier={multipliers.red}
                            icon={<div className="w-4 h-4 rounded-full bg-red-600 border border-white/20" />}
                            color="red"
                            onClick={() => handlePlaceBet('red')}
                            disabled={status !== 1 || isBetting}
                            isSelected={selectedBetType === 'red'}
                        />
                        <BetOption
                            label="2 - 9"
                            multiplier={multipliers.range_2_9}
                            icon={<span className="text-xs font-black">NUM</span>}
                            color="primary"
                            onClick={() => handlePlaceBet('range_2_9')}
                            disabled={status !== 1 || isBetting}
                            isSelected={selectedBetType === 'range_2_9'}
                        />
                        <BetOption
                            label="J, Q, K, A"
                            multiplier={multipliers.range_j_q_k_a}
                            icon={<span className="text-xs font-black">FACE</span>}
                            color="purple"
                            onClick={() => handlePlaceBet('range_j_q_k_a')}
                            disabled={status !== 1 || isBetting}
                            isSelected={selectedBetType === 'range_j_q_k_a'}
                        />
                        <BetOption
                            label="K or A"
                            multiplier={multipliers.range_k_a}
                            icon={<span className="text-xs font-black">PRO</span>}
                            color="amber"
                            onClick={() => handlePlaceBet('range_k_a')}
                            disabled={status !== 1 || isBetting}
                            isSelected={selectedBetType === 'range_k_a'}
                        />
                        <BetOption
                            label="Ace Only"
                            multiplier={multipliers.a}
                            icon={<span className="text-xs font-black text-rose-400">ICE</span>}
                            color="rose"
                            onClick={() => handlePlaceBet('a')}
                            disabled={status !== 1 || isBetting}
                            isSelected={selectedBetType === 'a'}
                        />
                    </div>
                </div>

                {/* Sidebar Controls */}
                <div className="lg:col-span-4 space-y-6">
                    <UICard className="p-6 bg-dark-200/50 border-white/10 backdrop-blur-xl">
                        <div className="space-y-6">
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
                                        disabled={isBetting}
                                    />
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-400 font-bold">
                                        {selectedCurrency === 'INR' ? '₹' : '₿'}
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 gap-2 mt-3">
                                    {[100, 500, 1000, 2000].map(amt => (
                                        <button
                                            key={amt}
                                            onClick={() => setBetAmount(amt.toString())}
                                            disabled={isBetting}
                                            className="py-2 text-[10px] font-black rounded-lg bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
                                        >
                                            {amt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-primary-500/10 border border-primary-500/20 text-center">
                                <p className="text-xs text-primary-400 font-bold uppercase tracking-wider mb-1">Potential Win</p>
                                <p className="text-2xl font-black text-white">
                                    {formatCurrency(parseFloat(betAmount) * 1.84 || 0, selectedCurrency)}
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                                    <Timer className="w-3 h-3" />
                                    <span>Select an option above to place bet</span>
                                </div>
                            </div>
                        </div>
                    </UICard>

                    {/* Live Bets History */}
                    <UICard className="p-6 bg-dark-200/50 border-white/10">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-black flex items-center gap-2 text-sm uppercase tracking-tighter">
                                <History className="w-4 h-4 text-gray-400" />
                                Live Rounds
                            </h3>
                            <div className="flex gap-1">
                                {history.slice(0, 5).map((h, i) => (
                                    <div key={i} className="w-4 h-4 rounded-full bg-primary-500/20 flex items-center justify-center">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                            {currentBets.length === 0 ? (
                                <p className="text-gray-500 text-xs py-8 text-center bg-white/5 rounded-xl border border-dashed border-white/10">
                                    No bets in current round
                                </p>
                            ) : (
                                currentBets.map((bet, i) => (
                                    <div key={i} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5 transition-all hover:bg-white/10">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-1.5 rounded-lg ${bet.status === 'WIN' ? 'bg-green-500/20' : bet.status === 'LOST' ? 'bg-red-500/20' : 'bg-primary-500/20'}`}>
                                                {bet.status === 'WIN' ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : bet.status === 'LOST' ? <XCircle className="w-3 h-3 text-red-400" /> : <Play className="w-3 h-3 text-primary-400" />}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-gray-400 uppercase leading-none mb-1">{bet.betType}</span>
                                                <span className="text-xs font-bold text-gray-200">{bet.userId}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-xs font-black ${bet.status === 'WIN' ? 'text-green-400' : 'text-gray-300'}`}>
                                                {bet.status === 'WIN' ? `+${formatCurrency(bet.profit, selectedCurrency)}` : formatCurrency(bet.amount, selectedCurrency)}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </UICard>
                </div>
            </div>
        </div>
    );
}

function BetOption({ label, multiplier, icon, color, onClick, disabled, isSelected }: {
    label: string,
    multiplier: number,
    icon: React.ReactNode,
    color: string,
    onClick: () => void,
    disabled: boolean,
    isSelected: boolean
}) {
    const colorClasses = {
        green: 'border-green-500/20 hover:border-green-500/50 bg-green-500/5 text-green-400',
        red: 'border-red-500/20 hover:border-red-500/50 bg-red-500/5 text-red-400',
        zinc: 'border-white/10 hover:border-white/30 bg-white/5 text-white',
        primary: 'border-primary-500/20 hover:border-primary-500/50 bg-primary-500/5 text-primary-400',
        purple: 'border-purple-500/20 hover:border-purple-500/50 bg-purple-500/5 text-purple-400',
        amber: 'border-amber-500/20 hover:border-amber-500/50 bg-amber-500/5 text-amber-400',
        rose: 'border-rose-500/20 hover:border-rose-500/50 bg-rose-500/5 text-rose-400',
    };

    const selectedClasses = {
        green: 'border-green-500 bg-green-500/20 ring-1 ring-green-500/50',
        red: 'border-red-500 bg-red-500/20 ring-1 ring-red-500/50',
        zinc: 'border-white bg-white/20 ring-1 ring-white/50',
        primary: 'border-primary-500 bg-primary-500/20 ring-1 ring-primary-500/50',
        purple: 'border-purple-500 bg-purple-500/20 ring-1 ring-purple-500/50',
        amber: 'border-amber-500 bg-amber-500/20 ring-1 ring-amber-500/50',
        rose: 'border-rose-500 bg-rose-500/20 ring-1 ring-rose-500/50',
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 group relative overflow-hidden active:scale-95 disabled:opacity-50 disabled:active:scale-100 ${isSelected ? selectedClasses[color as keyof typeof selectedClasses] : colorClasses[color as keyof typeof colorClasses]
                }`}
        >
            <div className="flex items-center gap-2 mb-1">
                {icon}
                <span className="font-black text-xs uppercase tracking-tighter">{label}</span>
            </div>
            <span className="text-xl font-black">{multiplier.toFixed(2)}x</span>

            {isSelected && (
                <div className="absolute top-1 right-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                </div>
            )}
        </button>
    );
}