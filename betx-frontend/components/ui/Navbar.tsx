'use client'

import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import { useWallet } from '@/hooks/useWallet'
import { formatCurrency } from '@/lib/utils'
import { Wallet, Bell } from 'lucide-react'

export function Navbar() {
    const { user, isAuthenticated } = useAuthStore()
    const { currentWallet, selectedCurrency } = useWallet()

    if (!isAuthenticated) return null

    return (
        <nav className="md:hidden glass border-b border-white/10 sticky top-0 z-40">
            <div className="px-4 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link href="/games" className="text-xl font-black bg-gradient-to-r from-primary-400 to-purple-400 bg-clip-text text-transparent">
                    BetX
                </Link>

                {/* Right Actions */}
                <div className="flex items-center gap-3">
                    {/* Compact Balance */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                        <Wallet className="w-3.5 h-3.5 text-primary-400" />
                        <span className="text-sm font-bold font-mono">
                            {currentWallet ? formatCurrency(currentWallet.balance, selectedCurrency) : '...'}
                        </span>
                    </div>

                    {/* Notification/Profile Placeholder */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center font-bold text-xs text-white shadow-lg">
                        {user?.username?.charAt(0).toUpperCase()}
                    </div>
                </div>
            </div>
        </nav>
    )
}
