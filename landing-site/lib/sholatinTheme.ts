/**
 * Marketing landing tokens — keep in sync with the main app:
 * `src/ui/palettes.ts` and `src/ui/tokens.ts` (sholatin repo root).
 */
export const radii = {
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export const space = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export type MarketingPalette = {
  background: string;
  surface: string;
  surfaceMuted: string;
  text: string;
  textMuted: string;
  primary: string;
  border: string;
  homeSky: string;
  homeMint: string;
  homeGrass: string;
  homeDeep: string;
  homeAccent: string;
  homeGlass: string;
  homeGlassBorder: string;
  homeCtaBg: string;
  homeMutedCtaBg: string;
  homeMutedCtaBorder: string;
  onPrimary: string;
};

export const lightMarketing: MarketingPalette = {
  background: '#F4F2FA',
  surface: '#FFFFFF',
  surfaceMuted: '#EDE9F7',
  text: '#1E1A2E',
  textMuted: '#6B6280',
  primary: '#5B4B9A',
  border: '#E0DAF0',
  homeSky: '#D9EEF9',
  homeMint: '#E8F5EE',
  homeGrass: '#C9EAD4',
  homeDeep: '#2D4A3E',
  homeAccent: '#5AB88A',
  homeGlass: 'rgba(255,255,255,0.55)',
  homeGlassBorder: 'rgba(255,255,255,0.85)',
  homeCtaBg: '#2D4A3E',
  homeMutedCtaBg: 'rgba(255,255,255,0.65)',
  homeMutedCtaBorder: 'rgba(45,74,62,0.15)',
  onPrimary: '#FFFFFF',
};

export const darkMarketing: MarketingPalette = {
  background: '#0E1412',
  surface: '#1A2420',
  surfaceMuted: '#24302C',
  text: '#E6F4EC',
  textMuted: '#8FADA0',
  primary: '#9B8AD4',
  border: '#2D3D38',
  homeSky: '#152028',
  homeMint: '#1A2E24',
  homeGrass: '#1F3628',
  homeDeep: '#C8EAD6',
  homeAccent: '#6FD4A3',
  homeGlass: 'rgba(32, 48, 40, 0.72)',
  homeGlassBorder: 'rgba(120, 180, 150, 0.18)',
  homeCtaBg: '#3D8B6E',
  homeMutedCtaBg: 'rgba(40,56,48,0.82)',
  homeMutedCtaBorder: 'rgba(120,160,140,0.28)',
  onPrimary: '#0E1412',
};

const STORAGE_KEY = 'sholatin-landing-theme';

export type LandingScheme = 'light' | 'dark';

export function readStoredScheme(): LandingScheme | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'light' || raw === 'dark') return raw;
  } catch {
    /* ignore */
  }
  return null;
}

export function writeStoredScheme(scheme: LandingScheme) {
  try {
    localStorage.setItem(STORAGE_KEY, scheme);
  } catch {
    /* ignore */
  }
}

export function systemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function resolveInitialScheme(): LandingScheme {
  const stored = readStoredScheme();
  if (stored) return stored;
  return systemPrefersDark() ? 'dark' : 'light';
}

export function paletteToCssVars(p: MarketingPalette): Record<string, string> {
  return {
    '--sh-background': p.background,
    '--sh-surface': p.surface,
    '--sh-surface-muted': p.surfaceMuted,
    '--sh-text': p.text,
    '--sh-text-muted': p.textMuted,
    '--sh-primary': p.primary,
    '--sh-border': p.border,
    '--sh-home-sky': p.homeSky,
    '--sh-home-mint': p.homeMint,
    '--sh-home-grass': p.homeGrass,
    '--sh-home-deep': p.homeDeep,
    '--sh-home-accent': p.homeAccent,
    '--sh-home-glass': p.homeGlass,
    '--sh-home-glass-border': p.homeGlassBorder,
    '--sh-home-cta': p.homeCtaBg,
    '--sh-home-muted-cta-bg': p.homeMutedCtaBg,
    '--sh-home-muted-cta-border': p.homeMutedCtaBorder,
    '--sh-on-primary': p.onPrimary,
    '--sh-radius-lg': `${radii.lg}px`,
    '--sh-radius-xl': `${radii.xl}px`,
    '--sh-space-xs': `${space.xs}px`,
    '--sh-space-sm': `${space.sm}px`,
    '--sh-space-md': `${space.md}px`,
    '--sh-space-lg': `${space.lg}px`,
    '--sh-space-xl': `${space.xl}px`,
  };
}

export function applyPaletteToRoot(p: MarketingPalette) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const vars = paletteToCssVars(p);
  for (const [key, val] of Object.entries(vars)) {
    root.style.setProperty(key, val);
  }
}
