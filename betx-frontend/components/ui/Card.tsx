interface CardProps {
    children: React.ReactNode
    className?: string
    glass?: boolean
}

export function Card({ children, className = '', glass = true }: CardProps) {
    return (
        <div className={`${glass ? 'glass' : 'bg-dark-100 border border-dark-200'} rounded-xl p-6 ${className}`}>
            {children}
        </div>
    )
}
