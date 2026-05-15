import type { PrayerName } from '@/src/domain/types';
import { PRAYER_ORDER } from '@/src/domain/types';
import type { PrayerInstanceRow } from '@/src/data/repositories';
import type { DayTimings } from '@/src/services/prayerTimes';

export function monthStartDateKey(year: number, month0: number): string {
  return `${year}-${String(month0 + 1).padStart(2, '0')}-01`;
}

export function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function aggregateMonthCompletion(params: {
  now: Date;
  timingsByDate: Record<string, DayTimings>;
  instances: PrayerInstanceRow[];
}): { expected: number; logged: number; onTime: number; loggedPct: number; onTimePct: number } {
  const { now, timingsByDate, instances } = params;
  const nowMs = now.getTime();
  const y = now.getFullYear();
  const m0 = now.getMonth();
  const dom = now.getDate();
  const instKey = (dk: string, p: PrayerName) => `${dk}|${p}`;
  const map = new Map<string, PrayerInstanceRow>();
  for (const r of instances) {
    map.set(instKey(r.date_key, r.prayer as PrayerName), r);
  }

  let expected = 0;
  let logged = 0;
  let onTime = 0;

  for (let day = 1; day <= dom; day++) {
    const dk = `${y}-${String(m0 + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const timings = timingsByDate[dk];
    if (!timings) continue;
    for (const p of PRAYER_ORDER) {
      const officialMs = timings[p];
      if (officialMs > nowMs) continue;
      expected += 1;
      const row = map.get(instKey(dk, p));
      if (row && row.status !== 'missed') logged += 1;
      if (row && row.status === 'on_time') onTime += 1;
    }
  }

  const loggedPct = expected === 0 ? 0 : Math.min(100, Math.round((100 * logged) / expected));
  const onTimePct = expected === 0 ? 0 : Math.min(100, Math.round((100 * onTime) / expected));
  return { expected, logged, onTime, loggedPct, onTimePct };
}
