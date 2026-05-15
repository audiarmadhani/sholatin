import type * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

import type { WebShimDb } from './db.web';

/**
 * Native: expo-sqlite. Web: in-memory + localStorage (expo-sqlite web needs SharedArrayBuffer / COOP+COEP).
 * Dynamic require keeps native SQLite out of the web bundle.
 */
export function getDb(): SQLite.SQLiteDatabase | WebShimDb {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('./db.web').getDb() as WebShimDb;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./db.native').getDb() as SQLite.SQLiteDatabase;
}
