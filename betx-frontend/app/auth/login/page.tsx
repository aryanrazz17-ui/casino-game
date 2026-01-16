'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import { Mail, Lock } from 'lucide-react'

export default function LoginPage() {
    const router = useRouter()
    const { login, isLoading } = useAuthStore()

    const [formData, setFormData] = useState({
        identifier: '',
        password: '',
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        try {
            await login(formData.identifier, formData.password)

            // Get current user to check role
            const user = useAuthStore.getState().user
            if (user?.role === 'admin') {
                router.push('/admin')
            } else {
                router.push('/games')
            }
        } catch (error) {
            console.error('Login error:', error)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold mb-2">Welcome Back</h1>
                    <p className="text-gray-400">Sign in to your account</p>
                </div>

                <form onSubmit={handleSubmit} className="glass p-8 rounded-2xl space-y-6">
                    <div>
                        <label className="block text-sm font-medium mb-2">Email or Username</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={formData.identifier}
                                onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                                className="w-full bg-dark-100 border border-dark-200 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-primary-500"
                                placeholder="Enter email or username"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full bg-dark-100 border border-dark-200 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-primary-500"
                                placeholder="Enter password"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg py-3 font-semibold transition-colors"
                    >
                        {isLoading ? 'Signing In...' : 'Sign In'}
                    </button>

                    <p className="text-center text-gray-400">
                        Don't have an account?{' '}
                        <Link href="/auth/register" className="text-primary-400 hover:text-primary-300">
                            Create Account
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    )
}
