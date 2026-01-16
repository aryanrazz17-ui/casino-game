'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { Search, Gamepad2, Calendar, Mail, TrendingUp, Filter, Tally5, Wallet, ChevronLeft, ChevronRight, X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function EnhancedGameHistory() {
    const [games, setGames] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)

    // Filters
    const [search, setSearch] = useState('')
    const [gameType, setGameType] = useState('all')
    const [winStatus, setWinStatus] = useState('all')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')

    const fetchGames = async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams({
                page: page.toString(),
                search,
                gameType,
                isWin: winStatus,
                startDate,
                endDate
            })

            const response = await api.get(`/admin/games?${params.toString()}`)
            setGames(response.data.data.games)
            setTotalPages(response.data.data.totalPages)
        } catch (error) {
            toast.error('Failed to fetch game history')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchGames()
    }, [page, gameType, winStatus, startDate, endDate])

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setPage(1)
        fetchGames()
    }

    const clearFilters = () => {
        setSearch('')
        setGameType('all')
        setWinStatus('all')
        setStartDate('')
        setEndDate('')
        setPage(1)
    }

    const getGameBadgeColor = (type: string) => {
        switch (type.toLowerCase()) {
            case 'dice': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
            case 'crash': return 'bg-red-500/10 text-red-400 border-red-500/20'
            case 'mines': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
            case 'plinko': return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
            case 'slots': return 'bg-green-500/10 text-green-400 border-green-500/20'
            default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-extrabold tracking-tight">Game Audit</h2>
                <p className="text-gray-400 mt-1">Detailed history of all bets across the platform.</p>
            </div>

            {/* Filters Bar */}
            <div className="glass rounded-2xl border border-white/10 p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Search */}
                    <form onSubmit={handleSearchSubmit} className="relative lg:col-span-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Email or Username"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 w-full text-sm focus:outline-none focus:border-primary-500 transition-colors"
                        />
                    </form>

                    {/* Game Type */}
                    <div className="relative">
                        <Gamepad2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                        <select
                            value={gameType}
                            onChange={(e) => { setGameType(e.target.value); setPage(1); }}
                            className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 w-full text-sm focus:outline-none focus:border-primary-500 appearance-none"
                        >
                            <option value="all">All Games</option>
                            <option value="dice">Dice</option>
                            <option value="crash">Crash</option>
                            <option value="mines">Mines</option>
                            <option value="plinko">Plinko</option>
                            <option value="slots">Slots</option>
                        </select>
                    </div>

                    {/* Win/Loss */}
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                        <select
                            value={winStatus}
                            onChange={(e) => { setWinStatus(e.target.value); setPage(1); }}
                            className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 w-full text-sm focus:outline-none focus:border-primary-500 appearance-none"
                        >
                            <option value="all">All Status</option>
                            <option value="true">Wins Only</option>
                            <option value="false">Losses Only</option>
                        </select>
                    </div>

                    {/* Date Range */}
                    <div className="relative lg:col-span-2 grid grid-cols-2 gap-2">
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                                className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 w-full text-sm focus:outline-none focus:border-primary-500"
                            />
                        </div>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                                className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 w-full text-sm focus:outline-none focus:border-primary-500"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={clearFilters}
                        className="text-xs text-gray-500 hover:text-white flex items-center gap-1 transition-colors"
                    >
                        <X size={12} /> Clear all filters
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="glass rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                <div className="overflow-x-scroll lg:overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/5">
                                <th className="px-6 py-5 text-xs font-bold uppercase tracking-wider text-gray-400">User Email</th>
                                <th className="px-6 py-5 text-xs font-bold uppercase tracking-wider text-gray-400">Game</th>
                                <th className="px-6 py-5 text-xs font-bold uppercase tracking-wider text-gray-400">Bet Amount</th>
                                <th className="px-6 py-5 text-xs font-bold uppercase tracking-wider text-gray-400">Multiplier</th>
                                <th className="px-6 py-5 text-xs font-bold uppercase tracking-wider text-gray-400">Payout</th>
                                <th className="px-6 py-5 text-xs font-bold uppercase tracking-wider text-gray-400">Win / Loss</th>
                                <th className="px-6 py-5 text-xs font-bold uppercase tracking-wider text-gray-400">Currency</th>
                                <th className="px-6 py-5 text-xs font-bold uppercase tracking-wider text-gray-400">Created At</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={8} className="px-6 py-8 bg-white/5" />
                                    </tr>
                                ))
                            ) : games.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-20 text-center text-gray-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <Tally5 size={40} className="text-gray-700" />
                                            <p className="font-medium">No game records matching your criteria.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                games.map((game) => (
                                    <tr key={game.id} className="hover:bg-white/5 transition-all group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-white group-hover:text-primary-400 transition-colors">
                                                    {game.user?.username || 'Anonymous'}
                                                </span>
                                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                    <Mail size={12} />
                                                    {game.user?.email || 'N/A'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border tracking-wider ${getGameBadgeColor(game.game_type)}`}>
                                                {game.game_type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 font-mono text-sm">
                                                <span className="text-gray-400">₹</span>
                                                <span className="font-bold">{parseFloat(game.bet_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1 text-sm font-mono font-medium text-gray-300">
                                                <TrendingUp size={14} className="text-gray-600" />
                                                {game.multiplier.toFixed(2)}x
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`flex items-center gap-1.5 font-mono text-sm ${game.is_win ? 'text-green-400' : 'text-gray-500'}`}>
                                                <span className="opacity-60">₹</span>
                                                <span className="font-bold">{parseFloat(game.payout).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-sm border ${game.is_win
                                                ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                                : 'bg-red-500/10 text-red-500 border-red-500/20'
                                                }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${game.is_win ? 'bg-green-500' : 'bg-red-500'}`} />
                                                {game.is_win ? 'Win' : 'Loss'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                                                <Wallet size={12} />
                                                {game.currency}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col text-[11px] text-gray-500 font-mono">
                                                <div className="flex items-center gap-1">
                                                    <Calendar size={10} />
                                                    {new Date(game.created_at).toLocaleDateString()}
                                                </div>
                                                <span className="opacity-60 ml-3.5">
                                                    {new Date(game.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-6 border-t border-white/5 flex items-center justify-between bg-white/[0.02]">
                        <p className="text-sm text-gray-500">
                            Showing page <span className="text-white font-bold">{page}</span> of <span className="text-white font-bold">{totalPages}</span>
                        </p>
                        <div className="flex gap-2">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(page - 1)}
                                className="p-2 bg-white/5 items-center justify-center rounded-lg disabled:opacity-30 hover:bg-white/10 transition-colors border border-white/5"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <button
                                disabled={page === totalPages}
                                onClick={() => setPage(page + 1)}
                                className="p-2 bg-white/5 items-center justify-center rounded-lg disabled:opacity-30 hover:bg-white/10 transition-colors border border-white/5"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
