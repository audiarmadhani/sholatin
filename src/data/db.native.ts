import * as SQLite from 'expo-sqlite';

const DB_NAME = 'sholatin.db';

export const MIGRATION_V1 = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS user_profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  calculation_method INTEGER NOT NULL DEFAULT 2,
  notifications_enabled INTEGER NOT NULL DEFAULT 0,
  reduced_motion INTEGER NOT NULL DEFAULT 0,
  audio_muted INTEGER NOT NULL DEFAULT 0,
  haptics_enabled INTEGER NOT NULL DEFAULT 1,
  percentile_opt_in INTEGER NOT NULL DEFAULT 0,
  percentile_install_id TEXT,
  locale TEXT,
  last_lat REAL,
  last_lon REAL,
  onboarding_done INTEGER NOT NULL DEFAULT 0,
  dev_mode INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS prayer_day_timings (
  date_key TEXT PRIMARY KEY,
  timezone TEXT NOT NULL,
  fetched_at_iso TEXT NOT NULL,
  json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS prayer_instance (
  date_key TEXT NOT NULL,
  prayer TEXT NOT NULL,
  official_time_iso TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'missed',
  recorded_at_iso TEXT,
  xp_total INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (date_key, prayer)
);

CREATE TABLE IF NOT EXISTS month_run (
  month_key TEXT PRIMARY KEY,
  theme_id TEXT NOT NULL,
  xp_total INTEGER NOT NULL DEFAULT 0,
  unspent_allocation INTEGER NOT NULL DEFAULT 0,
  channel_progress_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS xp_event (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at_iso TEXT NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  date_key TEXT,
  prayer TEXT
);
`;

let dbInstance: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync(DB_NAME);
    dbInstance.execSync(MIGRATION_V1);
    try {
      dbInstance.execSync(
        "ALTER TABLE month_run ADD COLUMN unlock_state_json TEXT NOT NULL DEFAULT '{}'",
      );
    } catch {
      /* column already exists */
    }
    try {
      dbInstance.execSync('ALTER TABLE user_profile ADD COLUMN dev_mode INTEGER NOT NULL DEFAULT 0');
    } catch {
      /* column already exists */
    }
    const row = dbInstance.getFirstSync<{ c: number }>(
      'SELECT COUNT(*) as c FROM user_profile WHERE id = 1',
    );
    if (!row || row.c === 0) {
      dbInstance.execSync(`INSERT INTO user_profile (id) VALUES (1);`);
    }
  }
  return dbInstance;
}
