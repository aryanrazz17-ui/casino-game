import { useEffect, useState } from 'react'
import { Socket } from 'socket.io-client'
import socketClient from '@/lib/socket'
import { useAuthStore } from '@/store/authStore'

export function useSocket(namespace: string) {
    const [socket, setSocket] = useState<Socket | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const { accessToken } = useAuthStore()

    useEffect(() => {
        if (!accessToken) return

        const socketInstance = socketClient.connect(namespace, accessToken)
        setSocket(socketInstance)

        socketInstance.on('connect', () => {
            setIsConnected(true)
        })

        socketInstance.on('disconnect', () => {
            setIsConnected(false)
        })

        return () => {
            socketClient.disconnect(namespace)
            setSocket(null)
            setIsConnected(false)
        }
    }, [namespace, accessToken])

    return { socket, isConnected }
}
