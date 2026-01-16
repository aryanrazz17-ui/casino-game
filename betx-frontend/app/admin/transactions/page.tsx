'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { Search, Filter, CheckCircle2, XCircle, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import toast from 'react-hot-toast'

export default function TransactionsManagement() {
    const [transactions, setTransactions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState('all')
    const [typeFilter, setTypeFilter] = useState('all')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)

    const fetchTransactions = async () => {
        try {
            setLoading(true)
            let url = `/admin/transactions?page=${page}`
            if (statusFilter !== 'all') url += `&status=${statusFilter}`
            if (typeFilter !== 'all') url += `&type=${typeFilter}`

            const response = await api.get(url)
            setTransactions(response.data.data.transactions)
            setTotalPages(response.data.data.totalPages)
        } catch (error) {
            toast.error('Failed to fetch transactions')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchTransactions()
    }, [page, statusFilter, typeFilter])

    const handleWithdrawalAction = async (id: string, action: 'approve' | 'reject') => {
        try {
            await api.put(`/admin/withdrawals/${id}`, { action, notes: `Processed by admin` })
            toast.success(`Withdrawal ${action}ed successfully`)
            fetchTransactions()
        } catch (error) {
            toast.error('Failed to process withdrawal')
        }
    }

    const handleDepositAction = async (id: string, action: 'approve' | 'reject') => {
        try {
            await api.put(`/admin/deposits/${id}`, { action, notes: `Verified by admin` })
            toast.success(`Deposit ${action}ed successfully`)
            fetchTransactions()
        } catch (error) {
            toast.error('Failed to process deposit')
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Transactions</h2>
                    <p className="text-gray-400">Monitor deposits, withdrawals, and game transactions.</p>
                </div>
                <div className="flex gap-2">
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary-500"
                    >
                        <option value="all">All Types</option>
                        <option value="deposit">Deposits</option>
                        <option value="withdrawal">Withdrawals</option>
                        <option value="bet">Bets</option>
                        <option value="win">Wins</option>
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary-500"
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                    </select>
                </div>
            </div>

            <div className="glass rounded-2xl border border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/5">
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Transaction</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">User</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Amount</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Status</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Date</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-6 py-8 h-16 bg-white/5" />
                                    </tr>
                                ))
                            ) : transactions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">No transactions found.</td>
                                </tr>
                            ) : (
                                transactions.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${tx.type === 'win' || tx.type === 'deposit'
                                                    ? 'bg-green-500/10 text-green-500'
                                                    : 'bg-red-500/10 text-red-500'
                                                    }`}>
                                                    {tx.type === 'win' || tx.type === 'deposit' ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm capitalize">{tx.type}</p>
                                                    <p className="text-[10px] text-gray-500 font-mono truncate w-24">{tx.id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm">
                                                <p className="font-medium">{tx.user?.username || 'Unknown'}</p>
                                                {tx.metadata?.utr ? (
                                                    <p className="text-[10px] text-primary-400 font-bold bg-primary-500/5 px-1.5 py-0.5 rounded border border-primary-500/10 inline-block mt-1">
                                                        UTR: {tx.metadata.utr}
                                                    </p>
                                                ) : (
                                                    <p className="text-xs text-gray-500">{tx.user?.email || ''}</p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-bold">
                                                {tx.currency} {parseFloat(tx.amount).toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {tx.status === 'completed' && <CheckCircle2 size={14} className="text-green-500" />}
                                                {tx.status === 'pending' && <Clock size={14} className="text-yellow-500" />}
                                                {tx.status === 'failed' && <XCircle size={14} className="text-red-500" />}
                                                <span className={`text-[10px] font-bold uppercase ${tx.status === 'completed' ? 'text-green-500' :
                                                    tx.status === 'pending' ? 'text-yellow-500' : 'text-red-500'
                                                    }`}>
                                                    {tx.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-400">
                                            {new Date(tx.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {tx.status === 'pending' && (
                                                <div className="flex items-center justify-end gap-2">
                                                    {(tx.type === 'withdrawal' || (tx.type === 'deposit' && tx.payment_gateway === 'manual_upi')) && (
                                                        <>
                                                            <button
                                                                onClick={() => tx.type === 'withdrawal' ? handleWithdrawalAction(tx.id, 'approve') : handleDepositAction(tx.id, 'approve')}
                                                                className="px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded-lg text-xs font-bold hover:bg-green-500/20 transition-all"
                                                            >
                                                                Approve
                                                            </button>
                                                            <button
                                                                onClick={() => tx.type === 'withdrawal' ? handleWithdrawalAction(tx.id, 'reject') : handleDepositAction(tx.id, 'reject')}
                                                                className="px-3 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg text-xs font-bold hover:bg-red-500/20 transition-all"
                                                            >
                                                                Reject
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                            {tx.status !== 'pending' && <span className="text-xs text-gray-600">-</span>}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-white/5 flex items-center justify-between">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(page - 1)}
                            className="px-4 py-2 bg-white/5 rounded-lg disabled:opacity-50 text-sm"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-gray-400">Page {page} of {totalPages}</span>
                        <button
                            disabled={page === totalPages}
                            onClick={() => setPage(page + 1)}
                            className="px-4 py-2 bg-white/5 rounded-lg disabled:opacity-50 text-sm"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
