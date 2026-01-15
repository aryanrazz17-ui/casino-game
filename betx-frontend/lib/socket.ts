import { io, Socket } from 'socket.io-client'

const SOCKET_URL = (process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:7000').replace(/\/$/, '')

class SocketClient {
    private sockets: Map<string, Socket> = new Map()

    connect(namespace: string, token: string): Socket {
        if (this.sockets.has(namespace)) {
            return this.sockets.get(namespace)!
        }

        const socket = io(`${SOCKET_URL}${namespace}`, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
        })

        socket.on('connect', () => {
            console.log(`✅ Connected to ${namespace}`)
        })

        socket.on('disconnect', (reason) => {
            console.log(`❌ Disconnected from ${namespace}:`, reason)
        })

        socket.on('error', (error) => {
            console.error(`Socket error on ${namespace}:`, error)
        })

        this.sockets.set(namespace, socket)
        return socket
    }

    disconnect(namespace: string) {
        const socket = this.sockets.get(namespace)
        if (socket) {
            socket.disconnect()
            this.sockets.delete(namespace)
        }
    }

    disconnectAll() {
        this.sockets.forEach((socket) => socket.disconnect())
        this.sockets.clear()
    }

    getSocket(namespace: string): Socket | undefined {
        return this.sockets.get(namespace)
    }
}

export const socketClient = new SocketClient()
export default socketClient
