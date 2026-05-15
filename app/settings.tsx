import * as Crypto from 'expo-crypto';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useScrollBottomTabPadding } from '@/components/BottomTabBar';
import { getDb } from '@/src/data/db';
import {
  clearAllUserData,
  getProfile,
  saveLastLocation,
  setOnboardingDone,
  updateProfile,
} from '@/src/data/repositories';
import { reverseGeocodeLabel } from '@/src/services/reverseGeocode';
import { type PlaceSearchHit, searchPlaces } from '@/src/services/placeSearch';
import { getWebGeolocationPosition } from '@/src/services/webGeolocation';
import { useAppTheme } from '@/src/ui/AppThemeProvider';
import type { AppColorPalette } from '@/src/ui/palettes';
import { radii, space } from '@/src/ui/tokens';

const PRAYER_METHOD_INFO: Record<number, { name: string; regionNote: string }> = {
  2: {
    name: 'Muslim World League',
    regionNote: 'Often used in Europe, much of Africa, the Levant, and parts of Asia.',
  },
  3: {
    name: 'Islamic Society of North America (ISNA)',
    regionNote: 'A common reference for the United States and Canada.',
  },
  5: {
    name: 'Egyptian General Authority of Survey',
    regionNote: 'Aligns with many published tables for Egypt and nearby regions.',
  },
};

function buildSettingsStyles(colors: AppColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    wrap: { paddingHorizontal: space.lg, paddingTop: space.lg },
    section: {
      marginTop: space.lg,
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
      marginBottom: space.sm,
    },
    meta: { color: colors.textMuted, marginBottom: space.sm, lineHeight: 20 },
    metaEm: { fontWeight: '700', color: colors.text },
    hint: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 18,
      marginBottom: space.md,
      marginTop: space.xs,
    },
    row: {
      padding: space.md,
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      marginBottom: space.xs,
      borderWidth: 1,
      borderColor: colors.border,
    },
    rowDisabled: { opacity: 0.55 },
    rowText: { fontSize: 16, color: colors.text, fontWeight: '600' },
    rowDanger: {
      backgroundColor: '#C62828',
      borderColor: '#8E0000',
    },
    rowDangerPressed: { opacity: 0.9 },
    rowTextDanger: { color: '#FFFFFF' },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: space.sm,
      paddingHorizontal: space.md,
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      marginBottom: space.xs,
      borderWidth: 1,
      borderColor: colors.border,
    },
    foot: { marginTop: space.xl, color: colors.textMuted, lineHeight: 20, fontSize: 13 },
    searchHeading: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.text,
      marginTop: space.md,
      marginBottom: space.xs,
    },
    searchSub: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.textMuted,
      marginBottom: space.sm,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: space.sm,
      marginBottom: space.sm,
    },
    searchInput: {
      flex: 1,
      minWidth: 0,
      minHeight: 48,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: space.md,
      paddingVertical: space.sm,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.surface,
    },
    searchButton: {
      justifyContent: 'center',
      alignItems: 'center',
      minWidth: 92,
      paddingHorizontal: space.md,
      backgroundColor: colors.primary,
      borderRadius: radii.md,
    },
    searchButtonText: { color: colors.onPrimary, fontWeight: '800', fontSize: 15 },
    searchError: {
      color: '#9B1C1C',
      fontSize: 13,
      marginBottom: space.sm,
      lineHeight: 18,
    },
    searchResults: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      overflow: 'hidden',
      marginBottom: space.lg,
      backgroundColor: colors.surface,
    },
    searchHit: {
      paddingVertical: space.md,
      paddingHorizontal: space.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    searchHitLast: { borderBottomWidth: 0 },
    searchHitText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  });
}

type SettingsStyles = ReturnType<typeof buildSettingsStyles>;

