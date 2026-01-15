'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface SlotReelProps {
    symbol: string
    isSpinning: boolean
    delay: number
}

const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '🔔', '💎', '7️⃣']

export const SlotReel: React.FC<SlotReelProps> = ({ symbol, isSpinning, delay }) => {
    const [displaySymbol, setDisplaySymbol] = useState(symbol)

    useEffect(() => {
        let interval: NodeJS.Timeout
        if (isSpinning) {
            setTimeout(() => {
                interval = setInterval(() => {
                    setDisplaySymbol(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)])
                }, 100)
            }, delay)
        } else {
            setDisplaySymbol(symbol)
        }
        return () => clearInterval(interval)
    }, [isSpinning, symbol, delay])

    return (
        <div className="relative h-32 w-full bg-dark-400/50 rounded-xl border-2 border-white/5 flex items-center justify-center overflow-hidden shadow-inner">
            <AnimatePresence mode="wait">
                <motion.div
                    key={displaySymbol}
                    initial={{ y: isSpinning ? -50 : 0, opacity: isSpinning ? 0 : 1 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: isSpinning ? 50 : 0, opacity: 0 }}
                    transition={{ duration: 0.1, ease: "linear" }}
                    className="text-6xl filter drop-shadow-lg"
                >
                    {displaySymbol}
                </motion.div>
            </AnimatePresence>

            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
            <div className="absolute inset-0 border-t border-white/10 pointer-events-none" />
        </div>
    )
}
