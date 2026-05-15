import type { Metadata } from 'next'
import { Geist } from 'next/font/google'

import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Sholatin — gentle prayer rhythm',
  description:
    'Calm salah tracking with adhān-aware windows, soft XP, and a living landscape that grows with your consistency.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={geistSans.variable} suppressHydrationWarning>
      <body className={geistSans.className}>{children}</body>
    </html>
  )
}
