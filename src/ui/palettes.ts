/** Shared shape for app surfaces (light + dark). */
export type AppColorPalette = {
  background: string;
  surface: string;
  surfaceMuted: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryMuted: string;
  border: string;
  success: string;
  onPrimary: string;
  homeSky: string;
  homeMint: string;
  homeGrass: string;
  homeDeep: string;
  homeAccent: string;
  homeCardShadow: string;
  /** Home XP strip / glass panels */
  homeGlass: string;
  homeGlassBorder: string;
  /** Primary CTA on home */
  homeCtaBg: string;
  homeCtaShadow: string;
  /** Bottom tab bar */
  tabBarBg: string;
  tabBarBorder: string;
  /** Landscape card shell behind art */
  sceneShellBg: string;
  levelBadgeBg: string;
  xpTrackBg: string;
  homeMutedCtaBg: string;
  homeMutedCtaBorder: string;
  focusCardShadow: string;
};

/** Light — soft sky → mint (existing look). */
export const lightPalette: AppColorPalette = {
  background: '#F4F2FA',
  surface: '#FFFFFF',
  surfaceMuted: '#EDE9F7',
  text: '#1E1A2E',
  textMuted: '#6B6280',
  primary: '#5B4B9A',
  primaryMuted: '#8B7EC8',
  border: '#E0DAF0',
  success: '#3D8B6E',
  onPrimary: '#FFFFFF',
  homeSky: '#D9EEF9',
  homeMint: '#E8F5EE',
  homeGrass: '#C9EAD4',
  homeDeep: '#2D4A3E',
  homeAccent: '#5AB88A',
  homeCardShadow: 'rgba(45, 74, 62, 0.12)',
  homeGlass: 'rgba(255,255,255,0.55)',
  homeGlassBorder: 'rgba(255,255,255,0.85)',
  homeCtaBg: '#2D4A3E',
  homeCtaShadow: '#2D4A3E',
  tabBarBg: 'rgba(255,255,255,0.92)',
  tabBarBorder: 'rgba(45,74,62,0.12)',
  sceneShellBg: '#FFFFFF',
  levelBadgeBg: 'rgba(255,255,255,0.92)',
  xpTrackBg: 'rgba(45,74,62,0.12)',
  homeMutedCtaBg: 'rgba(255,255,255,0.65)',
  homeMutedCtaBorder: 'rgba(45,74,62,0.15)',
  focusCardShadow: 'rgba(0,0,0,0.08)',
};

/** Dark — deep forest night, mint highlights, easy on eyes. */
export const darkPalette: AppColorPalette = {
  background: '#0E1412',
  surface: '#1A2420',
  surfaceMuted: '#24302C',
  text: '#E6F4EC',
  textMuted: '#8FADA0',
  primary: '#9B8AD4',
  primaryMuted: '#B8A9E8',
  border: '#2D3D38',
  success: '#5AB88A',
  onPrimary: '#0E1412',
  homeSky: '#152028',
  homeMint: '#1A2E24',
  homeGrass: '#1F3628',
  homeDeep: '#C8EAD6',
  homeAccent: '#6FD4A3',
  homeCardShadow: 'rgba(0, 0, 0, 0.35)',
  homeGlass: 'rgba(32, 48, 40, 0.72)',
  homeGlassBorder: 'rgba(120, 180, 150, 0.18)',
  homeCtaBg: '#3D8B6E',
  homeCtaShadow: '#1a3328',
  tabBarBg: 'rgba(22, 32, 28, 0.94)',
  tabBarBorder: 'rgba(120, 160, 140, 0.15)',
  sceneShellBg: '#1F2A26',
  levelBadgeBg: '#1E2C27',
  xpTrackBg: 'rgba(200,230,210,0.14)',
  homeMutedCtaBg: 'rgba(40,56,48,0.82)',
  homeMutedCtaBorder: 'rgba(120,160,140,0.28)',
  focusCardShadow: 'rgba(0,0,0,0.45)',
};
