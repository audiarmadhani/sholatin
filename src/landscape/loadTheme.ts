import type { ThemePack } from './themeTypes';
import defaultPack from '../../assets/themes/default/theme.json';

export function loadDefaultTheme(): ThemePack {
  return defaultPack as ThemePack;
}
