'use client'

import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { LayoutDashboard, Users, CreditCard, Gamepad2, QrCode, LogOut, ChevronRight } from 'lucide-react'

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { user, isAuthenticated, isLoading } = useAuth(true)
    const router = useRouter()

    useEffect(() => {
        if (!isLoading && isAuthenticated && user && user.role !== 'admin') {
            router.push('/games')
        }
    }, [user, isAuthenticated, isLoading, router])

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
                <LoadingSpinner size="lg" />
            </div>
        )
    }

    if (!isAuthenticated || user?.role !== 'admin') {
        return null
    }

    const menuItems = [
        { href: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
        { href: '/admin/users', label: 'Users', icon: <Users size={20} /> },
        { href: '/admin/transactions', label: 'Transactions', icon: <CreditCard size={20} /> },
        { href: '/admin/game-history', label: 'Game History', icon: <Gamepad2 size={20} /> },
        { href: '/admin/payment-methods', label: 'Payment Methods', icon: <QrCode size={20} /> },
    ]

    return (
        <div className="min-h-screen bg-[#0a0a0f] flex">
            {/* Sidebar */}
            <aside className="w-64 glass border-r border-white/10 hidden md:flex flex-col sticky top-0 h-screen">
                <div className="p-6">
                    <Link href="/games" className="text-2xl font-bold bg-gradient-to-r from-primary-400 to-purple-400 bg-clip-text text-transparent">
                        BetX Admin
                    </Link>
                </div>

                <nav className="flex-1 px-4 space-y-2 py-4">
                    {menuItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-all text-gray-400 hover:text-white group"
                        >
                            <span className="text-gray-500 group-hover:text-primary-400 transition-colors">
                                {item.icon}
                            </span>
                            <span className="font-medium">{item.label}</span>
                            <ChevronRight size={16} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-white/5">
                    <div className="flex items-center gap-3 px-4 py-3">
                        <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center font-bold text-white">
                            {user.username[0].toUpperCase()}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-bold truncate">{user.username}</p>
                            <p className="text-xs text-gray-500 truncate">Administrator</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-900/10 via-transparent to-transparent">
                <header className="h-16 glass border-b border-white/10 flex items-center justify-between px-8 sticky top-0 z-40">
                    <h1 className="text-lg font-bold">Platform Overview</h1>
                    <div className="flex items-center gap-4">
                        <span className="text-xs px-2 py-1 rounded bg-green-500/10 text-green-500 font-medium border border-green-500/20">
                            Server Online
                        </span>
                        <Link href="/games" className="text-sm text-gray-400 hover:text-white transition-colors">
                            View Site
                        </Link>
                    </div>
                </header>
                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    )
}
