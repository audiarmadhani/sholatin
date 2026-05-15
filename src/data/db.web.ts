/**
 * Web persistence without expo-sqlite (avoids SharedArrayBuffer / COOP+COEP requirements).
 * Mirrors the subset of SQLiteDatabase API used by repositories.ts.
 */
import { PRAYER_ORDER } from '@/src/domain/types';

const STORAGE_KEY = 'sholatin_web_db_v1';

type Profile = {
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

type TimingRow = {
  date_key: string;
  timezone: string;
  fetched_at_iso: string;
  json: string;
};

type InstanceRow = {
  date_key: string;
  prayer: string;
  official_time_iso: string;
  status: string;
  recorded_at_iso: string | null;
  xp_total: number;
};

type MonthRow = {
  month_key: string;
  theme_id: string;
  xp_total: number;
  unspent_allocation: number;
  channel_progress_json: string;
  unlock_state_json: string;
};

type XpRow = {
  id: number;
  created_at_iso: string;
  amount: number;
  reason: string;
  date_key: string | null;
  prayer: string | null;
};

const PRAYER_RANK: Record<string, number> = Object.fromEntries(
  PRAYER_ORDER.map((p, i) => [p, i]),
) as Record<string, number>;

function defaultProfile(): Profile {
  return {
    id: 1,
    calculation_method: 2,
    notifications_enabled: 0,
    reduced_motion: 0,
    audio_muted: 0,
    haptics_enabled: 1,
    percentile_opt_in: 0,
    percentile_install_id: null,
    locale: null,
    last_lat: null,
    last_lon: null,
    onboarding_done: 0,
    dev_mode: 0,
  };
}

function bindArgs(rest: unknown[]): unknown[] {
  if (rest.length === 1 && Array.isArray(rest[0])) return rest[0] as unknown[];
  return rest;
}

export class WebShimDb {
  profile: Profile = defaultProfile();

  timings: TimingRow[] = [];

  instances: InstanceRow[] = [];

  monthRuns: MonthRow[] = [];

  xpEvents: XpRow[] = [];

  nextXpId = 1;

  constructor() {
    this.load();
  }

  load() {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const j = JSON.parse(raw) as Partial<{
        profile: Profile;
        timings: TimingRow[];
        instances: InstanceRow[];
        monthRuns: MonthRow[];
        xpEvents: XpRow[];
        nextXpId: number;
      }>;
      if (j.profile) this.profile = { ...defaultProfile(), ...j.profile };
      if (Array.isArray(j.timings)) this.timings = j.timings;
      if (Array.isArray(j.instances)) this.instances = j.instances;
      if (Array.isArray(j.monthRuns)) {
        this.monthRuns = j.monthRuns.map((r) => ({
          ...r,
          unlock_state_json:
            typeof (r as MonthRow).unlock_state_json === 'string'
              ? (r as MonthRow).unlock_state_json
              : '{}',
        }));
      }
      if (Array.isArray(j.xpEvents)) this.xpEvents = j.xpEvents;
      if (typeof j.nextXpId === 'number') this.nextXpId = j.nextXpId;
    } catch {
      /* ignore */
    }
  }

  persist() {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        profile: this.profile,
        timings: this.timings,
        instances: this.instances,
        monthRuns: this.monthRuns,
        xpEvents: this.xpEvents,
        nextXpId: this.nextXpId,
      }),
    );
  }

  execSync(sql: string) {
    const t = sql.trim();
    if (t.includes('DELETE FROM xp_event')) {
      this.xpEvents = [];
      this.instances = [];
      this.timings = [];
      this.monthRuns = [];
      this.nextXpId = 1;
      this.profile.last_lat = null;
      this.profile.last_lon = null;
      this.profile.onboarding_done = 0;
      this.profile.percentile_install_id = null;
      this.persist();
      return;
    }
    if (t.includes('PRAGMA') || t.includes('CREATE TABLE')) return;
    if (t.includes('INSERT INTO user_profile')) {
      this.profile = defaultProfile();
      this.persist();
    }
  }

  getFirstSync<T>(sql: string, ...rest: unknown[]): T | null {
    const params = bindArgs(rest);
    const s = sql.trim().replace(/\s+/g, ' ');
    if (s === 'SELECT COUNT(*) as c FROM user_profile WHERE id = 1') {
      return { c: 1 } as T;
    }
    if (s === 'SELECT * FROM user_profile WHERE id = 1') {
      return { ...this.profile } as T;
    }
    if (s === 'SELECT json, timezone FROM prayer_day_timings WHERE date_key = ?') {
      const dk = params[0] as string;
      const row = this.timings.find((r) => r.date_key === dk);
      return (row ? { json: row.json, timezone: row.timezone } : null) as T | null;
    }
    if (s === 'SELECT * FROM month_run WHERE month_key = ?') {
      const mk = params[0] as string;
      const row = this.monthRuns.find((r) => r.month_key === mk);
      return (row ? { ...row } : null) as T | null;
    }
    if (
      s.startsWith(
        'SELECT COALESCE(SUM(amount), 0) as s FROM xp_event WHERE created_at_iso >= ? AND created_at_iso <= ? AND amount > 0',
      )
    ) {
      const [a, b] = params as [string, string];
      let sum = 0;
      for (const e of this.xpEvents) {
        if (e.amount > 0 && e.created_at_iso >= a && e.created_at_iso <= b) sum += e.amount;
      }
      return { s: sum } as T;
    }
    return null;
  }

  getAllSync<T>(sql: string, ...rest: unknown[]): T[] {
    const params = bindArgs(rest);
    const s = sql.trim().replace(/\s+/g, ' ');
    if (s === 'SELECT * FROM user_profile') {
      return [{ ...this.profile }] as T[];
    }
    if (s === 'SELECT * FROM prayer_day_timings') {
      return [...this.timings] as T[];
    }
    if (s === 'SELECT * FROM prayer_instance') {
      return [...this.instances] as T[];
    }
    if (s === 'SELECT * FROM month_run') {
      return [...this.monthRuns] as T[];
    }
    if (s === 'SELECT * FROM xp_event') {
      return [...this.xpEvents] as T[];
    }
    if (s.startsWith('SELECT * FROM prayer_instance WHERE date_key = ? ORDER BY prayer')) {
      const dk = params[0] as string;
      return this.instances
        .filter((r) => r.date_key === dk)
        .sort((a, b) => (PRAYER_RANK[a.prayer] ?? 99) - (PRAYER_RANK[b.prayer] ?? 99)) as T[];
    }
    if (
      s.startsWith(
        'SELECT date_key, json FROM prayer_day_timings WHERE date_key >= ? AND date_key <= ? ORDER BY date_key',
      )
    ) {
      const [a, b] = params as [string, string];
      return this.timings
        .filter((r) => r.date_key >= a && r.date_key <= b)
        .sort((x, y) => x.date_key.localeCompare(y.date_key))
        .map((r) => ({ date_key: r.date_key, json: r.json })) as T[];
    }
    if (
      s.startsWith(
        'SELECT * FROM prayer_instance WHERE date_key >= ? AND date_key <= ? ORDER BY date_key, prayer',
      )
    ) {
      const [a, b] = params as [string, string];
      return this.instances
        .filter((r) => r.date_key >= a && r.date_key <= b)
        .sort((x, y) => {
          const c = x.date_key.localeCompare(y.date_key);
          if (c !== 0) return c;
          return (PRAYER_RANK[x.prayer] ?? 99) - (PRAYER_RANK[y.prayer] ?? 99);
        }) as T[];
    }
    return [];
  }

  runSync(sql: string, ...rest: unknown[]) {
    const params = bindArgs(rest);
    const s = sql.trim().replace(/\s+/g, ' ');

    if (s.startsWith('UPDATE user_profile SET ') && s.endsWith('WHERE id = 1')) {
      const inner = s.slice('UPDATE user_profile SET '.length, s.length - ' WHERE id = 1'.length);
      const keys = inner.split(', ').map((x) => x.split(' = ?')[0]);
      keys.forEach((k, i) => {
        (this.profile as Record<string, unknown>)[k] = params[i] as never;
      });
      this.persist();
      return;
    }

    if (
      s.startsWith(
        'INSERT INTO prayer_instance (date_key, prayer, official_time_iso, status, recorded_at_iso, xp_total)',
      )
    ) {
      const [date_key, prayer, official_time_iso, status, recorded_at_iso, xp_total] = params as [
        string,
        string,
        string,
        string,
        string | null,
        number,
      ];
      const idx = this.instances.findIndex((r) => r.date_key === date_key && r.prayer === prayer);
      const row: InstanceRow = {
        date_key,
        prayer,
        official_time_iso,
        status,
        recorded_at_iso,
        xp_total,
      };
      if (idx >= 0) this.instances[idx] = row;
      else this.instances.push(row);
      this.persist();
      return;
    }

    if (s.startsWith('INSERT INTO prayer_day_timings')) {
      const [date_key, timezone, fetched_at_iso, json] = params as [string, string, string, string];
      const idx = this.timings.findIndex((r) => r.date_key === date_key);
      const row: TimingRow = { date_key, timezone, fetched_at_iso, json };
      if (idx >= 0) this.timings[idx] = row;
      else this.timings.push(row);
      this.persist();
      return;
    }

    if (s.startsWith('INSERT INTO month_run')) {
      const [month_key, theme_id] = params as [string, string];
      this.monthRuns.push({
        month_key,
        theme_id,
        xp_total: 0,
        unspent_allocation: 0,
        channel_progress_json: '{}',
        unlock_state_json: '{}',
      });
      this.persist();
      return;
    }

    if (s.startsWith('UPDATE month_run SET ') && s.includes('WHERE month_key = ?')) {
      const whereIdx = s.lastIndexOf('WHERE month_key = ?');
      const inner = s.slice('UPDATE month_run SET '.length, whereIdx).trim();
      const monthKey = params[params.length - 1] as string;
      const row = this.monthRuns.find((r) => r.month_key === monthKey);
      if (!row) return;
      const keys = inner.split(', ').map((x) => x.split(' = ?')[0]);
      const vals = params.slice(0, keys.length);
      keys.forEach((k, i) => {
        (row as Record<string, unknown>)[k] = vals[i] as never;
      });
      this.persist();
      return;
    }

    if (s.startsWith('INSERT INTO xp_event')) {
      const [created_at_iso, amount, reason, date_key, prayer] = params as [
        string,
        number,
        string,
        string | null,
        string | null,
      ];
      this.xpEvents.push({
        id: this.nextXpId++,
        created_at_iso,
        amount,
        reason,
        date_key,
        prayer,
      });
      this.persist();
      return;
    }

    if (s === 'DELETE FROM prayer_day_timings WHERE date_key >= ?') {
      const [fromKey] = params as [string];
      this.timings = this.timings.filter((r) => r.date_key < fromKey);
      this.persist();
    }
  }
}

let webDb: WebShimDb | null = null;

/** Same call shape as native; returns a shim, not expo-sqlite's type (call sites only use methods). */
export function getDb(): WebShimDb {
  if (!webDb) webDb = new WebShimDb();
  return webDb;
}
