'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import { Mail, Lock, User } from 'lucide-react'

export default function RegisterPage() {
    const router = useRouter()
    const { register, isLoading } = useAuthStore()

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (formData.password !== formData.confirmPassword) {
            alert('Passwords do not match')
            return
        }

        try {
            await register(formData.username, formData.email, formData.password)
            router.push('/games')
        } catch (error) {
            console.error('Registration error:', error)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold mb-2">Create Account</h1>
                    <p className="text-gray-400">Join BetX and start playing</p>
                </div>

                <form onSubmit={handleSubmit} className="glass p-8 rounded-2xl space-y-6">
                    <div>
                        <label className="block text-sm font-medium mb-2">Username</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                className="w-full bg-dark-100 border border-dark-200 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-primary-500"
                                placeholder="Enter username"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full bg-dark-100 border border-dark-200 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-primary-500"
                                placeholder="Enter email"
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
                                minLength={8}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Confirm Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="password"
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                className="w-full bg-dark-100 border border-dark-200 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-primary-500"
                                placeholder="Confirm password"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg py-3 font-semibold transition-colors"
                    >
                        {isLoading ? 'Creating Account...' : 'Create Account'}
                    </button>

                    <p className="text-center text-gray-400">
                        Already have an account?{' '}
                        <Link href="/auth/login" className="text-primary-400 hover:text-primary-300">
                            Sign In
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    )
}