export default function SettingsScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => buildSettingsStyles(colors), [colors]);
  const scrollBottomPad = useScrollBottomTabPadding();
  getDb();
  const p0 = getProfile();
  const [p, setP] = useState(p0);
  const [locBusy, setLocBusy] = useState(false);
  const [placeLabel, setPlaceLabel] = useState<string | null>(null);
  const [placeLoading, setPlaceLoading] = useState(false);
  const [placeSearchQuery, setPlaceSearchQuery] = useState('');
  const [placeSearchResults, setPlaceSearchResults] = useState<PlaceSearchHit[]>([]);
  const [placeSearchBusy, setPlaceSearchBusy] = useState(false);
  const [placeSearchError, setPlaceSearchError] = useState<string | null>(null);

  const refresh = () => setP(getProfile());

  const patch = (next: Partial<typeof p>) => {
    updateProfile(next);
    refresh();
  };

  const requestDeviceLocation = async () => {
    getDb();
    setLocBusy(true);
    try {
      if (Platform.OS === 'web') {
        const { latitude, longitude } = await getWebGeolocationPosition();
        saveLastLocation(latitude, longitude);
        refresh();
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location permission',
          'Enable location in system settings so we can set prayer times for where you are.',
        );
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      saveLastLocation(pos.coords.latitude, pos.coords.longitude);
      refresh();
      Alert.alert('Saved', 'Prayer times will update when you return to Home.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(
          `Could not read location\n\n${msg}\n\nUse https:// or http://localhost, and allow location when the browser asks.`,
        );
      } else {
        Alert.alert('Could not read location', msg);
      }
    } finally {
      setLocBusy(false);
    }
  };

  const runPlaceSearch = async () => {
    const q = placeSearchQuery.trim();
    if (q.length < 2) {
      setPlaceSearchError('Type at least two characters.');
      return;
    }
    setPlaceSearchBusy(true);
    setPlaceSearchError(null);
    setPlaceSearchResults([]);
    try {
      const hits = await searchPlaces(q);
      setPlaceSearchResults(hits);
      if (hits.length === 0) {
        setPlaceSearchError('No matches. Try a country name or a spelling variant.');
      }
    } catch (e) {
      setPlaceSearchError(e instanceof Error ? e.message : 'Search failed.');
    } finally {
      setPlaceSearchBusy(false);
    }
  };

  const applySearchHit = (hit: PlaceSearchHit) => {
    getDb();
    saveLastLocation(hit.latitude, hit.longitude);
    refresh();
    setPlaceSearchResults([]);
    setPlaceSearchQuery('');
    setPlaceSearchError(null);
  };

  const onDelete = () => {
    Alert.alert('Delete all local data?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          clearAllUserData();
          refresh();
          router.replace('/onboarding');
        },
      },
    ]);
  };

  const onRestartOnboarding = () => {
    const run = () => {
      getDb();
      setOnboardingDone(false);
      refresh();
      router.replace('/onboarding');
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        const ok = window.confirm(
          'Restart onboarding? (testing only — your prayer data stays on this device.)',
        );
        if (ok) run();
      } else {
        run();
      }
      return;
    }

    Alert.alert(
      'Restart onboarding?',
      'Testing only: opens the intro flow again. Prayer data on this device is not erased.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restart', onPress: run },
      ],
    );
  };

  const methodDisplay = useMemo(() => {
    const m = PRAYER_METHOD_INFO[p.calculation_method];
    if (m) return m;
    return {
      name: `Method ${p.calculation_method}`,
      regionNote: 'Choose one of the standard options below so times match a known calendar.',
    };
  }, [p.calculation_method]);

  useEffect(() => {
    if (p.last_lat == null || p.last_lon == null) {
      setPlaceLabel(null);
      setPlaceLoading(false);
      return;
    }
    let cancelled = false;
    setPlaceLoading(true);
    setPlaceLabel(null);
    void reverseGeocodeLabel(p.last_lat, p.last_lon).then((label) => {
      if (cancelled) return;
      setPlaceLabel(label);
      setPlaceLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [p.last_lat, p.last_lon]);

  const locationSummary = useMemo(() => {
    if (p.last_lat == null || p.last_lon == null) return 'Not set — add location for prayer times.';
    if (placeLoading) return 'Saved · looking up city…';
    if (placeLabel) return `Saved · ${placeLabel}`;
    const lat = p.last_lat.toFixed(2);
    const lon = p.last_lon.toFixed(2);
    return `Saved · ${lat}°, ${lon}° (place name unavailable)`;
  }, [p.last_lat, p.last_lon, placeLabel, placeLoading]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.wrap, { paddingBottom: scrollBottomPad }]}>
        <Text style={styles.section}>Location</Text>
        <Text style={styles.meta}>{locationSummary}</Text>
        <Pressable
          style={[styles.row, locBusy && styles.rowDisabled]}
          onPress={() => void requestDeviceLocation()}
          disabled={locBusy}
          accessibilityLabel="Use device location">
          <Text style={styles.rowText}>{locBusy ? 'Getting location…' : 'Use current location'}</Text>
        </Pressable>
        <Text style={styles.hint}>
          {Platform.OS === 'web'
            ? 'On the web we use the browser location prompt (works on https:// and on localhost). Tap the button, then Allow.'
            : 'Uses your device GPS once — approximate position is enough for prayer times.'}
        </Text>

        <Text style={styles.searchHeading}>Search for a place</Text>
        <Text style={styles.searchSub}>
          Type a city, area, or address. Results come from OpenStreetMap (no account). Tap a row to save
          that spot for prayer times.
        </Text>
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="e.g. Jakarta, Istanbul, Toronto"
            placeholderTextColor={colors.textMuted}
            value={placeSearchQuery}
            onChangeText={(t) => {
              setPlaceSearchQuery(t);
              setPlaceSearchError(null);
            }}
            returnKeyType="search"
            onSubmitEditing={() => void runPlaceSearch()}
            autoCapitalize="words"
            autoCorrect={false}
            editable={!placeSearchBusy}
            accessibilityLabel="Search place query"
          />
          <Pressable
            style={[styles.searchButton, placeSearchBusy && styles.rowDisabled]}
            onPress={() => void runPlaceSearch()}
            disabled={placeSearchBusy}
            accessibilityLabel="Run place search">
            {placeSearchBusy ? (
              <ActivityIndicator color={colors.onPrimary} size="small" />
            ) : (
              <Text style={styles.searchButtonText}>Search</Text>
            )}
          </Pressable>
        </View>
        {placeSearchError ? <Text style={styles.searchError}>{placeSearchError}</Text> : null}
        {placeSearchResults.length > 0 ? (
          <View style={styles.searchResults}>
            {placeSearchResults.map((hit, idx) => (
              <Pressable
                key={hit.id}
                style={[styles.searchHit, idx === placeSearchResults.length - 1 && styles.searchHitLast]}
                onPress={() => applySearchHit(hit)}
                accessibilityRole="button"
                accessibilityLabel={`Save location ${hit.displayName}`}>
                <Text style={styles.searchHitText} numberOfLines={3}>
                  {hit.displayName}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <Text style={styles.section}>Prayer times</Text>
        <Text style={styles.hint}>
          Official clock times for each salah depend on a small set of published rules (angles for Fajr
          and Isha, and how Asr shadows are interpreted). Sholatin uses your saved location plus the option
          below when requesting times from the calendar API.
        </Text>
        <Text style={styles.meta}>
          <Text style={styles.metaEm}>Now: {methodDisplay.name}</Text>
          {' · '}
          {methodDisplay.regionNote}
        </Text>
        <Row styles={styles} label="Muslim World League" onPress={() => patch({ calculation_method: 2 })} />
        <Row styles={styles} label="ISNA (North America)" onPress={() => patch({ calculation_method: 3 })} />
        <Row styles={styles} label="Egyptian authority" onPress={() => patch({ calculation_method: 5 })} />

        <Text style={styles.section}>Experience</Text>
        <ToggleRow
          styles={styles}
          label="Haptics"
          value={!!p.haptics_enabled}
          onValueChange={(v) => patch({ haptics_enabled: v ? 1 : 0 })}
        />
        <ToggleRow
          styles={styles}
          label="Prayer reminders"
          value={!!p.notifications_enabled}
          onValueChange={(v) => patch({ notifications_enabled: v ? 1 : 0 })}
        />
        <ToggleRow
          styles={styles}
          label="Weekly XP comparison (opt-in)"
          value={!!p.percentile_opt_in}
          onValueChange={(v) => {
            if (v && !p.percentile_install_id) {
              patch({ percentile_opt_in: 1, percentile_install_id: Crypto.randomUUID() });
            } else if (v) {
              patch({ percentile_opt_in: 1 });
            } else {
              patch({ percentile_opt_in: 0, percentile_install_id: null });
            }
          }}
        />

        <Text style={styles.section}>Developer</Text>
        <Text style={styles.hint}>
          Dev mode lets you log before adhān and keeps awarding full gentle-window XP on every tap for
          testing unlocks and UI. Turn off before real use.
        </Text>
        <ToggleRow
          styles={styles}
          label="Dev mode"
          value={!!p.dev_mode}
          onValueChange={(v) => patch({ dev_mode: v ? 1 : 0 })}
        />

        <Text style={styles.section}>Data</Text>
        <Row styles={styles} label="Delete all local data" onPress={onDelete} variant="danger" />
        <Row styles={styles} label="Restart onboarding (testing)" onPress={onRestartOnboarding} />

        <Text style={styles.foot}>
          Sholatin keeps prayer rows on this device. Percentile uses only anonymous weekly XP when enabled
          and a server URL is configured (EXPO_PUBLIC_PERCENTILE_API_URL).
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  label,
  onPress,
  variant = 'default',
  styles: sheet,
}: {
  label: string;
  onPress: () => void;
  variant?: 'default' | 'danger';
  styles: SettingsStyles;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        sheet.row,
        variant === 'danger' && sheet.rowDanger,
        variant === 'danger' && pressed && sheet.rowDangerPressed,
      ]}
      onPress={onPress}
      android_ripple={
        variant === 'danger' ? { color: 'rgba(255,255,255,0.22)' } : { color: 'rgba(0,0,0,0.08)' }
      }
      accessibilityRole="button"
      accessibilityLabel={label}>
      <Text style={[sheet.rowText, variant === 'danger' && sheet.rowTextDanger]}>{label}</Text>
    </Pressable>
  );
}

function ToggleRow({
  label,
  value,
  onValueChange,
  styles: sheet,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  styles: SettingsStyles;
}) {
  return (
    <View style={sheet.toggleRow}>
      <Text style={sheet.rowText}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} accessibilityLabel={label} />
    </View>
  );
}
