'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { Play, Lock, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

interface GameCardProps {
    name: string
    description: string
    image: string
    path: string
    status?: "LIVE" | "Coming Soon"
}

export default function GameCard({ name, description, image, path, status = "LIVE" }: GameCardProps) {
    const router = useRouter()
    const { isAuthenticated } = useAuthStore()

    const handlePlay = () => {
        if (status === "Coming Soon") {
            toast('Coming Soon! Stay tuned for updates.', {
                icon: '🚧',
            });
            return
        }

        if (!isAuthenticated) {
            router.push('/auth/login')
        } else {
            router.push(path)
        }
    }

    return (
        <motion.div
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            className="group relative overflow-hidden rounded-2xl bg-zinc-900/80 border border-white/5 hover:border-primary-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-primary-500/20 h-full flex flex-col backdrop-blur-sm"
        >
            {/* Image Container */}
            <div className="relative h-40 sm:h-48 w-full overflow-hidden">
                <Image
                    src={image}
                    alt={name}
                    fill
                    className={`object-cover transition-all duration-700 group-hover:scale-110 ${status === "Coming Soon" ? "grayscale opacity-50" : ""}`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/50 to-transparent" />

                {/* Play Overlay */}
                {status === "LIVE" && (
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <div className="bg-primary-gradient p-4 rounded-full shadow-glow-primary transform scale-90 group-hover:scale-100 transition-transform">
                            <Play size={24} fill="white" className="text-white" />
                        </div>
                    </div>
                )}

                {/* Status Badge */}
                <div className="absolute top-2 right-2 z-10">
                    {status === "LIVE" ? (
                        <div className="glass px-2.5 py-1 rounded-full flex items-center gap-1.5">
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                            </span>
                            <span className="text-[10px] font-black text-green-400 tracking-wider uppercase">Live</span>
                        </div>
                    ) : (
                        <div className="glass px-2.5 py-1 rounded-full flex items-center gap-1.5">
                            <Lock size={10} className="text-zinc-500" />
                            <span className="text-[10px] font-black text-zinc-500 tracking-wider uppercase">Soon</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="relative p-4 flex flex-col flex-grow">
                <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg sm:text-xl font-black text-white leading-tight">
                        {name}
                    </h3>
                    {status === "LIVE" && (
                        <Sparkles size={16} className="text-yellow-400 flex-shrink-0 ml-2" />
                    )}
                </div>
                <p className="text-xs sm:text-sm text-zinc-400 mb-4 line-clamp-2 flex-grow leading-relaxed">
                    {description}
                </p>

                <button
                    onClick={handlePlay}
                    disabled={status === "Coming Soon"}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 px-4 rounded-xl font-bold text-sm transition-all shadow-lg active:scale-95 ${status === "Coming Soon"
                            ? "bg-zinc-800/50 text-zinc-600 cursor-not-allowed"
                            : "bg-primary-gradient text-white hover:shadow-glow-primary"
                        }`}
                >
                    {status === "Coming Soon" ? (
                        <>
                            <Lock size={16} />
                            <span>Locked</span>
                        </>
                    ) : (
                        <>
                            <Play size={16} fill="currentColor" />
                            <span>Play Now</span>
                        </>
                    )}
                </button>
            </div>

            {/* Shine Effect */}
            {status === "LIVE" && (
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </div>
            )}
        </motion.div>
    )
}
