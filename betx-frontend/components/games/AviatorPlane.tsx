'use client'

import React, { useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface AviatorPlaneProps {
    multiplier: number
    crashed: boolean
    flying: boolean
}

export const AviatorPlane: React.FC<AviatorPlaneProps> = ({ multiplier, crashed, flying }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [planePosition, setPlanePosition] = useState({ x: 50, y: 300 })

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Set canvas size
        canvas.width = canvas.offsetWidth
        canvas.height = canvas.offsetHeight

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // Draw grid
        drawGrid(ctx, canvas.width, canvas.height)

        // Draw flight path
        if (flying || crashed) {
            drawFlightPath(ctx, canvas.width, canvas.height, multiplier)
        }

        // Draw plane
        if (flying && !crashed) {
            drawPlane(ctx, planePosition.x, planePosition.y)
        }

        // Draw explosion if crashed
        if (crashed) {
            drawExplosion(ctx, planePosition.x, planePosition.y)
        }

    }, [multiplier, crashed, flying, planePosition])

    useEffect(() => {
        if (flying && !crashed) {
            // Update plane position based on multiplier
            const progress = Math.min((multiplier - 1) / 10, 1) // 0 to 1 over 11x
            const x = 50 + progress * 700
            const y = 300 - progress * 250 // Move up
            setPlanePosition({ x, y })
        } else if (!flying) {
            setPlanePosition({ x: 50, y: 300 })
        }
    }, [multiplier, flying, crashed])

    const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
        ctx.lineWidth = 1

        // Vertical lines
        for (let x = 0; x < width; x += 50) {
            ctx.beginPath()
            ctx.moveTo(x, 0)
            ctx.lineTo(x, height)
            ctx.stroke()
        }

        // Horizontal lines
        for (let y = 0; y < height; y += 50) {
            ctx.beginPath()
            ctx.moveTo(0, y)
            ctx.lineTo(width, y)
            ctx.stroke()
        }
    }

    const drawFlightPath = (ctx: CanvasRenderingContext2D, width: number, height: number, mult: number) => {
        const progress = Math.min((mult - 1) / 10, 1)

        ctx.strokeStyle = crashed ? 'rgba(239, 68, 68, 0.5)' : 'rgba(34, 197, 94, 0.5)'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(50, 300)

        const endX = 50 + progress * 700
        const endY = 300 - progress * 250

        // Curved path
        ctx.quadraticCurveTo(
            50 + progress * 350,
            300 - progress * 150,
            endX,
            endY
        )
        ctx.stroke()

        // Glow effect
        ctx.shadowBlur = 20
        ctx.shadowColor = crashed ? 'rgba(239, 68, 68, 0.8)' : 'rgba(34, 197, 94, 0.8)'
        ctx.stroke()
        ctx.shadowBlur = 0
    }

    const drawPlane = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
        // Simple plane shape
        ctx.fillStyle = '#3b82f6'
        ctx.shadowBlur = 15
        ctx.shadowColor = '#3b82f6'

        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x - 15, y + 5)
        ctx.lineTo(x - 10, y)
        ctx.lineTo(x - 15, y - 5)
        ctx.closePath()
        ctx.fill()

        ctx.shadowBlur = 0
    }

    const drawExplosion = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
        // Explosion effect
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8
            const radius = 30

            ctx.fillStyle = `rgba(239, 68, 68, ${0.8 - i * 0.1})`
            ctx.beginPath()
            ctx.arc(
                x + Math.cos(angle) * radius,
                y + Math.sin(angle) * radius,
                10,
                0,
                Math.PI * 2
            )
            ctx.fill()
        }

        // Center explosion
        ctx.fillStyle = '#ef4444'
        ctx.shadowBlur = 30
        ctx.shadowColor = '#ef4444'
        ctx.beginPath()
        ctx.arc(x, y, 20, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
    }

    return (
        <div className="relative w-full h-full bg-dark-400/30 rounded-2xl overflow-hidden border border-white/5">
            <canvas
                ref={canvasRef}
                className="w-full h-full"
                style={{ width: '100%', height: '400px' }}
            />

            {/* Multiplier Display */}
            {flying && (
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                >
                    <div className={`text-8xl font-black ${crashed ? 'text-red-500' : 'text-green-400'} drop-shadow-[0_0_30px_rgba(34,197,94,0.8)]`}>
                        {multiplier.toFixed(2)}x
                    </div>
                </motion.div>
            )}

            {/* Crashed Message */}
            {crashed && (
                <motion.div
                    initial={{ scale: 0, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-20"
                >
                    <div className="text-4xl font-black text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]">
                        CRASHED!
                    </div>
                </motion.div>
            )}
        </div>
    )
}
