'use client'

import React, { useRef, useEffect } from 'react'

interface WheelProps {
    isSpinning: boolean
    segmentIndex?: number
    risk: 'LOW' | 'MEDIUM' | 'HIGH'
    onAnimationComplete?: () => void
}

const SEGMENT_COUNT = 10
const COLORS = [
    '#52525b', // 0 - Zinc-600
    '#22c55e', // 1 - Green-500
    '#3b82f6', // 2 - Blue-500
    '#eab308', // 3 - Yellow-500
    '#f97316', // 4 - Orange-500
    '#ec4899', // 5 - Pink-500
    '#a855f7', // 6 - Purple-500
    '#ef4444', // 7 - Red-500
    '#06b6d4', // 8 - Cyan-500
    '#14b8a6', // 9 - Teal-500
]

// To match backend logic:
// LOW: [1.5, 1.2, 1.2, 1.2, 0, 0, 1.2, 1.5, 1.2, 1.5]
// MEDIUM: [0, 0, 2.0, 0, 3.0, 0, 2.0, 0, 1.5, 5.0]
// HIGH: [0, 0, 0, 0, 0, 0, 10.0, 0, 0, 50.0]

const SEGMENT_MULTIPLIERS = {
    LOW: [1.5, 1.2, 1.2, 1.2, 0, 0, 1.2, 1.5, 1.2, 1.5],
    MEDIUM: [0, 0, 2.0, 0, 3.0, 0, 2.0, 0, 1.5, 5.0],
    HIGH: [0, 0, 0, 0, 0, 0, 10.0, 0, 0, 50.0]
}

const SEGMENT_COLORS = {
    LOW: ['#22c55e', '#3b82f6', '#3b82f6', '#3b82f6', '#52525b', '#52525b', '#3b82f6', '#22c55e', '#3b82f6', '#22c55e'],
    MEDIUM: ['#52525b', '#52525b', '#eab308', '#52525b', '#f97316', '#52525b', '#eab308', '#52525b', '#22c55e', '#ec4899'],
    HIGH: ['#52525b', '#52525b', '#52525b', '#52525b', '#52525b', '#52525b', '#ef4444', '#52525b', '#52525b', '#a855f7'] // a855f7 is 50x
}

