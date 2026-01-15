import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '@/lib/api'
import { User, Wallet } from '@/types'
import toast from 'react-hot-toast'

interface AuthState {
    user: User | null
    wallets: Wallet[]
    accessToken: string | null
    refreshToken: string | null
    isAuthenticated: boolean
    isLoading: boolean

    // Actions
    login: (identifier: string, password: string) => Promise<void>
    register: (username: string, email: string, password: string) => Promise<void>
    logout: () => Promise<void>
    fetchUser: () => Promise<void>
    updateWallets: (wallets: Wallet[]) => void
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            wallets: [],
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,

            login: async (identifier, password) => {
                try {
                    set({ isLoading: true })
                    const response = await api.post('/auth/login', { identifier, password })

                    const { user, accessToken, refreshToken } = response.data.data

                    localStorage.setItem('accessToken', accessToken)
                    localStorage.setItem('refreshToken', refreshToken)

                    set({
                        user,
                        accessToken,
                        refreshToken,
                        isAuthenticated: true,
                        isLoading: false,
                    })

                    // Fetch wallets
                    await get().fetchUser()

                    toast.success('Login successful!')
                } catch (error: any) {
                    set({ isLoading: false })
                    toast.error(error.response?.data?.message || 'Login failed')
                    throw error
                }
            },

            register: async (username, email, password) => {
                try {
                    set({ isLoading: true })
                    const response = await api.post('/auth/register', { username, email, password })

                    const { user, accessToken, refreshToken } = response.data.data

                    localStorage.setItem('accessToken', accessToken)
                    localStorage.setItem('refreshToken', refreshToken)

                    set({
                        user,
                        accessToken,
                        refreshToken,
                        isAuthenticated: true,
                        isLoading: false,
                    })

                    toast.success('Registration successful!')
                } catch (error: any) {
                    set({ isLoading: false })
                    toast.error(error.response?.data?.message || 'Registration failed')
                    throw error
                }
            },

            logout: async () => {
                try {
                    await api.post('/auth/logout')
                } catch (error) {
                    console.error('Logout error:', error)
                } finally {
                    localStorage.removeItem('accessToken')
                    localStorage.removeItem('refreshToken')

                    set({
                        user: null,
                        wallets: [],
                        accessToken: null,
                        refreshToken: null,
                        isAuthenticated: false,
                    })

                    toast.success('Logged out successfully')
                }
            },

            fetchUser: async () => {
                try {
                    const response = await api.get('/auth/me')
                    const { user, wallets } = response.data.data

                    set({ user, wallets })
                } catch (error) {
                    console.error('Fetch user error:', error)
                }
            },

            updateWallets: (wallets) => {
                set({ wallets })
            },
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                accessToken: state.accessToken,
                refreshToken: state.refreshToken,
            }),
        }
    )
)
