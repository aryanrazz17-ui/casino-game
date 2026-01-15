'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface PlinkoBoardProps {
    rows: number
    path: number[] | null
    onComplete: () => void
}

export const PlinkoBoard: React.FC<PlinkoBoardProps> = ({ rows, path, onComplete }) => {
    const [balls, setBalls] = useState<{ id: number; path: number[] }[]>([])
    const ballIdCounter = useRef(0)

    useEffect(() => {
        if (path) {
            const newBall = { id: ballIdCounter.current++, path }
            setBalls(prev => [...prev, newBall])
        }
    }, [path])

    const getPegs = () => {
        const pegs = []
        for (let i = 0; i < rows; i++) {
            const rowPegs = i + 3
            for (let j = 0; j < rowPegs; j++) {
                pegs.push({ row: i, col: j })
            }
        }
        return pegs
    }

    const getBallPosition = (step: number, path: number[]) => {
        // Calculate X and Y based on the path taken so far
        const xOffset = path.slice(0, step).reduce((acc, dir) => acc + (dir === 1 ? 0.5 : -0.5), 0)
        return {
            x: `calc(50% + ${xOffset * 30}px)`,
            y: `${step * 40}px`
        }
    }

    return (
        <div className="relative w-full max-w-[600px] mx-auto bg-dark-300/20 rounded-3xl p-8 overflow-hidden border border-white/5 shadow-2xl">
            {/* Pegs */}
            <div className="relative h-[680px]">
                {getPegs().map((peg, i) => (
                    <div
                        key={i}
                        className="absolute w-2 h-2 bg-white/20 rounded-full"
                        style={{
                            left: `calc(50% + ${(peg.col - (peg.row + 2) / 2) * 30}px)`,
                            top: `${(peg.row + 1) * 40}px`
                        }}
                    />
                ))}

                {/* Balls */}
                <AnimatePresence>
                    {balls.map((ball) => (
                        <motion.div
                            key={ball.id}
                            initial={{ top: 0, left: '50%' }}
                            animate={{
                                top: (rows + 1) * 40,
                                left: `calc(50% + ${(ball.path.reduce((a, b) => a + (b === 1 ? 0.5 : -0.5), 0)) * 30}px)`
                            }}
                            transition={{
                                duration: 1.5,
                                ease: "linear",
                                // We could use a custom keyframes animation for a more "bouncy" feel
                            }}
                            onAnimationComplete={() => {
                                setBalls(prev => prev.filter(b => b.id !== ball.id))
                                onComplete()
                            }}
                            className="absolute w-4 h-4 bg-primary-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.8)] z-10"
                        />
                    ))}
                </AnimatePresence>
            </div>

            {/* Buckets */}
            <div className="flex justify-center gap-[2px] mt-4">
                {Array.from({ length: rows + 1 }).map((_, i) => (
                    <div
                        key={i}
                        className="w-[28px] h-8 bg-primary-500/20 rounded-md border border-primary-500/30 flex items-center justify-center"
                    >
                        <span className="text-[8px] font-bold text-primary-400">
                            {/* Multipliers would go here */}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}
