export interface User {
    id: string
    username: string
    email: string
    role: 'user' | 'admin'
    profile: {
        avatar: string
        firstName?: string
        lastName?: string
        phone?: string
    }
    isVerified: boolean
    referralCode?: string
    createdAt: string
}

export interface Wallet {
    currency: 'INR' | 'BTC' | 'ETH' | 'TRON' | 'USDT'
    balance: number
    lockedBalance: number
    availableBalance: number
    cryptoAddress?: string
}

export interface Transaction {
    _id: string
    userId: string
    type: 'deposit' | 'withdrawal' | 'bet' | 'win' | 'refund' | 'bonus'
    currency: string
    amount: number
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
    paymentMethod?: string
    paymentGateway?: string
    createdAt: string
    metadata?: any
}

export interface Game {
    _id: string
    userId: string
    gameType: 'dice' | 'crash' | 'mines' | 'plinko' | 'slots'
    betAmount: number
    currency: string
    payout: number
    multiplier: number
    profit: number
    isWin: boolean
    result: any
    fairness: {
        serverSeed: string
        serverSeedHash: string
        clientSeed: string
        nonce: number
        revealed: boolean
    }
    createdAt: string
}

export interface DiceResult {
    gameId: string
    result: number
    prediction: 'over' | 'under'
    target: number
    isWin: boolean
    multiplier: number
    payout: number
    balance: number
    fairness: FairnessData
}

export interface CrashResult {
    gameId: string
    crashPoint: number
    cashoutAt: number
    isWin: boolean
    payout: number
    balance: number
    fairness: FairnessData
}

export interface MinesResult {
    gameId?: string
    hitMine: boolean
    gameOver: boolean
    multiplier: number
    currentPayout: number
    revealedTiles: number[]
    minePositions?: number[]
    payout?: number
    balance?: number
    fairness?: FairnessData
}

export interface PlinkoResult {
    gameId: string
    slotIndex: number
    multiplier: number
    payout: number
    balance: number
    path: number[]
    fairness: FairnessData
}

export interface SlotsResult {
    gameId: string
    reels: string[][]
    isWin: boolean
    multiplier: number
    payout: number
    balance: number
    fairness: FairnessData
}

export interface FairnessData {
    serverSeed: string
    serverSeedHash: string
    clientSeed: string
    nonce: number
}

export interface ApiResponse<T = any> {
    success: boolean
    message?: string
    data?: T
    error?: string
}
