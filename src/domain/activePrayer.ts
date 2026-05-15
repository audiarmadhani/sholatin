import type { DayTimings } from '@/src/services/prayerTimes';
import { BONUS_WINDOW_MS } from './types';
import type { PrayerName } from './types';
import { PRAYER_ORDER } from './types';

export type FocusPrayerPhase =
  | 'until_official'
  | 'gentle_window'
  | 'late_same_day'
  | 'all_logged'
  | 'dev_mode';

export type FocusPrayerContext = {
  prayer: PrayerName;
  phase: FocusPrayerPhase;
  /** Countdown target (ms since epoch), or null when no timer. */
  targetMs: number | null;
  allLogged: boolean;
};

function isPrayerDone(logged: Set<PrayerName>, p: PrayerName): boolean {
  return logged.has(p);
}

/**
 * Pick the first salah of the day that still needs logging (anything except a non-missed row),
 * and what to count down to: official time before adhān, end of the 30m gentle window after adhān,
 * or no timer when that window has passed but the prayer can still be logged late.
 * With `devMode`, time gates are ignored for focus UI and a synthetic `dev_mode` phase is used for testing.
 */
export function getFocusPrayerContext(
  nowMs: number,
  timings: DayTimings,
  loggedNonMissed: Set<PrayerName>,
  opts?: { devMode?: boolean },
): FocusPrayerContext {
  const devMode = opts?.devMode ?? false;

  const pending = PRAYER_ORDER.find((p) => !isPrayerDone(loggedNonMissed, p));
  if (!pending) {
    if (devMode) {
      return {
        prayer: PRAYER_ORDER[0],
        phase: 'dev_mode',
        targetMs: null,
        allLogged: false,
      };
    }
    const last = PRAYER_ORDER[PRAYER_ORDER.length - 1];
    return { prayer: last, phase: 'all_logged', targetMs: null, allLogged: true };
  }

  const T = timings[pending];
  const gentleEnd = T + BONUS_WINDOW_MS;

  if (nowMs < T) {
    if (devMode) {
      return { prayer: pending, phase: 'dev_mode', targetMs: T, allLogged: false };
    }
    return { prayer: pending, phase: 'until_official', targetMs: T, allLogged: false };
  }
  if (nowMs <= gentleEnd) {
    return { prayer: pending, phase: 'gentle_window', targetMs: gentleEnd, allLogged: false };
  }
  return { prayer: pending, phase: 'late_same_day', targetMs: null, allLogged: false };
}

export function formatCountdown(remainingMs: number): string {
  const s = Math.max(0, Math.floor(remainingMs / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
