'use client'

import React, { useEffect, useRef } from 'react'

interface CrashGraphProps {
    multiplier: number
    isCrashed: boolean
}

export const CrashGraph: React.FC<CrashGraphProps> = ({ multiplier, isCrashed }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const pointsRef = useRef<{ x: number; y: number }[]>([])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const dpr = window.devicePixelRatio || 1
        const rect = canvas.getBoundingClientRect()
        canvas.width = rect.width * dpr
        canvas.height = rect.height * dpr
        ctx.scale(dpr, dpr)

        const draw = () => {
            ctx.clearRect(0, 0, rect.width, rect.height)

            // Draw axis
            ctx.strokeStyle = '#334155'
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(40, 0)
            ctx.lineTo(40, rect.height - 40)
            ctx.lineTo(rect.width, rect.height - 40)
            ctx.stroke()

            // Draw multiplier curve
            if (multiplier > 1) {
                const x = 40 + (Math.min(multiplier, 10) - 1) * ((rect.width - 60) / 9)
                const y = (rect.height - 40) - (Math.min(multiplier, 10) - 1) * ((rect.height - 60) / 9)

                pointsRef.current.push({ x, y })
                if (pointsRef.current.length > 100) pointsRef.current.shift()

                ctx.strokeStyle = isCrashed ? '#ef4444' : '#6366f1'
                ctx.lineWidth = 4
                ctx.lineCap = 'round'
                ctx.lineJoin = 'round'

                ctx.beginPath()
                ctx.moveTo(pointsRef.current[0].x, pointsRef.current[0].y)
                for (let i = 1; i < pointsRef.current.length; i++) {
                    ctx.lineTo(pointsRef.current[i].x, pointsRef.current[i].y)
                }
                ctx.stroke()

                // Glow effect
                if (!isCrashed) {
                    ctx.shadowBlur = 15
                    ctx.shadowColor = '#6366f1'
                    ctx.stroke()
                    ctx.shadowBlur = 0
                }
            } else {
                pointsRef.current = [{ x: 40, y: rect.height - 40 }]
            }

            // Draw current multiplier text
            ctx.fillStyle = isCrashed ? '#ef4444' : '#ffffff'
            ctx.font = 'bold 48px Inter'
            ctx.textAlign = 'center'
            ctx.fillText(`${multiplier.toFixed(2)}x`, rect.width / 2, rect.height / 2)
        }

        const animationFrame = requestAnimationFrame(draw)
        return () => cancelAnimationFrame(animationFrame)
    }, [multiplier, isCrashed])

    return (
        <div className="relative w-full h-80 bg-dark-300/50 rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
            <canvas
                ref={canvasRef}
                className="w-full h-full"
            />
            {isCrashed && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-500/10 animate-pulse">
                    <span className="text-4xl font-black text-red-500 uppercase tracking-widest drop-shadow-lg">
                        Crashed
                    </span>
                </div>
            )}
        </div>
    )
}
