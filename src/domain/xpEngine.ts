import { BONUS_ON_TIME_XP, BONUS_WINDOW_MS, BASE_XP, type PrayerStatus } from './types';

export type XpBreakdown = { base: number; bonus: number; total: number; status: PrayerStatus };

/**
 * Official time T = prayer official instant (UTC ms).
 * Bonus if recordedAt in [T, T + 30m].
 * Status: on_time in bonus window; late if recorded same calendar day after window (caller passes isSameLocalDay); excused from caller.
 */
export function classifyAndScoreXp(params: {
  recordedAtMs: number;
  officialTimeMs: number;
  excused?: boolean;
}): XpBreakdown {
  const { recordedAtMs, officialTimeMs, excused } = params;
  if (excused) {
    return { base: BASE_XP, bonus: 0, total: BASE_XP, status: 'excused' };
  }
  const endBonus = officialTimeMs + BONUS_WINDOW_MS;
  if (recordedAtMs >= officialTimeMs && recordedAtMs <= endBonus) {
    return {
      base: BASE_XP,
      bonus: BONUS_ON_TIME_XP,
      total: BASE_XP + BONUS_ON_TIME_XP,
      status: 'on_time',
    };
  }
  if (recordedAtMs > endBonus) {
    return { base: BASE_XP, bonus: 0, total: BASE_XP, status: 'late' };
  }
  // Before official time — still loggable, no bonus
  return { base: BASE_XP, bonus: 0, total: BASE_XP, status: 'late' };
}

export { BONUS_WINDOW_MS };
