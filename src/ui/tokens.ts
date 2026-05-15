import type { AppColorPalette } from '@/src/ui/palettes';
import { lightPalette } from '@/src/ui/palettes';

export type { AppColorPalette };
/** @deprecated Use useAppTheme().colors — kept for rare non-hook call sites */
export const colors: AppColorPalette = lightPalette;

export const radii = {
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
};

export const space = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
};
