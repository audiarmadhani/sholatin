import catalogRaw from '../../assets/unlock_catalog.json';
import { maxMonthXp } from '@/src/domain/monthXp';

export type UnlockCatalogRow = {
  id: string;
  label: string;
  channels: Record<string, number>;
};

export type UnlockTier = UnlockCatalogRow & {
  /** Unlock when month XP / max >= this (0..1). */
  minProgress: number;
};

const raw = catalogRaw as unknown as UnlockCatalogRow[];

/**
 * Ordered landscape unlock tiers (terrain → mountains → mosque → river → bridge → … → clouds last).
 * Thresholds are evenly spaced from 0 through 1 across the list.
 */
export function getUnlockTiers(): UnlockTier[] {
  const n = raw.length;
  if (n === 0) return [];
  if (n === 1) return [{ ...raw[0], minProgress: 0 }];
  return raw.map((row, i) => ({
    ...row,
    minProgress: i / (n - 1),
  }));
}

export function highestUnlockedTierIndex(earnedXp: number, maxXp: number, tiers: UnlockTier[]): number {
  if (tiers.length === 0) return -1;
  if (maxXp <= 0) return 0;
  const p = Math.min(1, Math.max(0, earnedXp / maxXp));
  let hi = -1;
  for (let i = 0; i < tiers.length; i++) {
    if (p + 1e-9 >= tiers[i].minProgress) hi = i;
  }
  return Math.max(0, hi);
}

/** Sum channel contributions from tiers 0..inclusive; each channel capped at 1. */
export function channelProgressFromUnlockTiers(
  highestTierInclusive: number,
  tiers: UnlockTier[],
): Record<string, number> {
  const acc: Record<string, number> = {};
  const hi = Math.min(highestTierInclusive, tiers.length - 1);
  if (hi < 0) return acc;
  for (let i = 0; i <= hi; i++) {
    const ch = tiers[i].channels;
    for (const [k, v] of Object.entries(ch)) {
      acc[k] = (acc[k] ?? 0) + v;
    }
  }
  for (const k of Object.keys(acc)) {
    acc[k] = Math.min(1, acc[k]);
  }
  return acc;
}

/** Channel opacity for the scene from month XP unlocks only (monotonic stored tier vs computed). */
export function getMergedChannelProgress(row: {
  month_key: string;
  xp_total: number;
  channel_progress_json?: string;
  unlock_state_json?: string;
}): Record<string, number> {
  const tiers = getUnlockTiers();
  const max = maxMonthXp(row.month_key);
  const st = parseUnlockState(row.unlock_state_json);
  const fromXp = highestUnlockedTierIndex(row.xp_total, max, tiers);
  const tier = Math.max(st.highestTier, fromXp);
  return channelProgressFromUnlockTiers(tier, tiers);
}

export type UnlockStateV1 = { v: 1; highestTier: number };

export function parseUnlockState(json: string | null | undefined): UnlockStateV1 {
  if (!json || json === '{}') return { v: 1, highestTier: -1 };
  try {
    const o = JSON.parse(json) as Partial<UnlockStateV1>;
    if (o.v === 1 && typeof o.highestTier === 'number') {
      return { v: 1, highestTier: o.highestTier };
    }
  } catch {
    /* fallthrough */
  }
  return { v: 1, highestTier: -1 };
}

export function serializeUnlockState(s: UnlockStateV1): string {
  return JSON.stringify(s);
}

/** Monotonic: never lower highestTier than stored. */
export function nextUnlockState(
  stored: UnlockStateV1,
  earnedXp: number,
  maxXp: number,
  tiers: UnlockTier[],
): UnlockStateV1 {
  const computed = highestUnlockedTierIndex(earnedXp, maxXp, tiers);
  return {
    v: 1,
    highestTier: Math.max(stored.highestTier, computed),
  };
}

export function nextTierLabel(
  highestTierInclusive: number,
  tiers: UnlockTier[],
): string | null {
  const next = highestTierInclusive + 1;
  if (next >= tiers.length) return null;
  return tiers[next].label;
}

/** Progress within the current landscape “level” (segment between tier thresholds). */
export type LandscapeLevelSegment = {
  /** 1-based; equals highest unlocked tier index + 1. */
  level: number;
  maxLevels: number;
  highestTierIndex: number;
  segmentStartXp: number;
  segmentEndXp: number;
  /** 0..1 fill for the top bar (this level only, so the bar stays short per segment). */
  segmentFill: number;
  /** XP earned within this segment (for display). */
  withinSegmentXp: number;
  /** Size of this segment in XP (for display). */
  segmentSpanXp: number;
};

/**
 * Maps month XP to the current landscape level and intra-level progress.
 * The bar should use `segmentFill` (not raw month fraction) so each unlock step gets its own 0–100% track.
 */
export function getLandscapeLevelSegment(
  earnedXp: number,
  maxXp: number,
  tiers: UnlockTier[],
): LandscapeLevelSegment {
  const n = tiers.length;
  if (n === 0 || maxXp <= 0) {
    return {
      level: 0,
      maxLevels: 0,
      highestTierIndex: -1,
      segmentStartXp: 0,
      segmentEndXp: 0,
      segmentFill: 0,
      withinSegmentXp: 0,
      segmentSpanXp: 0,
    };
  }

  const hi = highestUnlockedTierIndex(earnedXp, maxXp, tiers);
  const level = hi + 1;
  const segmentStartXp = tiers[hi].minProgress * maxXp;
  const next = hi + 1;
  const segmentEndXp = next < n ? tiers[next].minProgress * maxXp : maxXp;
  const span = segmentEndXp - segmentStartXp;
  const clampedEarned = Math.min(maxXp, Math.max(0, earnedXp));
  const rawWithin = clampedEarned - segmentStartXp;
  const within = Math.max(0, Math.min(span > 0 ? span : 0, rawWithin));
  const fill = span <= 0 ? 1 : Math.min(1, Math.max(0, within / span));

  return {
    level,
    maxLevels: n,
    highestTierIndex: hi,
    segmentStartXp,
    segmentEndXp,
    segmentFill: fill,
    withinSegmentXp: Math.round(within),
    segmentSpanXp: Math.max(0, Math.round(span)),
  };
}
