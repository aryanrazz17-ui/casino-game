'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'

const categories = [
    { id: 'all', label: 'All', icon: '🎮' },
    { id: 'originals', label: 'Originals', icon: '⭐' },
    { id: 'casino', label: 'Casino', icon: '🎰' },
    { id: 'slots', label: 'Slots', icon: '🎲' },
    { id: 'sports', label: 'Sports', icon: '⚽' },
]

interface GameCategoryTabsProps {
    activeCategory: string
    onCategoryChange: (category: string) => void
}

const GameCategoryTabs = ({ activeCategory, onCategoryChange }: GameCategoryTabsProps) => {
    return (
        <div className="w-full overflow-x-auto noscrollbar">
            <div className="flex gap-2 min-w-max px-4 md:px-0">
                {categories.map((category) => {
                    const isActive = activeCategory === category.id
                    return (
                        <button
                            key={category.id}
                            onClick={() => onCategoryChange(category.id)}
                            className={`relative px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${isActive
                                    ? 'text-white'
                                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
                                }`}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="activeCategory"
                                    className="absolute inset-0 bg-primary-gradient rounded-xl shadow-glow-primary"
                                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            <span className="relative z-10 flex items-center gap-2">
                                <span>{category.icon}</span>
                                <span>{category.label}</span>
                            </span>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

export default GameCategoryTabs
