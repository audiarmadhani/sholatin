import { getDb } from './db';
import type { PrayerName, PrayerStatus } from '@/src/domain/types';
import { PRAYER_ORDER } from '@/src/domain/types';
import { maxMonthXp } from '@/src/domain/monthXp';
import { localDateKey } from '@/src/logic/monthMetrics';
import {
  getUnlockTiers,
  nextUnlockState,
  parseUnlockState,
  serializeUnlockState,
} from '@/src/landscape/unlockCatalog';

export type UserProfileRow = {
  id: number;
  calculation_method: number;
  notifications_enabled: number;
  reduced_motion: number;
  audio_muted: number;
  haptics_enabled: number;
  percentile_opt_in: number;
  percentile_install_id: string | null;
  locale: string | null;
  last_lat: number | null;
  last_lon: number | null;
  onboarding_done: number;
  dev_mode: number;
};

export function getProfile(): UserProfileRow {
  const db = getDb();
  const row = db.getFirstSync<UserProfileRow>('SELECT * FROM user_profile WHERE id = 1');
  if (!row) throw new Error('user_profile missing');
  return row;
}

export function updateProfile(patch: Partial<Omit<UserProfileRow, 'id'>>) {
  const db = getDb();
  const keys = Object.keys(patch) as (keyof typeof patch)[];
  if (keys.length === 0) return;
  const sets = keys.map((k) => `${k} = ?`).join(', ');
  const vals = keys.map((k) => patch[k] as string | number | null);
  db.runSync(`UPDATE user_profile SET ${sets} WHERE id = 1`, vals);
}

export function setOnboardingDone(done: boolean) {
  updateProfile({ onboarding_done: done ? 1 : 0 });
}

export function saveLastLocation(lat: number, lon: number) {
  updateProfile({ last_lat: lat, last_lon: lon });
  /** Drop cached times from today onward so Home refetches for the new place. */
  invalidatePrayerTimingsFrom(localDateKey(new Date()));
}

export function invalidatePrayerTimingsFrom(dateKey: string) {
  const db = getDb();
  db.runSync('DELETE FROM prayer_day_timings WHERE date_key >= ?', [dateKey]);
}

export type PrayerInstanceRow = {
  date_key: string;
  prayer: string;
  official_time_iso: string;
  status: PrayerStatus;
  recorded_at_iso: string | null;
  xp_total: number;
};

export function upsertPrayerInstance(row: PrayerInstanceRow) {
  const db = getDb();
  db.runSync(
    `INSERT INTO prayer_instance (date_key, prayer, official_time_iso, status, recorded_at_iso, xp_total)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(date_key, prayer) DO UPDATE SET
       status = excluded.status,
       recorded_at_iso = excluded.recorded_at_iso,
       xp_total = excluded.xp_total,
       official_time_iso = excluded.official_time_iso`,
    [
      row.date_key,
      row.prayer,
      row.official_time_iso,
      row.status,
      row.recorded_at_iso,
      row.xp_total,
    ],
  );
}

export function getPrayerInstancesForDate(dateKey: string): PrayerInstanceRow[] {
  const db = getDb();
  return db.getAllSync<PrayerInstanceRow>(
    'SELECT * FROM prayer_instance WHERE date_key = ? ORDER BY prayer',
    [dateKey],
  );
}

export function saveDayTimings(dateKey: string, timezone: string, json: string) {
  const db = getDb();
  const now = new Date().toISOString();
  db.runSync(
    `INSERT INTO prayer_day_timings (date_key, timezone, fetched_at_iso, json)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(date_key) DO UPDATE SET
       timezone = excluded.timezone,
       fetched_at_iso = excluded.fetched_at_iso,
       json = excluded.json`,
    [dateKey, timezone, now, json],
  );
}

export function getDayTimings(dateKey: string): { json: string; timezone: string } | null {
  const db = getDb();
  const row = db.getFirstSync<{ json: string; timezone: string }>(
    'SELECT json, timezone FROM prayer_day_timings WHERE date_key = ?',
    [dateKey],
  );
  return row ?? null;
}

export function getTimingsBetween(startDateKey: string, endDateKey: string) {
  const db = getDb();
  return db.getAllSync<{ date_key: string; json: string }>(
    'SELECT date_key, json FROM prayer_day_timings WHERE date_key >= ? AND date_key <= ? ORDER BY date_key',
    [startDateKey, endDateKey],
  );
}

export function exportAllTablesJson(): string {
  const db = getDb();
  const profile = db.getAllSync('SELECT * FROM user_profile');
  const timings = db.getAllSync('SELECT * FROM prayer_day_timings');
  const instances = db.getAllSync('SELECT * FROM prayer_instance');
  const months = db.getAllSync('SELECT * FROM month_run');
  const events = db.getAllSync('SELECT * FROM xp_event');
  return JSON.stringify({ profile, timings, instances, months, events }, null, 2);
}

