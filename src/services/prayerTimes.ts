import type { PrayerName } from '@/src/domain/types';

const MAP: Record<string, PrayerName> = {
  Fajr: 'FAJR',
  Dhuhr: 'DHUHR',
  Asr: 'ASR',
  Maghrib: 'MAGHRIB',
  Isha: 'ISHA',
};

export type DayTimings = Record<PrayerName, number>;

/** Parse Aladhan "HH:mm" into epoch ms for device-local wall clock on date_key (YYYY-MM-DD). */
export function parseLocalOfficialMs(dateKey: string, hhmm: string): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  const [hh, mm] = hhmm.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0).getTime();
}

export async function fetchAladhanTimings(params: {
  dateKey: string;
  lat: number;
  lon: number;
  method: number;
}): Promise<DayTimings> {
  const { dateKey, lat, lon, method } = params;
  const [y, m, d] = dateKey.split('-').map(Number);
  const apiDate = `${String(d).padStart(2, '0')}-${String(m).padStart(2, '0')}-${y}`;
  const url = `https://api.aladhan.com/v1/timings/${apiDate}?latitude=${lat}&longitude=${lon}&method=${method}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Aladhan HTTP ${res.status}`);
  const body = (await res.json()) as {
    data?: { timings?: Record<string, string> };
  };
  const timings = body.data?.timings;
  if (!timings) throw new Error('Aladhan: missing timings');
  const out: Partial<DayTimings> = {};
  for (const [k, v] of Object.entries(MAP)) {
    const str = timings[k];
    if (!str) throw new Error(`Aladhan: missing ${k}`);
    out[v] = parseLocalOfficialMs(dateKey, str);
  }
  return out as DayTimings;
}
