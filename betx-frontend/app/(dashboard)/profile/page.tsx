'use client'

import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'
import { User, Mail, Calendar, Award } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default function ProfilePage() {
    const { user } = useAuthStore()

    if (!user) return null

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-bold mb-2">👤 Profile</h1>
                <p className="text-gray-400">Manage your account</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Profile Info */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <h3 className="text-xl font-bold mb-6">Account Information</h3>

                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <User className="w-5 h-5 text-gray-400" />
                                <div>
                                    <p className="text-sm text-gray-400">Username</p>
                                    <p className="font-semibold">{user.username}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <Mail className="w-5 h-5 text-gray-400" />
                                <div>
                                    <p className="text-sm text-gray-400">Email</p>
                                    <p className="font-semibold">{user.email}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <Calendar className="w-5 h-5 text-gray-400" />
                                <div>
                                    <p className="text-sm text-gray-400">Member Since</p>
                                    <p className="font-semibold">{formatDate(user.createdAt)}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <Award className="w-5 h-5 text-gray-400" />
                                <div>
                                    <p className="text-sm text-gray-400">Referral Code</p>
                                    <p className="font-semibold">{user.referralCode || 'Not available'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-dark-200">
                            <Button variant="secondary">Edit Profile</Button>
                        </div>
                    </Card>

                    <Card>
                        <h3 className="text-xl font-bold mb-6">Security</h3>
                        <div className="space-y-4">
                            <Button variant="secondary">Change Password</Button>
                            <Button variant="secondary">Enable 2FA</Button>
                        </div>
                    </Card>
                </div>

                {/* Stats */}
                <div className="space-y-6">
                    <Card>
                        <h3 className="text-xl font-bold mb-4">Statistics</h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-gray-400">Total Games</p>
                                <p className="text-2xl font-bold">0</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">Total Wagered</p>
                                <p className="text-2xl font-bold">₹0</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">Total Won</p>
                                <p className="text-2xl font-bold text-green-400">₹0</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">Win Rate</p>
                                <p className="text-2xl font-bold">0%</p>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <h3 className="text-xl font-bold mb-4">Account Status</h3>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Verified</span>
                                <span className={user.isVerified ? 'text-green-400' : 'text-red-400'}>
                                    {user.isVerified ? 'Yes' : 'No'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Role</span>
                                <span className="text-primary-400 capitalize">{user.role}</span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    )
}
