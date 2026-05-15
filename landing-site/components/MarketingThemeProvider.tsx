'use client'

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react'

import {
  applyPaletteToRoot,
  darkMarketing,
  lightMarketing,
  resolveInitialScheme,
  writeStoredScheme,
  type LandingScheme,
} from '@/lib/sholatinTheme'

type Ctx = {
  scheme: LandingScheme
  setScheme: (s: LandingScheme) => void
  toggle: () => void
}

const MarketingThemeContext = createContext<Ctx | null>(null)

export function MarketingThemeProvider({ children }: { children: React.ReactNode }) {
  const [scheme, setSchemeState] = useState<LandingScheme>(() => resolveInitialScheme())

  useLayoutEffect(() => {
    const p = scheme === 'dark' ? darkMarketing : lightMarketing
    applyPaletteToRoot(p)
    document.documentElement.dataset.shTheme = scheme
    document.documentElement.style.colorScheme = scheme === 'dark' ? 'dark' : 'light'
  }, [scheme])

  const setScheme = useCallback((s: LandingScheme) => {
    writeStoredScheme(s)
    setSchemeState(s)
  }, [])

  const toggle = useCallback(() => {
    setSchemeState((prev) => {
      const next: LandingScheme = prev === 'dark' ? 'light' : 'dark'
      writeStoredScheme(next)
      return next
    })
  }, [])

  const value = useMemo(
    () => ({
      scheme,
      setScheme,
      toggle,
    }),
    [scheme, setScheme, toggle],
  )

  return (
    <MarketingThemeContext.Provider value={value}>{children}</MarketingThemeContext.Provider>
  )
}

export function useMarketingTheme(): Ctx {
  const ctx = useContext(MarketingThemeContext)
  if (!ctx) {
    throw new Error('useMarketingTheme must be used within MarketingThemeProvider')
  }
  return ctx
}
