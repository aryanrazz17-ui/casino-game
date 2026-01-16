'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { Search, UserCheck, UserX, Shield, MoreVertical, Mail, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'

export default function UsersManagement() {
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)

    const fetchUsers = async () => {
        try {
            setLoading(true)
            const response = await api.get(`/admin/users?page=${page}&search=${search}`)
            setUsers(response.data.data.users)
            setTotalPages(response.data.data.totalPages)
        } catch (error) {
            toast.error('Failed to fetch users')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchUsers()
    }, [page, search])

    const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
        try {
            await api.put(`/admin/users/${userId}`, { isActive: !currentStatus })
            toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`)
            fetchUsers()
        } catch (error) {
            toast.error('Failed to update user status')
        }
    }

    const handleRoleChange = async (userId: string, newRole: string) => {
        try {
            await api.put(`/admin/users/${userId}`, { role: newRole })
            toast.success(`User role updated to ${newRole}`)
            fetchUsers()
        } catch (error) {
            toast.error('Failed to update user role')
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">User Management</h2>
                    <p className="text-gray-400">View and manage platform users.</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search by username or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 w-full md:w-80 focus:outline-none focus:border-primary-500"
                    />
                </div>
            </div>

            <div className="glass rounded-2xl border border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/5">
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">User</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Status</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Role</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Balances</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Joined</th>
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
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">No users found.</td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary-600/20 flex items-center justify-center font-bold text-primary-400 text-sm">
                                                    {user.username[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm">{user.username}</p>
                                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                                        <Mail size={12} />
                                                        {user.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${user.is_active
                                                ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                                : 'bg-red-500/10 text-red-500 border-red-500/20'
                                                }`}>
                                                {user.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${user.role === 'admin'
                                                ? 'bg-purple-500/10 text-purple-500 border-purple-500/20'
                                                : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                                }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                {user.wallets?.map((w: any) => (
                                                    <div key={w.currency} className="text-xs">
                                                        <span className="text-gray-500">{w.currency}:</span>{' '}
                                                        <span className="font-medium">₹{w.balance.toLocaleString()}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1 text-xs text-gray-400">
                                                <Calendar size={12} />
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleToggleStatus(user.id, user.is_active)}
                                                    className={`p-2 rounded-lg transition-colors ${user.is_active ? 'hover:bg-red-500/10 text-red-500' : 'hover:bg-green-500/10 text-green-500'}`}
                                                    title={user.is_active ? 'Deactivate User' : 'Activate User'}
                                                >
                                                    {user.is_active ? <UserX size={18} /> : <UserCheck size={18} />}
                                                </button>
                                                <button
                                                    onClick={() => handleRoleChange(user.id, user.role === 'admin' ? 'user' : 'admin')}
                                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400"
                                                    title="Toggle Admin Role"
                                                >
                                                    <Shield size={18} />
                                                </button>
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
