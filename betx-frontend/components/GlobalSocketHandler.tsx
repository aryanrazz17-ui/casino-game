'use client'

import { useGlobalSocket } from '@/hooks/useGlobalSocket'

export function GlobalSocketHandler() {
    useGlobalSocket()
    return null // This component doesn't render anything
}
