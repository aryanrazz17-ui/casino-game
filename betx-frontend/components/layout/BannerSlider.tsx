'use client'

import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

interface Banner {
    id: number
    title: string
    subtitle: string
    cta: string
    ctaLink: string
    gradient: string
}

const banners: Banner[] = [
    {
        id: 1,
        title: '🎰 Welcome Bonus',
        subtitle: 'Get 100% bonus up to ₹10,000 on your first deposit',
        cta: 'Claim Now',
        ctaLink: '/wallet/deposit',
        gradient: 'from-purple-600 via-pink-600 to-red-600'
    },
    {
        id: 2,
        title: '🎲 Daily Cashback',
        subtitle: 'Get 10% cashback on all losses every day',
        cta: 'Learn More',
        ctaLink: '/promotions',
        gradient: 'from-blue-600 via-cyan-600 to-teal-600'
    },
    {
        id: 3,
        title: '🏆 VIP Rewards',
        subtitle: 'Unlock exclusive bonuses and higher limits',
        cta: 'Join VIP',
        ctaLink: '/vip',
        gradient: 'from-yellow-600 via-orange-600 to-red-600'
    },
    {
        id: 4,
        title: '⚡ Instant Withdrawals',
        subtitle: 'Withdraw your winnings in under 5 minutes',
        cta: 'Withdraw',
        ctaLink: '/wallet/withdraw',
        gradient: 'from-green-600 via-emerald-600 to-teal-600'
    }
]

const BannerSlider = () => {
    const [currentIndex, setCurrentIndex] = useState(0)

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % banners.length)
        }, 5000)

        return () => clearInterval(timer)
    }, [])

    const goToPrevious = () => {
        setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length)
    }

    const goToNext = () => {
        setCurrentIndex((prev) => (prev + 1) % banners.length)
    }

    return (
        <div className="relative w-full h-48 md:h-64 rounded-2xl overflow-hidden group">
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, x: 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ duration: 0.5 }}
                    className={`absolute inset-0 bg-gradient-to-br ${banners[currentIndex].gradient} p-8 md:p-12 flex flex-col justify-center`}
                >
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="relative z-10">
                        <h2 className="text-2xl md:text-4xl font-black text-white mb-2 md:mb-3 drop-shadow-lg">
                            {banners[currentIndex].title}
                        </h2>
                        <p className="text-sm md:text-lg text-white/90 mb-4 md:mb-6 max-w-xl drop-shadow">
                            {banners[currentIndex].subtitle}
                        </p>
                        <Link
                            href={banners[currentIndex].ctaLink}
                            className="inline-block px-6 md:px-8 py-2.5 md:py-3 bg-white text-gray-900 rounded-xl font-bold text-sm md:text-base shadow-xl hover:scale-105 transition-transform"
                        >
                            {banners[currentIndex].cta}
                        </Link>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Navigation Arrows */}
            <button
                onClick={goToPrevious}
                className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <ChevronLeft className="text-white" size={20} />
            </button>
            <button
                onClick={goToNext}
                className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <ChevronRight className="text-white" size={20} />
            </button>

            {/* Dots Indicator */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {banners.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrentIndex(index)}
                        className={`w-2 h-2 rounded-full transition-all ${index === currentIndex ? 'bg-white w-6' : 'bg-white/50'
                            }`}
                    />
                ))}
            </div>
        </div>
    )
}

export default BannerSlider
