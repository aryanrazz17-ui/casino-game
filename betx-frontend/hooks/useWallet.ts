import { useEffect } from 'react'
import { useWalletStore } from '@/store/walletStore'
import { useAuthStore } from '@/store/authStore'

export function useWallet() {
    const { wallets, selectedCurrency, fetchWallets, selectCurrency, getWallet } = useWalletStore()
    const { isAuthenticated } = useAuthStore()

    useEffect(() => {
        if (isAuthenticated) {
            fetchWallets()
        }
    }, [isAuthenticated, fetchWallets])

    const currentWallet = getWallet(selectedCurrency)

    return {
        wallets,
        currentWallet,
        selectedCurrency,
        selectCurrency,
        fetchWallets,
    }
}
