'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Gamepad2, Wallet, User, Menu, History } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

export function BottomNav() {
    const pathname = usePathname()
    const { user } = useAuthStore()

    const navLinks = [
        { href: '/games', label: 'Games', icon: Gamepad2 },
        { href: '/wallet', label: 'Wallet', icon: Wallet },
        { href: '/history', label: 'History', icon: History },
        { href: '/profile', label: 'Profile', icon: User },
    ]

    if (user?.role === 'admin') {
        navLinks.push({ href: '/admin', label: 'Admin', icon: Menu })
    }

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#15151b] border-t border-white/10 pb-safe">
            <div className="flex items-center justify-around h-16">
                {navLinks.map((link) => {
                    const isActive = pathname.startsWith(link.href)
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${isActive
                                ? 'text-primary-400 bg-primary-500/10'
                                : 'text-gray-400 hover:text-gray-200'
                                }`}
                        >
                            <link.icon className={`w-6 h-6 ${isActive ? 'fill-current' : ''}`} />
                            <span className="text-[10px] font-medium">{link.label}</span>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}
