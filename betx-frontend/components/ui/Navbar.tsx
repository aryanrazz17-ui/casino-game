'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { useWallet } from '@/hooks/useWallet'
import { formatCurrency } from '@/lib/utils'
import { Wallet, User, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'

export function Navbar() {
    const pathname = usePathname()
    const { user, isAuthenticated, logout } = useAuthStore()
    const { currentWallet, selectedCurrency } = useWallet()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    const navLinks = [
        { href: '/games', label: 'Games' },
        ...(user?.role === 'admin' ? [{ href: '/admin', label: 'Admin' }] : []),
        { href: '/wallet', label: 'Wallet' },
        { href: '/profile', label: 'Profile' },
    ]

    if (!isAuthenticated) return null

    return (
        <nav className="glass border-b border-white/10 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/games" className="text-2xl font-bold bg-gradient-to-r from-primary-400 to-purple-400 bg-clip-text text-transparent">
                        BetX
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-6">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`px-3 py-2 rounded-lg transition-colors ${pathname.startsWith(link.href)
                                    ? 'bg-primary-600 text-white'
                                    : 'text-gray-300 hover:bg-white/5'
                                    }`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>

                    {/* User Info & Balance */}
                    <div className="hidden md:flex items-center gap-4">
                        <div className="glass px-4 py-2 rounded-lg flex items-center gap-2">
                            <Wallet className="w-4 h-4 text-primary-400" />
                            <span className="font-semibold">
                                {currentWallet ? formatCurrency(currentWallet.balance, selectedCurrency) : '₹0.00'}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <User className="w-5 h-5 text-gray-400" />
                            <span className="text-sm">{user?.username}</span>
                        </div>

                        <button
                            onClick={() => logout()}
                            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                            title="Logout"
                        >
                            <LogOut className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-2 hover:bg-white/5 rounded-lg"
                    >
                        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden py-4 space-y-2">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setMobileMenuOpen(false)}
                                className={`block px-3 py-2 rounded-lg ${pathname.startsWith(link.href)
                                    ? 'bg-primary-600 text-white'
                                    : 'text-gray-300 hover:bg-white/5'
                                    }`}
                            >
                                {link.label}
                            </Link>
                        ))}
                        <div className="pt-2 border-t border-white/10">
                            <div className="px-3 py-2 text-sm text-gray-400">
                                Balance: {currentWallet ? formatCurrency(currentWallet.balance, selectedCurrency) : '₹0.00'}
                            </div>
                            <button
                                onClick={() => {
                                    logout()
                                    setMobileMenuOpen(false)
                                }}
                                className="w-full text-left px-3 py-2 text-red-400 hover:bg-white/5 rounded-lg"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    )
}
