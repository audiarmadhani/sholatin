export const PRAYER_ORDER = ['FAJR', 'DHUHR', 'ASR', 'MAGHRIB', 'ISHA'] as const;
export type PrayerName = (typeof PRAYER_ORDER)[number];

export type PrayerStatus = 'on_time' | 'late' | 'missed' | 'excused';

export const BASE_XP = 8;
export const BONUS_ON_TIME_XP = 4;
export const BONUS_WINDOW_MS = 30 * 60 * 1000;
