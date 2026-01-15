'use client'

import React from 'react'

interface DiceSliderProps {
    value: number
    onChange: (val: number) => void
    prediction: 'over' | 'under'
    result?: number | null
}

export const DiceSlider: React.FC<DiceSliderProps> = ({ value, onChange, prediction, result }) => {
    return (
        <div className="relative w-full h-12 bg-dark-400 rounded-2xl p-2 border border-white/5 shadow-inner group">
            {/* Background segments */}
            <div className="absolute inset-2 flex rounded-xl overflow-hidden pointer-events-none">
                <div
                    className={`h-full transition-all duration-300 ${prediction === 'under' ? 'bg-green-500/20' : 'bg-red-500/20'}`}
                    style={{ width: `${value}%` }}
                />
                <div
                    className={`h-full transition-all duration-300 ${prediction === 'over' ? 'bg-green-500/20' : 'bg-red-500/20'}`}
                    style={{ width: `${100 - value}%` }}
                />
            </div>

            {/* Target Line */}
            <div
                className="absolute top-0 bottom-0 w-1 bg-white/40 z-10 transition-all duration-300"
                style={{ left: `${value}%` }}
            >
                <div className="absolute top-1/2 -translate-y-1/2 -left-4 w-9 h-9 bg-white rounded-xl shadow-xl flex items-center justify-center text-dark-100 font-black text-xs pointer-events-none">
                    {value}
                </div>
            </div>

            {/* Input Slider */}
            <input
                type="range"
                min="2"
                max="98"
                value={value}
                onChange={(e) => onChange(parseInt(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
            />

            {/* Result Marker */}
            {result !== undefined && result !== null && (
                <div
                    className="absolute -bottom-8 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center shadow-lg transform -translate-x-1/2 transition-all duration-500 animate-bounce"
                    style={{ left: `${result}%` }}
                >
                    <div className="w-2 h-2 bg-white rounded-full" />
                </div>
            )}
        </div>
    )
}
