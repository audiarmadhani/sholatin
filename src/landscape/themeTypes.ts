export type ThemeChannel = {
  id: string;
  label: string;
  costPerStep: number;
};

export type LayerBind = {
  preset: 'fadeIn';
  from: number;
  to: number;
};

export type ThemeLayer = {
  id: string;
  source: 'svg';
  channelId: string;
  parallax: { x: number; y: number };
  bind: LayerBind;
};

export type ThemePack = {
  id: string;
  channels: ThemeChannel[];
  layers: ThemeLayer[];
};

export function resolveOpacity(bind: LayerBind, p: number): number {
  const t = Math.min(1, Math.max(0, p));
  if (bind.preset === 'fadeIn') {
    return bind.from + (bind.to - bind.from) * t;
  }
  return 1;
}

export const DEFAULT_THEME_ID = 'default-meadow';
