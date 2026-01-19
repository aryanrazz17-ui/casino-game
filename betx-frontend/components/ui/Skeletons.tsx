import React from 'react'

export const GameCardSkeleton = () => {
    return (
        <div className="rounded-2xl bg-zinc-900/80 border border-white/5 overflow-hidden animate-pulse">
            <div className="h-40 sm:h-48 bg-zinc-800/50" />
            <div className="p-4 space-y-3">
                <div className="h-6 bg-zinc-800/50 rounded w-3/4" />
                <div className="space-y-2">
                    <div className="h-3 bg-zinc-800/50 rounded" />
                    <div className="h-3 bg-zinc-800/50 rounded w-5/6" />
                </div>
                <div className="h-10 bg-zinc-800/50 rounded-xl mt-4" />
            </div>
        </div>
    )
}

export const BannerSkeleton = () => {
    return (
        <div className="w-full h-48 md:h-64 rounded-2xl bg-zinc-900/80 border border-white/5 animate-pulse">
            <div className="h-full bg-gradient-to-br from-zinc-800/50 to-zinc-900/50" />
        </div>
    )
}

export const StatCardSkeleton = () => {
    return (
        <div className="glass-dark p-4 rounded-xl border border-white/5 animate-pulse">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-zinc-800/50 rounded-lg" />
                <div className="flex-1 space-y-2">
                    <div className="h-2 bg-zinc-800/50 rounded w-16" />
                    <div className="h-4 bg-zinc-800/50 rounded w-12" />
                </div>
            </div>
        </div>
    )
}
