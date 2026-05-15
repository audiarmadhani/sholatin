import { getFocusPrayerContext, formatCountdown } from '../activePrayer';
import { BONUS_WINDOW_MS } from '../types';
import type { DayTimings } from '@/src/services/prayerTimes';

function timings(fajr: number): DayTimings {
  const step = 3 * 60 * 60 * 1000;
  return {
    FAJR: fajr,
    DHUHR: fajr + step,
    ASR: fajr + 2 * step,
    MAGHRIB: fajr + 3 * step,
    ISHA: fajr + 4 * step,
  };
}

describe('activePrayer', () => {
  const T = Date.parse('2026-05-13T05:00:00.000Z');
  const t = timings(T);

  it('counts down to Fajr before first adhān', () => {
    const r = getFocusPrayerContext(T - 60_000, t, new Set());
    expect(r.prayer).toBe('FAJR');
    expect(r.phase).toBe('until_official');
    expect(r.targetMs).toBe(T);
    expect(r.allLogged).toBe(false);
  });

  it('gentle window counts down to T+30m', () => {
    const r = getFocusPrayerContext(T + 5 * 60_000, t, new Set());
    expect(r.prayer).toBe('FAJR');
    expect(r.phase).toBe('gentle_window');
    expect(r.targetMs).toBe(T + BONUS_WINDOW_MS);
  });

  it('after gentle window: pending Fajr, no timer', () => {
    const r = getFocusPrayerContext(T + BONUS_WINDOW_MS + 1, t, new Set());
    expect(r.prayer).toBe('FAJR');
    expect(r.phase).toBe('late_same_day');
    expect(r.targetMs).toBeNull();
  });

  it('skips logged prayers to next pending', () => {
    const logged = new Set<'FAJR' | 'DHUHR'>(['FAJR']);
    const r = getFocusPrayerContext(T + BONUS_WINDOW_MS + 1, t, logged);
    expect(r.prayer).toBe('DHUHR');
  });

  it('all logged', () => {
    const logged = new Set(['FAJR', 'DHUHR', 'ASR', 'MAGHRIB', 'ISHA'] as const);
    const r = getFocusPrayerContext(T, t, logged);
    expect(r.allLogged).toBe(true);
    expect(r.phase).toBe('all_logged');
    expect(r.targetMs).toBeNull();
  });

  it('dev mode when all logged keeps Fajr focus for testing', () => {
    const logged = new Set(['FAJR', 'DHUHR', 'ASR', 'MAGHRIB', 'ISHA'] as const);
    const r = getFocusPrayerContext(T, t, logged, { devMode: true });
    expect(r.allLogged).toBe(false);
    expect(r.phase).toBe('dev_mode');
    expect(r.prayer).toBe('FAJR');
    expect(r.targetMs).toBeNull();
  });

  it('dev mode before adhān uses dev_mode phase', () => {
    const r = getFocusPrayerContext(T - 60_000, t, new Set(), { devMode: true });
    expect(r.prayer).toBe('FAJR');
    expect(r.phase).toBe('dev_mode');
    expect(r.targetMs).toBe(T);
  });

  it('formatCountdown uses HH:MM:SS', () => {
    expect(formatCountdown(90_500)).toBe('00:01:30');
    expect(formatCountdown(-1)).toBe('00:00:00');
    expect(formatCountdown(3_661_000)).toBe('01:01:01');
  });
});
