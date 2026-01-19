'use client'

import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'
import {
    cn,
    formatCurrency as utilsFormatCurrency,
    formatDate as utilsFormatDate
} from '@/lib/utils'
import {
    History,
    TrendingUp,
    TrendingDown,
    Wallet,
    Gamepad2,
    Clock,
    ArrowUpRight,
    ArrowDownLeft,
    ChevronLeft,
    ChevronRight,
    RefreshCw
} from 'lucide-react'

export default function HistoryPage() {
    const [tab, setTab] = useState<'all' | 'bets' | 'deposits' | 'withdrawals'>('all')
    const [history, setHistory] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [refreshing, setRefreshing] = useState(false)

    const fetchHistory = useCallback(async (p = 1, t = tab, isRefresh = false) => {
        if (!isRefresh) setLoading(true)
        else setRefreshing(true)

        try {
            const response = await api.get(`/user/history?tab=${t}&page=${p}&limit=20`)
            if (response.data?.success) {
                setHistory(response.data.data.history)
                setTotalPages(response.data.data.pagination.totalPages)
            }
        } catch (error) {
            console.error('Failed to fetch history:', error)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [tab])

    useEffect(() => {
        fetchHistory(page, tab)
    }, [page, tab, fetchHistory])

    // Listen for real-time updates
    useEffect(() => {
        const handleUpdate = () => {
            console.log('Real-time history update received, refreshing...')
            fetchHistory(1, tab, true)
        }
        window.addEventListener('betx:history_update', handleUpdate)
        return () => window.removeEventListener('betx:history_update', handleUpdate)
    }, [tab, fetchHistory])

    const getIcon = (type: string) => {
        switch (type) {
            case 'bet': return <ArrowUpRight className="w-5 h-5 text-gray-400" />
            case 'win': return <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
            case 'game': return <Gamepad2 className="w-5 h-5 text-purple-400" />
            case 'deposit': return <Wallet className="w-5 h-5 text-blue-400" />
            case 'withdrawal': return <ArrowUpRight className="w-5 h-5 text-orange-400" />
            default: return <History className="w-5 h-5 text-gray-400" />
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
            case 'approved': return 'text-emerald-400 bg-emerald-400/10'
            case 'pending':
            case 'processing': return 'text-amber-400 bg-amber-400/10'
            case 'failed':
            case 'rejected':
            case 'cancelled': return 'text-red-400 bg-red-400/10'
            default: return 'text-gray-400 bg-gray-400/10'
        }
    }

    const tabs = [
        { id: 'all', label: 'All History', icon: History },
        { id: 'bets', label: 'Game Bets', icon: Gamepad2 },
        { id: 'deposits', label: 'Deposits', icon: TrendingDown },
        { id: 'withdrawals', label: 'Withdrawals', icon: TrendingUp },
    ]

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <History className="w-6 h-6 text-purple-500" />
                        Transactions & History
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">View all your game activities and money movements</p>
                </div>

                <button
                    onClick={() => fetchHistory(page, tab, true)}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors border border-white/10 disabled:opacity-50"
                >
                    <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
                    Refresh
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10 overflow-x-auto no-scrollbar">
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => {
                            setTab(t.id as any)
                            setPage(1)
                        }}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                            tab === t.id
                                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20"
                                : "text-gray-400 hover:text-white hover:bg-white/5"
                        )}
                    >
                        <t.icon className="w-4 h-4" />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="bg-[#12121a] rounded-2xl border border-white/5 overflow-hidden">
                {loading ? (
                    <div className="p-12 flex flex-col items-center justify-center space-y-4">
                        <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
                        <p className="text-gray-400 animate-pulse">Loading your history...</p>
                    </div>
                ) : history.length === 0 ? (
                    <div className="p-20 flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
                            <History className="w-10 h-10 text-gray-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">No history found</h3>
                        <p className="text-gray-400 max-w-xs mt-2">
                            You haven't made any {tab === 'all' ? 'transactions' : tab} yet. Start playing to see them here!
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Type / Game</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Time</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Balance After</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {history.map((item) => (
                                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center border border-white/5 group-hover:border-white/10 transition-colors",
                                                    item.type === 'win' || (item.type === 'game' && item.payout > item.amount) ? 'bg-emerald-500/10' :
                                                        item.type === 'bet' ? 'bg-gray-500/10' :
                                                            item.type === 'deposit' ? 'bg-blue-500/10' :
                                                                item.type === 'game' && item.payout < item.amount ? 'bg-red-500/10' : 'bg-orange-500/10'
                                                )}>
                                                    {getIcon(item.type)}
                                                </div>
                                                <div>
                                                    <p className="text-white font-medium capitalize">{item.type}</p>
                                                    {item.game && (
                                                        <p className="text-xs text-purple-400 font-medium uppercase tracking-tighter">
                                                            {item.game.replace('-', ' ')}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className={cn(
                                                    "font-bold text-lg",
                                                    item.type === 'win' || item.type === 'deposit' || (item.type === 'game' && item.payout > item.amount) ? 'text-emerald-400' :
                                                        (item.type === 'game' && item.payout < item.amount && item.payout > 0) ? 'text-amber-400' :
                                                            (item.type === 'game' && item.payout === 0) ? 'text-red-400' : 'text-white'
                                                )}>
                                                    {item.type === 'win' || item.type === 'deposit' ? '+' :
                                                        item.type === 'game' ? (item.payout > 0 ? '+' : '-') : '-'}{utilsFormatCurrency(item.type === 'game' && item.payout > 0 ? item.payout : item.amount, item.currency)}
                                                </span>
                                                {item.gameStatus && (
                                                    <span className={cn(
                                                        "text-[10px] font-bold px-1.5 py-0.5 rounded w-fit mt-1",
                                                        item.gameStatus === 'WIN' ? 'bg-emerald-500/20 text-emerald-400' :
                                                            item.gameStatus === 'PUSH' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
                                                    )}>
                                                        {item.gameStatus}
                                                    </span>
                                                )}
                                                {item.multiplier > 0 && (
                                                    <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 w-fit mt-1">
                                                        {item.multiplier.toFixed(2)}x
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                                                getStatusColor(item.status)
                                            )}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-white text-sm font-medium">
                                                    {utilsFormatDate(item.time).split(',')[0]}
                                                </span>
                                                <span className="text-gray-500 text-xs">
                                                    {utilsFormatDate(item.time).split(',')[1]}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-gray-300 font-mono text-sm">
                                                    {item.balanceAfter !== undefined && item.balanceAfter !== null
                                                        ? utilsFormatCurrency(item.balanceAfter, item.currency)
                                                        : '---'}
                                                </span>
                                                <span className="text-[10px] text-gray-600 flex items-center gap-1 uppercase mt-1">
                                                    <Clock className="w-2.5 h-2.5" />
                                                    {item.balanceAfter !== undefined ? 'Audit Logged' : 'Game Record'}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {!loading && history.length > 0 && (
                    <div className="p-4 bg-white/[0.01] border-t border-white/5 flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                            Showing page <span className="text-white font-medium">{page}</span> of <span className="text-white font-medium">{totalPages}</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
