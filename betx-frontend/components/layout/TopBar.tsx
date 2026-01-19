'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { Wallet, RefreshCw, User, Bell } from 'lucide-react'
import { useWalletStore } from '@/store/walletStore'
import { useAuthStore } from '@/store/authStore'
import { motion, AnimatePresence } from 'framer-motion'

const TopBar = () => {
    const { wallets, selectedCurrency, fetchWallets, isLoading } = useWalletStore()
    const { user, isAuthenticated } = useAuthStore()

    const currentWallet = wallets.find(w => w.currency === selectedCurrency)

    useEffect(() => {
        if (isAuthenticated) {
            fetchWallets()
        }
    }, [isAuthenticated, fetchWallets])

    return (
        <header className="fixed top-0 left-0 right-0 z-50 h-16 glass-dark border-b border-white/5 px-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <Link href="/" className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary-gradient rounded-lg flex items-center justify-center shadow-glow-primary">
                        <span className="text-white font-black text-xl">B</span>
                    </div>
                    <span className="text-white font-bold text-xl hidden sm:block tracking-tight">
                        BET<span className="text-primary-400">X</span>
                    </span>
                </Link>
            </div>

            <div className="flex items-center gap-3">
                {isAuthenticated ? (
                    <>
                        <div className="flex items-center bg-zinc-900/50 rounded-full pl-3 pr-1 py-1 border border-white/5">
                            <div className="flex flex-col items-end mr-2">
                                <span className="text-[10px] text-zinc-400 uppercase font-bold leading-none">Balance</span>
                                <span className="text-sm font-black text-white leading-tight">
                                    ₹{currentWallet?.balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                                </span>
                            </div>
                            <button
                                onClick={() => fetchWallets()}
                                disabled={isLoading}
                                className={`p-1.5 rounded-full hover:bg-white/5 transition-colors ${isLoading ? 'animate-spin' : ''}`}
                            >
                                <RefreshCw size={14} className="text-primary-400" />
                            </button>
                        </div>

                        <Link
                            href="/wallet/deposit"
                            className="px-4 py-2 bg-primary-gradient rounded-xl text-white text-xs font-bold uppercase tracking-wider shadow-glow-primary hover:scale-105 transition-transform"
                        >
                            Deposit
                        </Link>

                        <Link href="/profile" className="p-2 rounded-xl bg-zinc-900/50 border border-white/5 text-zinc-400 hover:text-white transition-colors">
                            <User size={20} />
                        </Link>
                    </>
                ) : (
                    <div className="flex items-center gap-2">
                        <Link
                            href="/auth/login"
                            className="px-5 py-2 text-zinc-400 hover:text-white text-sm font-bold transition-colors"
                        >
                            Login
                        </Link>
                        <Link
                            href="/auth/register"
                            className="px-5 py-2 bg-primary-gradient rounded-xl text-white text-sm font-bold shadow-glow-primary hover:scale-105 transition-transform text-nowrap"
                        >
                            Sign Up
                        </Link>
                    </div>
                )}
            </div>
        </header>
    )
}

export default TopBar
