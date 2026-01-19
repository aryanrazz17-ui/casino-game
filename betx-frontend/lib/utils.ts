export function cn(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(' ')
}

export function formatCurrency(amount: number, currency: string = 'INR'): string {
    const value = Number(amount) || 0;
    if (currency === 'INR') {
        return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
    return `${value.toFixed(8)} ${currency}`
}

export function formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

export function generateClientSeed(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

export function truncateAddress(address: string, chars: number = 6): string {
    if (!address) return ''
    return `${address.slice(0, chars)}...${address.slice(-chars)}`
}

export function calculateMultiplier(prediction: 'over' | 'under', target: number): number {
    if (prediction === 'over') {
        return (99 / (99 - target)) * 0.98
    } else {
        return (99 / target) * 0.98
    }
}

export function calculatePayout(betAmount: number, multiplier: number): number {
    return betAmount * multiplier
}
