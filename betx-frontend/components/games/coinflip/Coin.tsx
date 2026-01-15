'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Disc, Coins } from 'lucide-react'

interface CoinProps {
    isFlipping: boolean
    result?: 'heads' | 'tails'
}

export default function Coin({ isFlipping, result }: CoinProps) {
    // We use a state to control the visual rotation
    const [rotation, setRotation] = useState(0)

    useEffect(() => {
        if (isFlipping) {
            // Start spinning (infinite feel)
            setRotation(prev => prev + 1800) // Spin 5 times
        } else if (result) {
            // Stop at result
            // Heads = 0deg, Tails = 180deg (assuming CSS 3D setup)
            // We add a large multiple of 360 to ensure it keeps spinning forward to stop
            const baseRot = Math.floor(rotation / 360) * 360 + 360 * 5
            const finalRot = result === 'heads' ? baseRot : baseRot + 180
            setRotation(finalRot)
        }
    }, [isFlipping, result])

    return (
        <div className="relative w-48 h-48 md:w-64 md:h-64 perspective-1000 mx-auto my-12">
            <motion.div
                className="w-full h-full relative preserve-3d"
                animate={{ rotateY: rotation }}
                transition={{ duration: isFlipping ? 2 : 1, ease: "easeOut" }}
                style={{ transformStyle: 'preserve-3d' }}
            >
                {/* HEADS SIDE */}
                <div className="absolute inset-0 backface-hidden rounded-full border-4 border-yellow-600 bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-700 shadow-[0_0_50px_rgba(234,179,8,0.3)] flex items-center justify-center">
                    <div className="border-2 border-yellow-200/30 rounded-full w-[90%] h-[90%] flex items-center justify-center bg-yellow-400/10 backdrop-blur-sm">
                        <div className="text-center">
                            <Disc size={64} className="text-yellow-100 mx-auto drop-shadow-md" />
                            <h2 className="text-2xl font-black text-yellow-100 drop-shadow-md uppercase mt-2">Heads</h2>
                        </div>
                    </div>
                </div>

                {/* TAILS SIDE */}
                <div
                    className="absolute inset-0 backface-hidden rounded-full border-4 border-zinc-500 bg-gradient-to-br from-zinc-300 via-zinc-400 to-zinc-600 shadow-[0_0_50px_rgba(161,161,170,0.3)] flex items-center justify-center"
                    style={{ transform: 'rotateY(180deg)' }}
                >
                    <div className="border-2 border-zinc-200/30 rounded-full w-[90%] h-[90%] flex items-center justify-center bg-zinc-400/10 backdrop-blur-sm">
                        <div className="text-center">
                            <Coins size={64} className="text-white mx-auto drop-shadow-md" />
                            <h2 className="text-2xl font-black text-white drop-shadow-md uppercase mt-2">Tails</h2>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Shadow */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-40 h-8 bg-black/40 blur-xl rounded-full" />
        </div>
    )
}