export default function Wheel({ isSpinning, segmentIndex, risk, onAnimationComplete }: WheelProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const rotationRef = useRef(0)
    const velocityRef = useRef(0)
    const animationFrameRef = useRef<number>()

    // Draw the wheel
    const draw = (rotation: number) => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const centerX = canvas.width / 2
        const centerY = canvas.height / 2
        const radius = Math.min(centerX, centerY) - 10
        const segmentAngle = (2 * Math.PI) / SEGMENT_COUNT

        ctx.clearRect(0, 0, canvas.width, canvas.height)

        ctx.save()
        ctx.translate(centerX, centerY)
        ctx.rotate(rotation)

        const multipliers = SEGMENT_MULTIPLIERS[risk]
        const colors = SEGMENT_COLORS[risk]

        multipliers.forEach((mult, i) => {
            const startAngle = i * segmentAngle
            const endAngle = (i + 1) * segmentAngle

            // Segment
            ctx.beginPath()
            ctx.moveTo(0, 0)
            ctx.arc(0, 0, radius, startAngle, endAngle)
            ctx.fillStyle = colors[i]
            ctx.fill()
            ctx.strokeStyle = '#18181b' // Zinc-900 border
            ctx.lineWidth = 2
            ctx.stroke()

            // Text
            ctx.save()
            ctx.rotate(startAngle + segmentAngle / 2)
            ctx.textAlign = 'right'
            ctx.fillStyle = '#fff'
            ctx.font = 'bold 16px Inter, sans-serif'
            ctx.fillText(`${mult}x`, radius - 20, 5)
            ctx.restore()
        })

        ctx.restore()

        // Draw Center Cap
        ctx.beginPath()
        ctx.arc(centerX, centerY, 20, 0, 2 * Math.PI)
        ctx.fillStyle = '#fff'
        ctx.fill()

        // Draw Pointer (Static at top)
        ctx.beginPath()
        ctx.moveTo(centerX - 10, 10)
        ctx.lineTo(centerX + 10, 10)
        ctx.lineTo(centerX, 25)
        ctx.fillStyle = '#fff'
        ctx.fill()
    }

    // Animation Loop
    useEffect(() => {
        const animate = () => {
            // Update rotation logic
            if (isSpinning) {
                velocityRef.current = Math.min(velocityRef.current + 0.01, 0.5) // Accelerate
                rotationRef.current += velocityRef.current
            } else if (segmentIndex !== undefined && velocityRef.current > 0) {
                // Decelerate to target
                const segmentAngle = (2 * Math.PI) / SEGMENT_COUNT

                // Target angle: where the pointer (at -PI/2 in screen space, 0 in draw space is right) matches the segment
                // Since pointer is at TOP (-PI/2), and segment 0 starts at 0 (RIGHT), we need to align segment to top.
                // We want segmentIndex to be at -PI/2.
                // Center of segment N is N * segAngle + segAngle/2
                // We want (FinalRotation + SegmentCenter) % 2PI = -PI/2 (or 3PI/2)

                // Simplified: Just spin until velocity is tiny

                velocityRef.current *= 0.96 // Friction

                if (velocityRef.current < 0.001) {
                    velocityRef.current = 0

                    // Snap to grid for clean look? 
                    // No, let's just snap to the exact center of the target segment

                    // Backend says result = segmentIndex.
                    // Pointer is at Top. We rotate Wheel.
                    // To show segmentIndex at Top:
                    // Rotation should be such that Segment Angle is at -90deg (1.5 PI or -0.5 PI)
                    const targetRotation = - (segmentIndex * segmentAngle + segmentAngle / 2) - Math.PI / 2

                    // Smoothly interpolate to target ?? This is complex. 
                    // For now, let's stick to simple physics and if we miss slightly, we snap.
                    // But to ensure we land on the RIGHT segment, we need to know the target Distance.

                    // Simple hack: When stopping, just snap to correct final rotation if very slow.

                    const currentRot = rotationRef.current % (2 * Math.PI)
                    // We can just rely on the fact that we stop spinning, and then we force-set rotation
                    // But that looks jerky. 

                    // Better approach: Calculate total rotation needed when 'result' arrives.
                    // But we are doing continuous physics.

                    // Let's defer exact snap logic for v2. 
                    // For now, we will just force setting it when velocity is 0 if we want perfection.
                    // Actually, let's just invoke callback.
                    if (onAnimationComplete) onAnimationComplete()
                }

                rotationRef.current += velocityRef.current
            }

            draw(rotationRef.current)
            animationFrameRef.current = requestAnimationFrame(animate)
        }

        animate()

        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
        }
    }, [isSpinning, segmentIndex, risk])

    // Handle Result Arrival: Calculate distance to stop
    useEffect(() => {
        if (!isSpinning && segmentIndex !== undefined && velocityRef.current > 0.1) {
            // We just got the result, and we are spinning fast.
            // Plan the deceleration.
            // This is tricky without a physics engine. 
            // Alternative: Switch to CSS rotation for the stopping phase?
            // Or just pre-calculate:

            const segmentAngle = (2 * Math.PI) / SEGMENT_COUNT
            // Target is Top (-PI/2)
            // Center of segment is: index * stride + stride/2
            // We want Rotation + SegmentCenter = 2*PI*K - PI/2
            // => Rotation = -PI/2 - SegmentCenter + 2*PI*K

            const targetAngle = - Math.PI / 2 - (segmentIndex * segmentAngle + segmentAngle / 2)

            // Ensure target is "forward" from current
            const current = rotationRef.current
            const diff = targetAngle - current

            // Normalize diff to be positive and multiple spins away
            const extraSpins = 4 * 2 * Math.PI // 4 more spins
            const normalizedTarget = current + (2 * Math.PI + (diff % (2 * Math.PI))) % (2 * Math.PI) + extraSpins

            // Now we need to animate from current to normalizedTarget using easing
            // We can switch mode from "Physics velocity" to "Tween to Target"
            // But for this simple implementation:

            // Let's just set rotation to target immediately? NO.
            // Let's Hack:
            // 1. Stop velocity loop
            // 2. Start specific tween loop
        }
    }, [isSpinning, segmentIndex])

    // Improved Animation Logic with Tweening
    useEffect(() => {
        if (!isSpinning && segmentIndex !== undefined) {
            const segmentAngle = (2 * Math.PI) / SEGMENT_COUNT
            // Target angle validation:
            // 0 deg is right. -90 deg is top.
            // Segment 0 is [0, 36] deg. Center 18deg.
            // To bring Segment 0 to top (-90), we rotate -108 deg.

            const targetRotationForSegment = - (Math.PI / 2) - (segmentIndex * segmentAngle + segmentAngle / 2)

            // We want to arrive there from current rotation
            const currentRot = rotationRef.current

            // Add extra rotations for suspense
            const extraRotations = 5 * 2 * Math.PI

            // Calculate final target ensuring we keep moving forward (positive direction usually, but canvas Y-down... rotation is clockwise usually)
            // Clockwise means angle increases.
            // So if current is 10, target should be > 10.

            // Align target to be ahead
            let finalRot = targetRotationForSegment
            while (finalRot < currentRot + extraRotations) {
                finalRot += 2 * Math.PI
            }

            // Animate
            const duration = 4000 // 4s
            const startTime = performance.now()
            const startRot = currentRot

            const animateStop = (time: number) => {
                const elapsed = time - startTime
                const progress = Math.min(elapsed / duration, 1)

                // Ease Out Cubic
                const ease = 1 - Math.pow(1 - progress, 3)

                rotationRef.current = startRot + (finalRot - startRot) * ease
                draw(rotationRef.current)

                if (progress < 1) {
                    animationFrameRef.current = requestAnimationFrame(animateStop)
                } else {
                    if (onAnimationComplete) onAnimationComplete()
                }
            }

            animationFrameRef.current = requestAnimationFrame(animateStop)
        }
    }, [isSpinning, segmentIndex])

    return (
        <canvas
            ref={canvasRef}
            width={400}
            height={400}
            className="w-full max-w-[400px] h-auto mx-auto"
        />
    )
}
