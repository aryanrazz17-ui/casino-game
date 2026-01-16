'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { Users, Gamepad2, CreditCard, TrendingUp, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react'

interface Stats {
    users: { total: number; active: number }
    games: { total: number; byType: any[] }
    transactions: { total: number; pending: number; byType: any[] }
    revenue: { totalBets: number; totalPayouts: number; houseProfit: number }
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<Stats | null>(null)
    const [loading, setLoading] = useState(true)
    const [period, setPeriod] = useState('today')

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get(`/admin/stats?period=${period}`)
                setStats(response.data.data)
            } catch (error) {
                console.error('Failed to fetch stats:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchStats()
    }, [period])

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-32 glass rounded-2xl animate-pulse" />
                ))}
            </div>
        )
    }

    const statCards = [
        {
            label: 'Total Users',
            value: stats?.users.total || 0,
            subLabel: `${stats?.users.active || 0} active`,
            icon: <Users className="text-blue-400" />,
            trend: '+12%',
            trendUp: true
        },
        {
            label: 'Total Bets',
            value: `₹${stats?.revenue.totalBets.toLocaleString() || 0}`,
            subLabel: `${stats?.games.total || 0} games played`,
            icon: <Activity className="text-purple-400" />,
            trend: '+5.4%',
            trendUp: true
        },
        {
            label: 'House Profit',
            value: `₹${stats?.revenue.houseProfit.toLocaleString() || 0}`,
            subLabel: 'Across all games',
            icon: <TrendingUp className="text-green-400" />,
            trend: '+8.2%',
            trendUp: true
        },
        {
            label: 'Pending Actions',
            value: stats?.transactions.pending || 0,
            subLabel: 'Withdrawals to approve',
            icon: <CreditCard className="text-yellow-400" />,
            trend: stats?.transactions.pending ? 'Action needed' : 'All clear',
            trendUp: !stats?.transactions.pending
        }
    ]

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold">Admin Dashboard</h2>
                    <p className="text-gray-400">Monitor platform performance and user activity.</p>
                </div>
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                    {['today', 'week', 'month', 'all'].map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${period === p ? 'bg-primary-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((card, i) => (
                    <div key={i} className="glass p-6 rounded-2xl border border-white/5 hover:border-primary-500/30 transition-all hover:-translate-y-1">
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 bg-white/5 rounded-xl">
                                {card.icon}
                            </div>
                            <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${card.trendUp ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                }`}>
                                {card.trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                {card.trend}
                            </div>
                        </div>
                        <h3 className="text-sm font-medium text-gray-400">{card.label}</h3>
                        <div className="flex items-baseline gap-2 mt-1">
                            <p className="text-2xl font-bold">{card.value}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{card.subLabel}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Game Performance */}
                <div className="glass p-6 rounded-2xl border border-white/5">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold">Game Performance</h3>
                        <Gamepad2 size={20} className="text-gray-500" />
                    </div>
                    <div className="space-y-4">
                        {stats?.games.byType.map((game: any) => (
                            <div key={game.id} className="group">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="capitalize text-gray-400 group-hover:text-white transition-colors">{game.id}</span>
                                    <span className="font-medium">₹{game.totalBets.toLocaleString()}</span>
                                </div>
                                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary-600 rounded-full"
                                        style={{ width: `${Math.min(100, (game.totalBets / (stats?.revenue.totalBets || 1)) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Platform Overview */}
                <div className="glass p-6 rounded-2xl border border-white/5 flex flex-col justify-center items-center text-center">
                    <div className="w-20 h-20 bg-primary-600/20 rounded-full flex items-center justify-center mb-4">
                        <Activity size={40} className="text-primary-500 animate-pulse" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Real-time Activity</h3>
                    <p className="text-gray-400 max-w-xs mx-auto mb-6">
                        Platform usage is currently normal. Monitoring systems are active and reporting no issues.
                    </p>
                    <div className="grid grid-cols-2 gap-4 w-full">
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Latency</p>
                            <p className="text-lg font-bold text-green-400">24ms</p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Uptime</p>
                            <p className="text-lg font-bold text-green-400">99.9%</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
