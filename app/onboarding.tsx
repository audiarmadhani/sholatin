import * as Crypto from 'expo-crypto';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useScrollBottomTabPadding } from '@/components/BottomTabBar';
import { getDb } from '@/src/data/db';
import { saveLastLocation, setOnboardingDone, updateProfile } from '@/src/data/repositories';
import { ensureNotificationPermission } from '@/src/services/notifications';
import { getWebGeolocationPosition } from '@/src/services/webGeolocation';
import { useAppTheme } from '@/src/ui/AppThemeProvider';
import type { AppColorPalette } from '@/src/ui/palettes';
import { radii, space } from '@/src/ui/tokens';

const STEPS = ['welcome', 'location', 'method', 'notify', 'percentile', 'done'] as const;

function buildOnboardingStyles(colors: AppColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background, padding: space.lg },
    card: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: space.lg,
      justifyContent: 'center',
    },
    h1: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: space.md },
    p: { fontSize: 15, color: colors.textMuted, lineHeight: 22, marginBottom: space.lg },
    primary: {
      backgroundColor: colors.primary,
      paddingVertical: space.md,
      borderRadius: radii.pill,
      alignItems: 'center',
      marginBottom: space.sm,
    },
    primaryDisabled: { opacity: 0.65 },
    primaryText: { color: colors.onPrimary, fontWeight: '700', fontSize: 16 },
    ghost: { paddingVertical: space.sm, alignItems: 'center' },
    ghostText: { color: colors.primary, fontWeight: '600' },
  });
}

type OnboardingStyles = ReturnType<typeof buildOnboardingStyles>;

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => buildOnboardingStyles(colors), [colors]);
  const scrollBottomPad = useScrollBottomTabPadding();
  const [step, setStep] = useState<(typeof STEPS)[number]>('welcome');
  const [locationBusy, setLocationBusy] = useState(false);

  const next = () => {
    const i = STEPS.indexOf(step);
    setStep(STEPS[Math.min(STEPS.length - 1, i + 1)]);
  };

  const finish = () => {
    getDb();
    setOnboardingDone(true);
    router.replace('/');
  };

  const requestLocation = async () => {
    getDb();
    setLocationBusy(true);
    try {
      if (Platform.OS === 'web') {
        const { latitude, longitude } = await getWebGeolocationPosition();
        saveLastLocation(latitude, longitude);
        next();
        return;
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        next();
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      saveLastLocation(pos.coords.latitude, pos.coords.longitude);
      next();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(
          `Could not read location\n\n${msg}\n\nUse https:// or localhost, allow location, then try again.`,
        );
      } else {
        console.warn('[onboarding] location', e);
      }
    } finally {
      setLocationBusy(false);
    }
  };

  const setMethod = (method: number) => {
    updateProfile({ calculation_method: method });
    next();
  };

  const setNotify = async (on: boolean) => {
    updateProfile({ notifications_enabled: on ? 1 : 0 });
    if (on) await ensureNotificationPermission();
    next();
  };

  const setPercentile = (on: boolean) => {
    if (on) {
      updateProfile({
        percentile_opt_in: 1,
        percentile_install_id: Crypto.randomUUID(),
      });
    } else {
      updateProfile({ percentile_opt_in: 0, percentile_install_id: null });
    }
    next();
  };

  return (
    <SafeAreaView style={[styles.safe, { paddingBottom: scrollBottomPad }]}>
      <View style={styles.card}>
        {step === 'welcome' ? (
          <>
            <Text style={styles.h1}>Welcome to Sholatin</Text>
            <Text style={styles.p}>
              A calm rhythm for the five daily prayers. You’ll shape a soft monthly landscape with gentle
              attention—no pressure, no noise.
            </Text>
            <Primary styles={styles} label="Begin" onPress={next} />
          </>
        ) : null}
        {step === 'location' ? (
          <>
            <Text style={styles.h1}>Location</Text>
            <Text style={styles.p}>
              We use your approximate location only to compute official prayer times for your area.
            </Text>
            <Primary
              styles={styles}
              label={locationBusy ? 'Requesting location…' : 'Share location'}
              onPress={requestLocation}
              disabled={locationBusy}
            />
            <Ghost styles={styles} label="Skip for now" onPress={next} />
          </>
        ) : null}
        {step === 'method' ? (
          <>
            <Text style={styles.h1}>Calculation</Text>
            <Text style={styles.p}>Pick a method for prayer times (you can change this later).</Text>
            <Primary styles={styles} label="Muslim World League (2)" onPress={() => setMethod(2)} />
            <Ghost styles={styles} label="ISNA (3)" onPress={() => setMethod(3)} />
            <Ghost styles={styles} label="Egyptian General (5)" onPress={() => setMethod(5)} />
          </>
        ) : null}
        {step === 'notify' ? (
          <>
            <Text style={styles.h1}>Reminders</Text>
            <Text style={styles.p}>Optional calm reminders near prayer times.</Text>
            <Primary styles={styles} label="Enable reminders" onPress={() => setNotify(true)} />
            <Ghost styles={styles} label="Not now" onPress={() => setNotify(false)} />
          </>
        ) : null}
        {step === 'percentile' ? (
          <>
            <Text style={styles.h1}>Weekly rhythm (optional)</Text>
            <Text style={styles.p}>
              You can see how your weekly in-app XP compares to others—anonymous, opt-in, and never about
              worship quality. Requires a small server URL configured by the app maintainer.
            </Text>
            <Primary styles={styles} label="Opt in" onPress={() => setPercentile(true)} />
            <Ghost styles={styles} label="No thanks" onPress={() => setPercentile(false)} />
          </>
        ) : null}
        {step === 'done' ? (
          <>
            <Text style={styles.h1}>You’re set</Text>
            <Text style={styles.p}>Take a breath. When you’re ready, open the home screen.</Text>
            <Primary styles={styles} label="Enter Sholatin" onPress={finish} />
          </>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function Primary({
  label,
  onPress,
  disabled,
  styles,
}: {
  label: string;
  onPress?: () => void | Promise<void>;
  disabled?: boolean;
  styles: OnboardingStyles;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.primary,
        disabled && styles.primaryDisabled,
        Platform.OS === 'web' && { cursor: 'pointer' as const },
        pressed && !disabled && Platform.OS === 'web' && { opacity: 0.92 },
      ]}
      onPress={
        disabled || !onPress
          ? undefined
          : () => void Promise.resolve(onPress()).catch(handlePrimaryError)
      }
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}>
      <Text style={styles.primaryText} pointerEvents="none">
        {label}
      </Text>
    </Pressable>
  );
}

function Ghost({ label, onPress, styles }: { label: string; onPress: () => void; styles: OnboardingStyles }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.ghost, Platform.OS === 'web' && { cursor: 'pointer' as const }, pressed && { opacity: 0.8 }]}
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button">
      <Text style={styles.ghostText} pointerEvents="none">
        {label}
      </Text>
    </Pressable>
  );
}

function handlePrimaryError(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(msg);
  } else {
    console.warn('[Primary]', e);
  }
}
