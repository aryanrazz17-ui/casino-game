'use client'

import React from 'react'
import { Bomb, Trophy, Star } from 'lucide-react'

interface MinesTileProps {
    index: number
    isRevealed: boolean
    isMine: boolean
    isGameOver: boolean
    onClick: (index: number) => void
    disabled: boolean
}

export const MinesTile: React.FC<MinesTileProps> = ({
    index,
    isRevealed,
    isMine,
    isGameOver,
    onClick,
    disabled
}) => {
    const getContent = () => {
        if (isRevealed) {
            if (isMine) return <Bomb className="w-8 h-8 text-white drop-shadow-glow-red" />
            return <Star className="w-8 h-8 text-yellow-400 fill-yellow-400 drop-shadow-glow-yellow" />
        }
        if (isGameOver && isMine) return <Bomb className="w-6 h-6 text-red-500/50" />
        return null
    }

    const getClass = () => {
        const base = "aspect-square rounded-xl border-2 transition-all duration-300 transform"
        if (isRevealed) {
            if (isMine) return `${base} bg-gradient-to-br from-red-500 to-red-600 border-red-400 scale-100 rotate-12 shadow-2xl`
            return `${base} bg-gradient-to-br from-green-500/20 to-emerald-500/30 border-green-500/50 scale-100 shadow-xl`
        }
        if (isGameOver && isMine) return `${base} bg-red-500/10 border-red-500/20 opacity-50`
        if (disabled) return `${base} bg-white/5 border-white/5 opacity-50`
        return `${base} bg-dark-400/50 border-white/5 hover:bg-white/10 hover:border-white/20 hover:-translate-y-1 cursor-pointer active:scale-95`
    }

    return (
        <button
            onClick={() => onClick(index)}
            disabled={disabled || isRevealed || isGameOver}
            className={getClass()}
        >
            <div className="flex items-center justify-center w-full h-full">
                {getContent()}
            </div>
        </button>
    )
}
