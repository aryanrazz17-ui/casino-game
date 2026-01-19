import type { Metadata } from 'next'
import { Inter, Poppins } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { GlobalSocketHandler } from '@/components/GlobalSocketHandler'
import TopBar from '@/components/layout/TopBar'
import BottomNav from '@/components/layout/BottomNav'
import WinnerPopup from '@/components/layout/WinnerPopup'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const poppins = Poppins({
    weight: ['400', '500', '600', '700', '800', '900'],
    subsets: ['latin'],
    variable: '--font-poppins'
})

export const metadata: Metadata = {
    title: 'BetX - Premium Online Casino',
    description: 'Play provably fair casino games with instant payouts and high RTP.',
    keywords: 'casino, gambling, crypto, betx, betting, slots, dice',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
            <body className={`${inter.className} bg-[#0a0a0f] text-white selection:bg-primary-500/30`}>
                <GlobalSocketHandler />
                <TopBar />
                <main className="pt-16 pb-20 md:pb-0 min-h-screen">
                    {children}
                </main>
                <BottomNav />
                <WinnerPopup />
                <Toaster
                    position="top-right"
                    toastOptions={{
                        duration: 3000,
                        style: {
                            background: '#18181b',
                            color: '#fff',
                            border: '1px solid rgba(255,255,255,0.05)',
                            borderRadius: '16px',
                        },
                    }}
                />
            </body>
        </html>
    )
}
