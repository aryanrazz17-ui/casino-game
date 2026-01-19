'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Gamepad2, Gift, Wallet, User } from 'lucide-react'
import { motion } from 'framer-motion'

const BottomNav = () => {
    const pathname = usePathname()

    const navItems = [
        { label: 'Home', icon: Home, path: '/' },
        { label: 'Games', icon: Gamepad2, path: '/games' },
        { label: 'Promo', icon: Gift, path: '/promotions' },
        { label: 'Wallet', icon: Wallet, path: '/wallet' },
        { label: 'Profile', icon: User, path: '/profile' },
    ]

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 glass-dark border-t border-white/5 px-2 flex items-center justify-around md:hidden">
            {navItems.map((item) => {
                const isActive = pathname === item.path
                return (
                    <Link
                        key={item.label}
                        href={item.path}
                        className="relative flex flex-col items-center justify-center gap-1 w-full h-full group"
                    >
                        <div className={`relative p-1.5 rounded-xl transition-all duration-300 ${isActive ? 'text-primary-400' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                            <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                            {isActive && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute inset-0 bg-primary-400/10 rounded-xl blur-md"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-tighter ${isActive ? 'text-white' : 'text-zinc-500'}`}>
                            {item.label}
                        </span>
                        {isActive && (
                            <motion.div
                                layoutId="activeIndicator"
                                className="absolute -top-[17px] w-8 h-1 bg-primary-400 rounded-full shadow-[0_-5px_15px_rgba(14,165,233,0.5)]"
                            />
                        )}
                    </Link>
                )
            })}
        </nav>
    )
}

export default BottomNav
