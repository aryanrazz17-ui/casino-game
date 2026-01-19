'use client'

import { useEffect, useState, useRef, useMemo } from "react";
import api from "@/lib/api";
import { useWallet } from "@/hooks/useWallet";
import { formatCurrency, generateClientSeed, cn } from "@/lib/utils";
import { Card as UICard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Gamepad2,
  History,
  Shield,
  RotateCcw,
  Trash2,
  Undo2,
  CheckCircle2,
  Trophy,
  Info,
  Zap,
  Coins
} from "lucide-react";
import toast from "react-hot-toast";

// --- Constants ---

const CHIP_VALUES = [10, 50, 100, 500, 1000, 5000];
const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

const WHEEL_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

// --- Helpers ---

const getNumberColor = (num: number) => {
  if (num === 0) return 'green';
  return RED_NUMBERS.includes(num) ? 'red' : 'black';
};

interface Bet {
  placeId: string | number;
  amount: number;
}

export default function RouletteGame() {
  const { currentWallet, selectedCurrency, fetchWallets } = useWallet();
  const [bets, setBets] = useState<Bet[]>([]);
  const [selectedChipIndex, setSelectedChipIndex] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [outcome, setOutcome] = useState<number | null>(null);
  const [lastOutcomes, setLastOutcomes] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [winAmount, setWinAmount] = useState<number>(0);

  const totalBet = useMemo(() => bets.reduce((sum, b) => sum + b.amount, 0), [bets]);

  const handlePlaceBet = (placeId: string | number) => {
    if (isSpinning) return;
    const amount = CHIP_VALUES[selectedChipIndex];

    setBets(prev => {
      const existingIndex = prev.findIndex(b => b.placeId === placeId);
      if (existingIndex > -1) {
        const newBets = [...prev];
        newBets[existingIndex].amount += amount;
        return newBets;
      }
      return [...prev, { placeId, amount }];
    });
  };

  const handleUndo = () => {
    if (isSpinning || bets.length === 0) return;
    setBets(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (isSpinning) return;
    setBets([]);
    setOutcome(null);
    setWinAmount(0);
  };

  const handleSpin = async () => {
    if (isSpinning || bets.length === 0) return;
    if (!currentWallet || currentWallet.balance < totalBet) {
      return toast.error("Insufficient balance");
    }

    setIsLoading(true);
    setOutcome(null);
    setWinAmount(0);

    try {
      const { data } = await api.post("/roulette/bet", {
        bets,
        clientSeed: generateClientSeed(),
        currency: selectedCurrency
      });

      if (data.status) {
        setIsSpinning(true);

        // Calculate target rotation
        const outcomeIndex = WHEEL_NUMBERS.indexOf(data.outcome);
        const sectionAngle = 360 / 37;
        const targetAngle = 360 * 5 + (360 - (outcomeIndex * sectionAngle)); // 5 full spins + offset

        setWheelRotation(prev => prev + targetAngle);

        setTimeout(() => {
          setOutcome(data.outcome);
          setWinAmount(data.totalWin);
          setLastOutcomes(prev => [data.outcome, ...prev].slice(0, 10));
          setIsSpinning(false);
          setIsLoading(false);

          if (data.totalWin > 0) {
            toast.success(`Win: ${formatCurrency(data.totalWin, selectedCurrency)}!`, {
              icon: '💰',
              style: { background: '#10b981', color: '#fff', fontWeight: 'bold' }
            });
          }

          fetchWallets();
        }, 4000);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Spin failed");
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto p-2 md:p-4 space-y-4 min-h-screen bg-[#0a0a0f]">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-zinc-900/40 p-3 rounded-2xl border border-white/5 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-red-600 to-red-900 rounded-xl shadow-lg border border-red-500/20">
            <Gamepad2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tighter uppercase italic leading-none">Premium Roulette</h1>
            <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mt-1">European Rules • 35:1 Payouts</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="px-3 py-2 rounded-xl border border-white/5 bg-black/40 flex items-center gap-3">
            <div className="flex items-center gap-2 mr-2 border-r border-white/10 pr-3">
              <History className="w-3 h-3 text-gray-500" />
              <span className="text-[9px] uppercase font-bold text-gray-500">History</span>
            </div>
            <div className="flex gap-2">
              {lastOutcomes.length === 0 && <span className="text-xs text-gray-600 italic">No history yet</span>}
              {lastOutcomes.map((n, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-lg border border-white/10 animate-in zoom-in duration-300",
                    getNumberColor(n) === 'red' ? 'bg-red-600 text-white' :
                      getNumberColor(n) === 'black' ? 'bg-zinc-900 text-white' : 'bg-green-600 text-white'
                  )}
                >
                  {n}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

        {/* Left Column: Roulette wheel animation */}
        <div className="xl:col-span-4 space-y-4">
          <div className="relative aspect-square max-w-[340px] mx-auto group">
            {/* Wheel Platform */}
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-800 to-zinc-950 rounded-full shadow-[0_15px_40px_rgba(0,0,0,0.8)] border-[10px] border-zinc-900 flex items-center justify-center overflow-hidden">
              {/* Image-based Wheel */}
              <div
                className="w-[92%] h-[92%] transition-transform duration-[4000ms] cubic-bezier(0.1, 0, 0.1, 1)"
                style={{
                  transform: `rotate(${wheelRotation}deg)`,
                  backgroundImage: `url('/games/roulette/wheel.png')`,
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center'
                }}
              />

              {/* Ball animation overlay */}
              {isSpinning && (
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center">
                  <div className="w-4 h-4 rounded-full bg-white shadow-[0_0_15px_#fff] animate-bounce" />
                </div>
              )}
            </div>

            {/* Static Pointer */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-4 z-20">
              <div className="w-8 h-8 bg-amber-500 rotate-45 border-r-4 border-b-4 border-amber-600 shadow-xl" />
            </div>

            {/* Outcome Center Display */}
            {!isSpinning && outcome !== null && (
              <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                <div className={cn(
                  "w-32 h-32 rounded-full border-8 border-white/20 shadow-2xl flex flex-col items-center justify-center animate-in zoom-in duration-500",
                  getNumberColor(outcome) === 'red' ? 'bg-red-600' :
                    getNumberColor(outcome) === 'black' ? 'bg-zinc-950' : 'bg-green-600'
                )}>
                  <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">Result</span>
                  <span className="text-6xl font-black text-white">{outcome}</span>
                </div>
              </div>
            )}
          </div>

          <UICard className="bg-dark-100/50 border-white/5 p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Game Status
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-white/5">
                <span className="text-xs text-gray-500 font-bold uppercase">Total Wagered</span>
                <span className="text-xl font-black text-white">{formatCurrency(totalBet, selectedCurrency)}</span>
              </div>
              {winAmount > 0 && (
                <div className="flex justify-between items-center bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 animate-bounce">
                  <span className="text-xs text-emerald-500 font-bold uppercase">Last Win</span>
                  <span className="text-xl font-black text-emerald-400">+{formatCurrency(winAmount, selectedCurrency)}</span>
                </div>
              )}
              <div className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-white/5">
                <span className="text-xs text-gray-500 font-bold uppercase">State</span>
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", isSpinning ? "bg-amber-500 animate-pulse" : "bg-emerald-500")} />
                  <span className={cn("text-xs font-bold uppercase", isSpinning ? "text-amber-500" : "text-emerald-500")}>
                    {isSpinning ? "Spinning" : "Taking Bets"}
                  </span>
                </div>
              </div>
            </div>
          </UICard>
        </div>

        {/* Right Column: Betting Board */}
        <div className="xl:col-span-8 flex flex-col gap-4">
          <UICard className="bg-[#050510] border-white/10 p-1 md:p-3 overflow-hidden relative shadow-inner">
            {/* The Green Felt Grid Background effect */}
            <div className="absolute inset-0 bg-emerald-950/20 pointer-events-none opacity-20" />

            {/* Betting Grid Container */}
            <div className="relative z-10 overflow-x-auto no-scrollbar pb-1">
              <div className="flex items-stretch min-w-[700px] h-[200px]">
                {/* 0 (Green) */}
                <div
                  onClick={() => handlePlaceBet(0)}
                  className={cn(
                    "w-16 bg-green-700/80 hover:bg-green-600 border-2 border-white/10 rounded-l-3xl flex items-center justify-center cursor-pointer transition-all relative group",
                    bets.some(b => b.placeId === 0) && "ring-4 ring-amber-400/50 bg-green-600"
                  )}
                >
                  <span className="text-2xl font-black text-white -rotate-90">0</span>
                  {renderBetChip(bets.find(b => b.placeId === 0))}
                </div>

                {/* Grid numbers 1-36 */}
                <div className="flex-1 grid grid-rows-3 grid-flow-col gap-1 p-1">
                  {Array.from({ length: 36 }, (_, i) => {
                    const n = i + 1;
                    const color = getNumberColor(n);
                    const hasBet = bets.find(b => b.placeId === n);
                    return (
                      <div
                        key={n}
                        onClick={() => handlePlaceBet(n)}
                        className={cn(
                          "relative flex items-center justify-center border-2 border-white/5 cursor-pointer transition-all hover:scale-95 active:scale-90",
                          color === 'red' ? "bg-red-700/90 hover:bg-red-600" : "bg-zinc-900/90 hover:bg-zinc-800",
                          hasBet && "ring-4 ring-amber-400/50 z-10"
                        )}
                      >
                        <span className="text-base font-black text-white">{n}</span>
                        {renderBetChip(hasBet)}
                      </div>
                    );
                  })}
                </div>

                {/* 2 to 1 column bets */}
                <div className="flex flex-col gap-1 w-14 px-1">
                  {[2, 1, 0].map(i => (
                    <div
                      key={i}
                      onClick={() => handlePlaceBet(`2:1:${i}`)}
                      className="flex-1 bg-white/5 hover:bg-white/10 border-2 border-white/5 flex items-center justify-center cursor-pointer relative group"
                    >
                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-tighter">2:1</span>
                      {renderBetChip(bets.find(b => b.placeId === `2:1:${i}`))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Outside Bets Rows */}
              <div className="flex flex-col gap-1 ml-16 mr-14 mt-1 min-w-[700px]">
                <div className="flex h-10 gap-1">
                  <OutsideBet label="1st 12" onClick={() => handlePlaceBet('1_to_12')} bet={bets.find(b => b.placeId === '1_to_12')} />
                  <OutsideBet label="2nd 12" onClick={() => handlePlaceBet('13_to_24')} bet={bets.find(b => b.placeId === '13_to_24')} />
                  <OutsideBet label="3rd 12" onClick={() => handlePlaceBet('25_to_36')} bet={bets.find(b => b.placeId === '25_to_36')} />
                </div>
                <div className="flex h-10 gap-1">
                  <OutsideBet label="1 to 18" onClick={() => handlePlaceBet('1_to_18')} bet={bets.find(b => b.placeId === '1_to_18')} />
                  <OutsideBet label="Even" onClick={() => handlePlaceBet('Even')} bet={bets.find(b => b.placeId === 'Even')} />
                  <OutsideBet label="RED" color="red" onClick={() => handlePlaceBet('Red')} bet={bets.find(b => b.placeId === 'Red')} />
                  <OutsideBet label="BLACK" color="black" onClick={() => handlePlaceBet('Black')} bet={bets.find(b => b.placeId === 'Black')} />
                  <OutsideBet label="Odd" onClick={() => handlePlaceBet('Odd')} bet={bets.find(b => b.placeId === 'Odd')} />
                  <OutsideBet label="19 to 36" onClick={() => handlePlaceBet('19_to_36')} bet={bets.find(b => b.placeId === '19_to_36')} />
                </div>
              </div>
            </div>
          </UICard>

          {/* Controls & Chip Selector */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-zinc-900/50 p-4 rounded-3xl border border-white/5 shadow-2xl">
            <div className="md:col-span-8 space-y-3">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-500" />
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Select Chips</span>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                {CHIP_VALUES.map((val, idx) => (
                  <button
                    key={val}
                    onClick={() => setSelectedChipIndex(idx)}
                    className={cn(
                      "w-10 h-10 md:w-14 md:h-14 rounded-full border-4 flex items-center justify-center transition-all shadow-xl font-black text-[9px] md:text-xs",
                      selectedChipIndex === idx ? "scale-110 -translate-y-1 border-white shadow-amber-500/20" : "border-black/50 hover:scale-105"
                    )}
                    style={{
                      background: `conic-gradient(#fff 0deg 45deg, hsl(${idx * 60}, 70%, 50%) 45deg)`,
                      backgroundColor: `hsl(${idx * 60}, 70%, 50%)`,
                      color: 'white'
                    }}
                  >
                    <div className="w-[85%] h-[85%] rounded-full bg-inherit border-[2px] border-dashed border-white/30 flex items-center justify-center">
                      {val >= 1000 ? `${val / 1000}k` : val}
                    </div>
                  </button>
                ))}

                <div className="flex gap-2 ml-auto">
                  <button onClick={handleUndo} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all active:scale-90">
                    <Undo2 className="w-4 h-4" />
                  </button>
                  <button onClick={handleClear} className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/10 text-red-500 transition-all active:scale-90">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="md:col-span-4">
              <Button
                onClick={handleSpin}
                disabled={isSpinning || bets.length === 0 || isLoading}
                className={cn(
                  "w-full h-full min-h-[80px] text-xl font-black rounded-2xl transition-all shadow-2xl relative overflow-hidden group",
                  isSpinning || bets.length === 0 || isLoading ? "bg-zinc-800 text-gray-600" : "bg-gradient-to-br from-red-600 to-amber-600 text-white hover:scale-[1.02] active:scale-95 shadow-red-500/20"
                )}
              >
                {!isSpinning && !isLoading && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                )}
                {isSpinning ? (
                  <div className="flex flex-col items-center gap-2">
                    <RotateCcw className="w-8 h-8 animate-spin" />
                    <span className="text-xs uppercase tracking-[0.3em]">Spinning...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Trophy className="w-8 h-8" />
                    <span className="tracking-tighter uppercase italic">SPIN WHEEL</span>
                  </div>
                )}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between px-4">
            <div className="flex items-center gap-2 text-gray-500">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Provably Fair System Active</span>
            </div>
            <button className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors">
              <Info className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest underline underline-offset-4">Table Limits & Help</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Sub-components ---

function OutsideBet({ label, onClick, bet, color }: { label: string, onClick: () => void, bet?: Bet, color?: 'red' | 'black' }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex-1 h-full border-2 border-white/5 flex items-center justify-center cursor-pointer transition-all hover:bg-white/10 relative",
        bet ? "ring-4 ring-amber-400/50 bg-amber-500/20" : "bg-white/5",
        color === 'red' && "text-red-500",
        color === 'black' && "text-zinc-500"
      )}
    >
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      {renderBetChip(bet)}
    </div>
  );
}

function renderBetChip(bet?: Bet) {
  if (!bet) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
      <div className="w-10 h-10 rounded-full bg-amber-500 border-2 border-white shadow-[0_4px_10px_rgba(0,0,0,0.5)] flex items-center justify-center scale-75 animate-in zoom-in-50 duration-200">
        <div className="w-[85%] h-[85%] rounded-full border border-dashed border-white/40 flex items-center justify-center">
          <span className="text-[9px] font-black text-white">
            {bet.amount >= 1000 ? `${bet.amount / 1000}k` : bet.amount}
          </span>
        </div>
      </div>
    </div>
  );
}
