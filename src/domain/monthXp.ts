import { PRAYER_ORDER } from '@/src/domain/types';

const XP_PER_PRAYER_MAX = 8 + 4; // BASE + BONUS_ON_TIME

/**
 * Calendar days in the month for `monthKey` (`YYYY-MM`), local calendar semantics.
 */
export function daysInMonthForMonthKey(monthKey: string): number {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey.trim());
  if (!m) return 0;
  const year = Number(m[1]);
  const month1 = Number(m[2]);
  if (!year || month1 < 1 || month1 > 12) return 0;
  return new Date(year, month1, 0).getDate();
}

/**
 * Theoretical max XP earnable in that month: every prayer every day logged in the bonus window.
 */
export function maxMonthXp(monthKey: string): number {
  const days = daysInMonthForMonthKey(monthKey);
  if (days <= 0) return 0;
  return days * PRAYER_ORDER.length * XP_PER_PRAYER_MAX;
}

/** 0..1 capped; 0 if max is 0. */
export function monthXpProgress(earnedXp: number, monthKey: string): number {
  const max = maxMonthXp(monthKey);
  if (max <= 0) return 0;
  return Math.min(1, Math.max(0, earnedXp / max));
}