export function clearAllUserData() {
  const db = getDb();
  db.execSync(`
    DELETE FROM xp_event;
    DELETE FROM prayer_instance;
    DELETE FROM prayer_day_timings;
    DELETE FROM month_run;
    UPDATE user_profile SET
      last_lat = NULL,
      last_lon = NULL,
      onboarding_done = 0,
      percentile_install_id = NULL
    WHERE id = 1;
  `);
}

export type MonthRunRow = {
  month_key: string;
  theme_id: string;
  xp_total: number;
  unspent_allocation: number;
  channel_progress_json: string;
  unlock_state_json: string;
};

export function getOrCreateMonthRun(monthKey: string, themeId: string): MonthRunRow {
  const db = getDb();
  let row = db.getFirstSync<MonthRunRow>('SELECT * FROM month_run WHERE month_key = ?', [monthKey]);
  if (!row) {
    db.runSync(
      `INSERT INTO month_run (month_key, theme_id, xp_total, unspent_allocation, channel_progress_json, unlock_state_json)
       VALUES (?, ?, 0, 0, '{}', '{}')`,
      [monthKey, themeId],
    );
    row = db.getFirstSync<MonthRunRow>('SELECT * FROM month_run WHERE month_key = ?', [monthKey])!;
  }
  return row;
}

/** Persist monotonic highest unlock tier from earned month XP. */
export function syncMonthUnlockState(monthKey: string, themeId: string, xpTotal: number) {
  getOrCreateMonthRun(monthKey, themeId);
  const mr = getOrCreateMonthRun(monthKey, themeId);
  const tiers = getUnlockTiers();
  const max = maxMonthXp(monthKey);
  const prev = parseUnlockState(mr.unlock_state_json);
  const next = nextUnlockState(prev, xpTotal, max, tiers);
  if (next.highestTier !== prev.highestTier) {
    updateMonthRun(monthKey, { unlock_state_json: serializeUnlockState(next) });
  }
}

export function updateMonthRun(
  monthKey: string,
  patch: Partial<
    Pick<MonthRunRow, 'xp_total' | 'unspent_allocation' | 'channel_progress_json' | 'unlock_state_json'>
  >,
) {
  const db = getDb();
  const keys = Object.keys(patch) as (keyof typeof patch)[];
  if (keys.length === 0) return;
  const sets = keys.map((k) => `${k} = ?`).join(', ');
  const vals = [...keys.map((k) => patch[k] as string | number), monthKey];
  db.runSync(`UPDATE month_run SET ${sets} WHERE month_key = ?`, vals);
}

export function insertXpEvent(params: {
  amount: number;
  reason: string;
  date_key?: string;
  prayer?: PrayerName;
}) {
  const db = getDb();
  db.runSync(
    `INSERT INTO xp_event (created_at_iso, amount, reason, date_key, prayer) VALUES (?, ?, ?, ?, ?)`,
    [
      new Date().toISOString(),
      params.amount,
      params.reason,
      params.date_key ?? null,
      params.prayer ?? null,
    ],
  );
}

/** Sum XP events in [startMs, endMs] inclusive by ISO string compare — use week bounds in ISO UTC for consistency */
export function sumXpEventsBetween(startIso: string, endIso: string): number {
  const db = getDb();
  const row = db.getFirstSync<{ s: number }>(
    `SELECT COALESCE(SUM(amount), 0) as s FROM xp_event WHERE created_at_iso >= ? AND created_at_iso <= ? AND amount > 0`,
    [startIso, endIso],
  );
  return row?.s ?? 0;
}

export function getPrayerInstancesBetween(startDateKey: string, endDateKey: string): PrayerInstanceRow[] {
  const db = getDb();
  return db.getAllSync<PrayerInstanceRow>(
    `SELECT * FROM prayer_instance WHERE date_key >= ? AND date_key <= ? ORDER BY date_key, prayer`,
    [startDateKey, endDateKey],
  );
}

/** Count of prayer logs that are not missed (earned XP at least once). */
export function countPrayerLogsEarned(): number {
  const db = getDb();
  const row = db.getFirstSync<{ c: number }>(
    `SELECT COUNT(*) as c FROM prayer_instance WHERE status != 'missed'`,
  );
  return row?.c ?? 0;
}

/** Count of prayers logged in the gentle window (on_time). */
export function countPrayerLogsOnTime(): number {
  const db = getDb();
  const row = db.getFirstSync<{ c: number }>(
    `SELECT COUNT(*) as c FROM prayer_instance WHERE status = 'on_time'`,
  );
  return row?.c ?? 0;
}

export { PRAYER_ORDER };
