'use client'

import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LayoutDashboard, Users, CreditCard, Gamepad2, QrCode, LogOut, ChevronRight, Menu, X } from 'lucide-react'

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { user, isAuthenticated, isLoading } = useAuth(true)
    const router = useRouter()
    const pathname = usePathname()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    useEffect(() => {
        if (!isLoading && isAuthenticated && user && user.role !== 'admin') {
            router.push('/games')
        }
    }, [user, isAuthenticated, isLoading, router])

    // Close mobile menu when route changes
    useEffect(() => {
        setMobileMenuOpen(false)
    }, [pathname])

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

    const isActiveRoute = (href: string) => {
        if (href === '/admin') {
            return pathname === '/admin'
        }
        return pathname?.startsWith(href)
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f] flex">
            {/* Desktop Sidebar */}
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
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${isActiveRoute(item.href)
                                    ? 'bg-primary-600/20 text-white border border-primary-500/30'
                                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <span className={`transition-colors ${isActiveRoute(item.href) ? 'text-primary-400' : 'text-gray-500 group-hover:text-primary-400'
                                }`}>
                                {item.icon}
                            </span>
                            <span className="font-medium">{item.label}</span>
                            <ChevronRight size={16} className={`ml-auto transition-opacity ${isActiveRoute(item.href) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                }`} />
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

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            <aside className={`fixed top-0 left-0 h-full w-72 glass border-r border-white/10 flex flex-col z-50 md:hidden transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                }`}>
                <div className="p-6 flex items-center justify-between">
                    <Link href="/games" className="text-2xl font-bold bg-gradient-to-r from-primary-400 to-purple-400 bg-clip-text text-transparent">
                        BetX Admin
                    </Link>
                    <button
                        onClick={() => setMobileMenuOpen(false)}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <X size={24} className="text-gray-400" />
                    </button>
                </div>

                <nav className="flex-1 px-4 space-y-2 py-4 overflow-y-auto">
                    {menuItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${isActiveRoute(item.href)
                                    ? 'bg-primary-600/20 text-white border border-primary-500/30'
                                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <span className={`transition-colors ${isActiveRoute(item.href) ? 'text-primary-400' : 'text-gray-500 group-hover:text-primary-400'
                                }`}>
                                {item.icon}
                            </span>
                            <span className="font-medium">{item.label}</span>
                            <ChevronRight size={16} className={`ml-auto transition-opacity ${isActiveRoute(item.href) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                }`} />
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
                    <Link
                        href="/games"
                        className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm text-gray-400 hover:text-white"
                    >
                        <LogOut size={16} />
                        <span>View Site</span>
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-900/10 via-transparent to-transparent">
                <header className="h-16 glass border-b border-white/10 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30">
                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileMenuOpen(true)}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors md:hidden"
                    >
                        <Menu size={24} className="text-gray-400" />
                    </button>

                    <h1 className="text-base md:text-lg font-bold">Platform Overview</h1>

                    <div className="flex items-center gap-2 md:gap-4">
                        <span className="text-[10px] md:text-xs px-2 py-1 rounded bg-green-500/10 text-green-500 font-medium border border-green-500/20">
                            Online
                        </span>
                        <Link href="/games" className="hidden md:block text-sm text-gray-400 hover:text-white transition-colors">
                            View Site
                        </Link>
                    </div>
                </header>
                <div className="p-4 md:p-8">
                    {children}
                </div>
            </main>
        </div>
    )
}
