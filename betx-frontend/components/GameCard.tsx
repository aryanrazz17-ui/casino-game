'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { Play, Lock } from 'lucide-react'
import toast from 'react-hot-toast'

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
                style: {
                    borderRadius: '10px',
                    background: '#333',
                    color: '#fff',
                },
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
        <div className="group relative overflow-hidden rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-primary-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary-500/10 h-full flex flex-col">
            {/* Image Container */}
            <div className="relative h-48 w-full overflow-hidden">
                <Image
                    src={image}
                    alt={name}
                    fill
                    className={`object-cover transition-transform duration-500 group-hover:scale-110 ${status === "Coming Soon" ? "grayscale opacity-60" : ""}`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent opacity-80" />

                {/* Status Badge */}
                <div className="absolute top-3 right-3 z-10">
                    {status === "LIVE" ? (
                        <div className="bg-black/50 backdrop-blur-md border border-green-500/30 px-3 py-1 rounded-full flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            <span className="text-xs font-bold text-green-400 tracking-wider">LIVE</span>
                        </div>
                    ) : (
                        <div className="bg-black/50 backdrop-blur-md border border-zinc-700 px-3 py-1 rounded-full flex items-center gap-2">
                            <Lock size={12} className="text-zinc-400" />
                            <span className="text-xs font-bold text-zinc-400 tracking-wider">COMING SOON</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="relative p-5 flex flex-col flex-grow">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent mb-2">
                    {name}
                </h3>
                <p className="text-sm text-zinc-400 mb-6 line-clamp-2 flex-grow">
                    {description}
                </p>

                <button
                    onClick={handlePlay}
                    disabled={status === "Coming Soon"}
                    className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all shadow-lg active:scale-95 ${status === "Coming Soon"
                            ? "bg-zinc-800 text-zinc-500 cursor-not-allowed hover:bg-zinc-800 hover:shadow-none"
                            : "bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 text-white hover:shadow-primary-500/25"
                        }`}
                >
                    {status === "Coming Soon" ? (
                        <>
                            <Lock size={18} />
                            Locked
                        </>
                    ) : (
                        <>
                            <Play size={18} fill="currentColor" />
                            Play Now
                        </>
                    )}
                </button>
            </div>

            {/* Hover Glow Effect */}
            <div className={`absolute inset-0 rounded-2xl ring-1 ring-inset ring-transparent transition-all pointer-events-none ${status === "LIVE" ? "group-hover:ring-primary-500/30" : "group-hover:ring-zinc-700/30"}`} />
        </div>
    )
}
