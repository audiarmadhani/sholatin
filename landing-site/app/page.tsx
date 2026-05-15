'use client'

import dynamic from 'next/dynamic'

const LandingPage = dynamic(() => import('@/components/LandingPage'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        minHeight: '100vh',
        background: '#f4f2fa',
      }}
      aria-hidden
    />
  ),
})

export default function Home() {
  return <LandingPage />
}
