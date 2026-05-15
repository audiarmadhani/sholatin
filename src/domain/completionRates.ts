import type { PrayerName, PrayerStatus } from './types';
import { PRAYER_ORDER } from './types';

export type SlotSnapshot = {
  prayer: PrayerName;
  officialTimeMs: number;
  status: PrayerStatus | null; // null = not yet logged
};

/**
 * Denominator: expected fard slots from monthStart through "now" where official time has passed.
 * Logged: non-missed statuses count (excused counts as logged per plan).
 * On-time: status === on_time
 */
export function computeMonthCompletion(params: {
  monthStartMs: number;
  nowMs: number;
  slots: SlotSnapshot[]; // typically all days in month flattened with 5 prayers each — caller builds
}): { expected: number; logged: number; onTime: number; loggedPct: number; onTimePct: number } {
  const { slots, nowMs } = params;
  let expected = 0;
  let logged = 0;
  let onTime = 0;
  for (const s of slots) {
    if (s.officialTimeMs <= nowMs) {
      expected += 1;
      if (s.status !== null && s.status !== 'missed') logged += 1;
      if (s.status === 'on_time') onTime += 1;
    }
  }
  const loggedPct = expected === 0 ? 0 : Math.min(100, Math.round((100 * logged) / expected));
  const onTimePct = expected === 0 ? 0 : Math.min(100, Math.round((100 * onTime) / expected));
  return { expected, logged, onTime, loggedPct, onTimePct };
}

/** Build empty month slot list for each local calendar day in month (for aggregation queries). */
export function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

export { PRAYER_ORDER };
