'use client'

import { useEffect, useState } from 'react'
import { Socket } from 'socket.io-client'
import socketClient from '@/lib/socket'
import { useAuthStore } from '@/store/authStore'
import { useWalletStore } from '@/store/walletStore'
import toast from 'react-hot-toast'

export function useGlobalSocket() {
    const [socket, setSocket] = useState<Socket | null>(null)
    const { accessToken, user } = useAuthStore()
    const { updateBalance } = useWalletStore()

    useEffect(() => {
        if (!accessToken) return

        // Connect to root namespace for global events
        const socketInstance = socketClient.connect('/', accessToken)
        setSocket(socketInstance)

        socketInstance.on('wallet_update', (data: any) => {
            console.log('💰 Wallet Update Received:', data)
            if (data.newBalance !== undefined) {
                updateBalance(data.currency || 'INR', data.newBalance)
            } else if (data.balance !== undefined) {
                updateBalance(data.currency || 'INR', data.balance)
            }

            if (data.message) {
                toast.success(data.message, { icon: '💰' })
            }
        })

        socketInstance.on('notification', (data: any) => {
            if (data.severity === 'error') {
                toast.error(data.message)
            } else {
                toast.success(data.message)
            }
        })

        return () => {
            // We might want to keep the root connection alive as long as the user is logged in
            // so we don't necessarily disconnect here if this is used globally.
        }
    }, [accessToken, updateBalance])

    return { socket }
}
