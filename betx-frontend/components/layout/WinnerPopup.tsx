'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, X } from 'lucide-react'

interface WinnerNotification {
    id: string
    player: string
    amount: number
    game: string
}

const WinnerPopup = () => {
    const [notifications, setNotifications] = useState<WinnerNotification[]>([])

    useEffect(() => {
        // Generate mock winner notifications
        const generateWinner = (): WinnerNotification => {
            const games = ['Dice', 'Crash', 'Mines', 'Plinko', 'Slots', 'Roulette']
            const amounts = [5000, 10000, 25000, 50000, 100000, 250000]

            return {
                id: Math.random().toString(36).substr(2, 9),
                player: `${['Lucky', 'Pro', 'King', 'Boss', 'Elite'][Math.floor(Math.random() * 5)]}${Math.floor(Math.random() * 9999)}`,
                amount: amounts[Math.floor(Math.random() * amounts.length)],
                game: games[Math.floor(Math.random() * games.length)]
            }
        }

        // Show winner notification every 10 seconds
        const interval = setInterval(() => {
            const winner = generateWinner()
            setNotifications(prev => [...prev, winner])

            // Auto-dismiss after 5 seconds
            setTimeout(() => {
                setNotifications(prev => prev.filter(n => n.id !== winner.id))
            }, 5000)
        }, 10000)

        return () => clearInterval(interval)
    }, [])

    const dismissNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id))
    }

    return (
        <div className="fixed bottom-24 md:bottom-6 right-4 z-40 space-y-2 max-w-sm">
            <AnimatePresence>
                {notifications.map((notification) => (
                    <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: 100, scale: 0.8 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 100, scale: 0.8 }}
                        className="glass-dark border border-yellow-500/20 rounded-xl p-4 shadow-2xl backdrop-blur-xl"
                    >
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-yellow-500/10 rounded-lg">
                                <Trophy className="w-5 h-5 text-yellow-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-zinc-400 mb-1">Big Win!</p>
                                <p className="text-sm font-bold text-white truncate">
                                    {notification.player}
                                </p>
                                <p className="text-lg font-black text-yellow-400">
                                    ₹{notification.amount.toLocaleString()}
                                </p>
                                <p className="text-xs text-zinc-500 mt-1">
                                    on {notification.game}
                                </p>
                            </div>
                            <button
                                onClick={() => dismissNotification(notification.id)}
                                className="p-1 hover:bg-white/5 rounded-lg transition-colors"
                            >
                                <X size={14} className="text-zinc-500" />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    )
}

export default WinnerPopup
