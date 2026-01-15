import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'

export function useAuth(requireAuth: boolean = false) {
    const router = useRouter()
    const { user, isAuthenticated, isLoading, fetchUser } = useAuthStore()

    useEffect(() => {
        if (requireAuth && !isAuthenticated && !isLoading) {
            router.push('/auth/login')
        }
    }, [requireAuth, isAuthenticated, isLoading, router])

    useEffect(() => {
        if (isAuthenticated && !user) {
            fetchUser()
        }
    }, [isAuthenticated, user, fetchUser])

    return {
        user,
        isAuthenticated,
        isLoading,
    }
}
