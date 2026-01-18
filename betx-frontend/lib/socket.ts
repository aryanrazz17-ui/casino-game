import { io, Socket } from 'socket.io-client'

const SOCKET_URL = (process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:7000').replace(/\/$/, '')

class SocketClient {
    private sockets: Map<string, Socket> = new Map()

    connect(namespace: string, token: string): Socket {
        if (this.sockets.has(namespace)) {
            const socket = this.sockets.get(namespace)!
            if (socket.connected) return socket
            socket.auth = { token }
            socket.connect()
            return socket
        }

        console.log(`🔌 Connecting to ${namespace} at ${SOCKET_URL}`)

        const socket = io(`${SOCKET_URL}${namespace}`, {
            auth: { token },
            transports: ['websocket'], // FORCE WEBSOCKET
            upgrade: false, // Disable upgrade since we force websocket
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: Infinity, // Keep ensuring connection on mobile
            timeout: 20000,
            forceNew: true
        })

        socket.on('connect', () => {
            console.log(`✅ Connected to ${namespace} (${socket.id})`)
        })

        socket.on('connect_error', (err) => {
            console.error(`❌ Connection error on ${namespace}:`, err.message)
        })

        socket.on('disconnect', (reason) => {
            console.log(`⚠️ Disconnected from ${namespace}:`, reason)
            if (reason === 'io server disconnect') {
                // connection was manually closed by the server, reconnect manually
                socket.connect()
            }
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
