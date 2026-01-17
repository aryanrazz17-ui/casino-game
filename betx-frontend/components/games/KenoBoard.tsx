'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

interface KenoBoardProps {
    selectedNumbers: number[]
    onToggleNumber: (num: number) => void
    drawnNumbers: number[]
    hits: number[]
    disabled?: boolean
    isDrawing?: boolean
}

export const KenoBoard: React.FC<KenoBoardProps> = ({
    selectedNumbers,
    onToggleNumber,
    drawnNumbers,
    hits,
    disabled = false,
    isDrawing = false
}) => {
    const numbers = Array.from({ length: 40 }, (_, i) => i + 1)

    return (
        <div className="grid grid-cols-8 gap-2 md:gap-3 p-4 bg-dark-400/30 rounded-2xl border border-white/5 shadow-inner">
            {numbers.map((num) => {
                const isSelected = selectedNumbers.includes(num)
                const isDrawn = drawnNumbers.includes(num)
                const isHit = hits.includes(num)

                return (
                    <motion.button
                        key={num}
                        whileHover={!disabled && !isDrawing ? { scale: 1.05, y: -2 } : {}}
                        whileTap={!disabled && !isDrawing ? { scale: 0.95 } : {}}
                        onClick={() => !disabled && !isDrawing && onToggleNumber(num)}
                        disabled={disabled || isDrawing}
                        className={cn(
                            "relative aspect-square flex items-center justify-center text-sm md:text-lg font-bold rounded-xl transition-all duration-300 overflow-hidden",
                            "border-2",
                            // Base state
                            !isSelected && !isDrawn && "bg-white/5 border-white/5 text-gray-500 hover:bg-white/10 hover:border-white/10",
                            // Selected state
                            isSelected && !isDrawn && "bg-primary-500/20 border-primary-500 text-primary-400 shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]",
                            // Drawn but not selected
                            isDrawn && !isHit && "bg-gray-700/50 border-gray-500 text-white animate-pulse shadow-[0_0_10px_rgba(255,255,255,0.2)]",
                            // Hit (Selected + Drawn)
                            isHit && "bg-green-500 border-green-400 text-white shadow-[0_0_20px_rgba(34,197,94,0.6)] z-10 scale-105"
                        )}
                    >
                        {num}

                        {/* Glow effect for hits */}
                        {isHit && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: [0, 1, 0], scale: [1, 1.5, 2] }}
                                transition={{ duration: 1, repeat: Infinity }}
                                className="absolute inset-0 bg-green-400/40 rounded-full blur-xl"
                            />
                        )}

                        {/* Animation for being drawn */}
                        <AnimatePresence>
                            {isDrawn && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 2 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="absolute inset-0 border-2 border-white rounded-xl pointer-events-none"
                                />
                            )}
                        </AnimatePresence>
                    </motion.button>
                )
            })}
        </div>
    )
}
