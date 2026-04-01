import type { Metadata } from 'next'
import { Unbounded, Manrope, Sora, Raleway, Zen_Kaku_Gothic_New } from 'next/font/google'
import './globals.css'

const unbounded = Unbounded({
  weight: ['400', '700', '900'],
  subsets: ['latin'],
  variable: '--font-unbounded',
  display: 'swap',
})

const manrope = Manrope({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
})

const sora = Sora({
  weight: ['300', '400'],
  subsets: ['latin'],
  variable: '--font-sora',
  display: 'swap',
})

const raleway = Raleway({
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-raleway',
  display: 'swap',
})

const zenKaku = Zen_Kaku_Gothic_New({
  weight: ['300', '400', '700', '900'],
  subsets: ['latin'],
  variable: '--font-zen',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'WEB PROPOSAL AGENT',
  description: '多業種対応マルチエージェントシステム',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" className={`${unbounded.variable} ${manrope.variable} ${sora.variable} ${raleway.variable} ${zenKaku.variable}`}>
      <body>{children}</body>
    </html>
  )
}
