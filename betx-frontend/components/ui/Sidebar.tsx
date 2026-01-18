'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { useWallet } from '@/hooks/useWallet'
import { formatCurrency } from '@/lib/utils'
import {
    Gamepad2,
    Wallet,
    User,
    Settings,
    LogOut,
    LayoutDashboard,
    ChevronLeft,
    ChevronRight
} from 'lucide-react'
import { useState } from 'react'

export function Sidebar() {
    const pathname = usePathname()
    const { user, logout } = useAuthStore()
    const { currentWallet, selectedCurrency } = useWallet()
    const [isCollapsed, setIsCollapsed] = useState(false)

    const navLinks = [
        { href: '/games', label: 'Games', icon: Gamepad2 },
        { href: '/wallet', label: 'Wallet', icon: Wallet },
        { href: '/profile', label: 'Profile', icon: User },
    ]

    if (user?.role === 'admin') {
        navLinks.push({ href: '/admin', label: 'Admin', icon: LayoutDashboard })
    }

    return (
        <aside
            className={`hidden md:flex flex-col fixed left-0 top-0 h-screen bg-[#15151b] border-r border-white/10 transition-all duration-300 z-50 ${isCollapsed ? 'w-20' : 'w-64'
                }`}
        >
            {/* Logo Area */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
                {!isCollapsed && (
                    <Link href="/games" className="text-2xl font-black bg-gradient-to-r from-primary-400 to-purple-400 bg-clip-text text-transparent truncate">
                        BetX
                    </Link>
                )}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors ml-auto"
                >
                    {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                </button>
            </div>

            {/* Navigation Links */}
            <div className="flex-1 overflow-y-auto py-6 px-3 space-y-2">
                {navLinks.map((link) => {
                    const isActive = pathname.startsWith(link.href)
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all group ${isActive
                                    ? 'bg-primary-600/10 text-primary-400'
                                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                }`}
                            title={isCollapsed ? link.label : undefined}
                        >
                            <link.icon className={`w-5 h-5 shrink-0 ${isActive ? 'fill-current' : ''}`} />
                            {!isCollapsed && (
                                <span className="font-medium whitespace-nowrap">{link.label}</span>
                            )}
                        </Link>
                    )
                })}
            </div>

            {/* User & Wallet Section (Bottom) */}
            <div className="p-4 border-t border-white/10 bg-black/20">
                <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center shrink-0 font-bold text-white">
                        {user?.username?.charAt(0).toUpperCase()}
                    </div>

                    {!isCollapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-white truncate">{user?.username}</p>
                            <p className="text-xs text-primary-400 truncate font-mono">
                                {currentWallet ? formatCurrency(currentWallet.balance, selectedCurrency) : '---'}
                            </p>
                        </div>
                    )}
                </div>

                {!isCollapsed && (
                    <button
                        onClick={() => logout()}
                        className="mt-4 w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-white/5 hover:bg-red-500/10 hover:text-red-400 text-gray-400 text-sm font-medium transition-all"
                    >
                        <LogOut className="w-4 h-4" />
                        Logout
                    </button>
                )}
            </div>
        </aside>
    )
}
