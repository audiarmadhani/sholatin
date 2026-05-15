import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

import { darkPalette, lightPalette, type AppColorPalette } from '@/src/ui/palettes';

const STORAGE_KEY = 'sholatin_color_scheme';

export type StoredSchemePref = 'light' | 'dark' | 'auto';

type AppThemeContextValue = {
  /** Resolved UI scheme after applying auto + system. */
  scheme: 'light' | 'dark';
  /** Stored preference; `auto` follows OS. */
  preference: StoredSchemePref;
  colors: AppColorPalette;
  setPreference: (p: StoredSchemePref) => void;
  /** Flip light/dark and persist (leaves auto if you implement elsewhere). */
  toggleLightDark: () => void;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useRNColorScheme() ?? 'light';
  const [preference, setPreferenceState] = useState<StoredSchemePref>('auto');

  useEffect(() => {
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw === 'light' || raw === 'dark' || raw === 'auto') {
          setPreferenceState(raw);
        }
      } catch {
        /* keep auto */
      }
    })();
  }, []);

  const scheme: 'light' | 'dark' = useMemo(
    () => (preference === 'auto' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference),
    [preference, systemScheme],
  );

  const colors = scheme === 'dark' ? darkPalette : lightPalette;

  const setPreference = useCallback((p: StoredSchemePref) => {
    setPreferenceState(p);
    void AsyncStorage.setItem(STORAGE_KEY, p);
  }, []);

  const toggleLightDark = useCallback(() => {
    const next: 'light' | 'dark' = scheme === 'dark' ? 'light' : 'dark';
    setPreference(next);
  }, [scheme, setPreference]);

  const value = useMemo(
    () => ({
      scheme,
      preference,
      colors,
      setPreference,
      toggleLightDark,
    }),
    [scheme, preference, colors, setPreference, toggleLightDark],
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme(): AppThemeContextValue {
  const ctx = useContext(AppThemeContext);
  if (!ctx) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }
  return ctx;
}
