'use client'

import React, { useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface AviatorPlaneProps {
    multiplier: number
    crashed: boolean
    flying: boolean
}

type Particle = {
    x: number
    y: number
    vx: number
    vy: number
    alpha: number
    color: string
}

export const AviatorPlane: React.FC<AviatorPlaneProps> = ({ multiplier, crashed, flying }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const planeImgRef = useRef<HTMLImageElement | null>(null)
    const particlesRef = useRef<Particle[]>([])
    const animationFrameRef = useRef<number>()

    // State for responsiveness
    const [dimensions, setDimensions] = useState({ width: 800, height: 400 })

    // Load Assets
    useEffect(() => {
        const img = new Image()
        img.src = '/games/crash.png'
        img.onload = () => {
            planeImgRef.current = img
        }
    }, [])

    // Resize Handler
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.offsetWidth,
                    height: containerRef.current.offsetHeight
                })
            }
        }

        window.addEventListener('resize', updateDimensions)
        updateDimensions()

        return () => window.removeEventListener('resize', updateDimensions)
    }, [])

    // Animation Loop
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Update canvas size
        canvas.width = dimensions.width
        canvas.height = dimensions.height

        const render = () => {
            // 1. Clear Canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            // 2. Draw Grid
            drawGrid(ctx, canvas.width, canvas.height)

            // Current Progress (0 to 1 scaling based on multiplier)
            // Multiplier starts at 1.00. We map 1.00->10.00 to Screen coordinates.
            // If mult > 10, we keep plane at top right but background moves (simulated by just clamping for now)
            const progress = Math.min((multiplier - 1) / 10, 1)

            // Calculate Position
            // Start: Bottom Left (50, Height - 50)
            // End: Top Right (Width - 50, 50)
            const startX = 50
            const startY = canvas.height - 50
            const endX = canvas.width - 100
            const endY = 50

            // Bezier Control Point for curve
            const controlX = startX + (endX - startX) * 0.5
            const controlY = startY // Keep low to make it curve up late

            // Quadratic Bezier interpolation
            // B(t) = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
            const t = progress
            const mt = 1 - t

            const currentX = (mt * mt * startX) + (2 * mt * t * controlX) + (t * t * endX)
            const currentY = (mt * mt * startY) + (2 * mt * t * controlY) + (t * t * endY)

            // Calculate Angle (Derivative)
            // B'(t) = 2(1-t)(P1 - P0) + 2t(P2 - P1)
            const dx = 2 * mt * (controlX - startX) + 2 * t * (endX - controlX)
            const dy = 2 * mt * (controlY - startY) + 2 * t * (endY - controlY)
            let angle = Math.atan2(dy, dx)

            if (flying || crashed) {
                // Draw Trail/Curve
                ctx.beginPath()
                ctx.moveTo(startX, startY)

                // Draw up to current point
                // We fake the curve drawing by iterating t
                // Optimization: Just draw quadratic curve to current point? No, standard curveTo goes to end.
                // We need to trace the path.

                ctx.lineWidth = 4
                ctx.strokeStyle = '#ef4444' // Red trail
                // Gradient trail
                const gradient = ctx.createLinearGradient(startX, startY, currentX, currentY)
                gradient.addColorStop(0, 'rgba(239, 68, 68, 0)')
                gradient.addColorStop(1, crashed ? 'rgba(239, 68, 68, 1)' : 'rgba(16, 185, 129, 1)')
                ctx.strokeStyle = gradient

                // Tracing loop for accurate path rendering up to "t"
                if (progress > 0) {
                    for (let i = 0.01; i <= t; i += 0.01) {
                        const mti = 1 - i
                        const px = (mti * mti * startX) + (2 * mti * i * controlX) + (i * i * endX)
                        const py = (mti * mti * startY) + (2 * mti * i * controlY) + (i * i * endY)
                        ctx.lineTo(px, py)
                    }
                    ctx.lineTo(currentX, currentY)
                    ctx.stroke()

                    // Glow under area
                    ctx.lineTo(currentX, canvas.height)
                    ctx.lineTo(startX, canvas.height)
                    ctx.fillStyle = crashed ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)'
                    ctx.fill()
                }

                // Draw Plane
                if (!crashed) {
                    drawPlane(ctx, currentX, currentY, angle)
                }
                // Draw Explosion + Particles
                else {
                    if (particlesRef.current.length === 0) {
                        spawnParticles(currentX, currentY)
                    }
                    updateAndDrawParticles(ctx)
                }
            } else {
                // Waiting state: Plane on ground or runway
                drawPlane(ctx, 50, canvas.height - 50, 0)
                particlesRef.current = [] // Reset particles
            }

            animationFrameRef.current = requestAnimationFrame(render)
        }

        render()

        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
        }
    }, [multiplier, crashed, flying, dimensions])

    // Helpers
    const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
        ctx.lineWidth = 1

        ctx.beginPath()
        for (let x = 0; x <= width; x += 100) {
            ctx.moveTo(x, 0); ctx.lineTo(x, height)
        }
        for (let y = 0; y <= height; y += 100) {
            ctx.moveTo(0, y); ctx.lineTo(width, y)
        }
        ctx.stroke()
    }

    const drawPlane = (ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) => {
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(angle)

        if (planeImgRef.current) {
            // Draw Image (Assuming plane faces right by default)
            const size = 60
            // Offset to center
            ctx.drawImage(planeImgRef.current, -size / 2, -size / 2, size, size)
        } else {
            // Fallback Triangle
            ctx.fillStyle = '#3b82f6'
            ctx.beginPath()
            ctx.moveTo(20, 0); ctx.lineTo(-10, 10); ctx.lineTo(-10, -10); ctx.fill()
        }

        // Engine Glow
        ctx.shadowBlur = 15
        ctx.shadowColor = '#f59e0b'
        ctx.fillStyle = 'rgba(245, 158, 11, 0.5)'
        ctx.beginPath()
        ctx.arc(-25, 2, 5, 0, Math.PI * 2)
        ctx.fill()

        ctx.restore()
    }

    const spawnParticles = (x: number, y: number) => {
        for (let i = 0; i < 30; i++) {
            particlesRef.current.push({
                x, y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                alpha: 1,
                color: Math.random() > 0.5 ? '#ef4444' : '#f59e0b'
            })
        }
    }

    const updateAndDrawParticles = (ctx: CanvasRenderingContext2D) => {
        particlesRef.current.forEach((p, i) => {
            p.x += p.vx
            p.y += p.vy
            p.alpha -= 0.02

            if (p.alpha <= 0) {
                particlesRef.current.splice(i, 1)
                return
            }

            ctx.save()
            ctx.globalAlpha = p.alpha
            ctx.fillStyle = p.color
            ctx.beginPath()
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
            ctx.fill()
            ctx.restore()
        })
    }

    return (
        <div ref={containerRef} className="relative w-full h-full bg-dark-400/30 rounded-2xl overflow-hidden border border-white/5" style={{ height: '400px' }}>
            <canvas ref={canvasRef} className="block w-full h-full" />

            {/* Central Main Multiplier Display */}
            {flying && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className={`text-8xl font-black ${crashed ? 'text-red-500' : 'text-white'} drop-shadow-2xl transition-colors duration-100`}>
                        {multiplier.toFixed(2)}x
                    </div>
                </div>
            )}

            {/* Crashed Overlay */}
            {crashed && (
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm z-10"
                >
                    <div className="text-6xl font-black text-red-500 uppercase tracking-tighter drop-shadow-[0_0_30px_rgba(239,68,68,0.8)]">
                        Flew Away!
                    </div>
                    <div className="text-2xl text-white font-bold mt-2">
                        @ {multiplier.toFixed(2)}x
                    </div>
                </motion.div>
            )}
        </div>
    )
}
