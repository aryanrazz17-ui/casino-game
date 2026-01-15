import { create } from 'zustand'
import { Wallet } from '@/types'
import api from '@/lib/api'
import toast from 'react-hot-toast'

interface WalletState {
    wallets: Wallet[]
    selectedCurrency: 'INR' | 'BTC' | 'ETH' | 'TRON' | 'USDT'
    isLoading: boolean

    // Actions
    fetchWallets: () => Promise<void>
    selectCurrency: (currency: 'INR' | 'BTC' | 'ETH' | 'TRON' | 'USDT') => void
    getWallet: (currency: string) => Wallet | undefined
    updateBalance: (currency: string, newBalance: number) => void
}

export const useWalletStore = create<WalletState>((set, get) => ({
    wallets: [],
    selectedCurrency: 'INR',
    isLoading: false,

    fetchWallets: async () => {
        try {
            set({ isLoading: true })
            const response = await api.get('/wallet/balance')
            set({ wallets: response.data.data, isLoading: false })
        } catch (error: any) {
            set({ isLoading: false })
            toast.error('Failed to fetch wallets')
        }
    },

    selectCurrency: (currency) => {
        set({ selectedCurrency: currency })
    },

    getWallet: (currency) => {
        return get().wallets.find((w) => w.currency === currency)
    },

    updateBalance: (currency, newBalance) => {
        set((state) => ({
            wallets: state.wallets.map((w) =>
                w.currency === currency ? { ...w, balance: newBalance } : w
            ),
        }))
    },
}))
