import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useScrollBottomTabPadding } from '@/components/BottomTabBar';
import { getDb } from '@/src/data/db';
import {
  countPrayerLogsEarned,
  countPrayerLogsOnTime,
  getOrCreateMonthRun,
  syncMonthUnlockState,
} from '@/src/data/repositories';
import { maxMonthXp } from '@/src/domain/monthXp';
import { loadDefaultTheme } from '@/src/landscape/loadTheme';
import { getUnlockTiers, highestUnlockedTierIndex } from '@/src/landscape/unlockCatalog';
import { useAppTheme } from '@/src/ui/AppThemeProvider';
import type { AppColorPalette } from '@/src/ui/palettes';
import { radii, space } from '@/src/ui/tokens';

type HabitBadge = { id: string; title: string; detail: string; earned: boolean };

export default function BadgesScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  const scrollBottomPad = useScrollBottomTabPadding();
  const theme = useMemo(() => loadDefaultTheme(), []);
  const monthKey = useMemo(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [monthXp, setMonthXp] = useState(0);
  const [highestTier, setHighestTier] = useState(0);
  const [habitBadges, setHabitBadges] = useState<HabitBadge[]>([]);

  const tiers = useMemo(() => getUnlockTiers(), []);
  const maxXp = useMemo(() => maxMonthXp(monthKey), [monthKey]);

  const refresh = useCallback(() => {
    getDb();
    let mr = getOrCreateMonthRun(monthKey, theme.id);
    syncMonthUnlockState(monthKey, theme.id, mr.xp_total);
    mr = getOrCreateMonthRun(monthKey, theme.id);
    setMonthXp(mr.xp_total);
    const hi = highestUnlockedTierIndex(mr.xp_total, maxXp, tiers);
    setHighestTier(hi);

    const earnedLogs = countPrayerLogsEarned();
    const onTime = countPrayerLogsOnTime();
    setHabitBadges([
      {
        id: 'opening',
        title: 'Opening',
        detail: 'Log your first prayer.',
        earned: earnedLogs >= 1,
      },
      {
        id: 'gentle_window',
        title: 'Gentle window',
        detail: 'Log once in the soft bonus window after adhān.',
        earned: onTime >= 1,
      },
      {
        id: 'steady_light',
        title: 'Steady light',
        detail: 'Ten gentle-window logs, lifetime.',
        earned: onTime >= 10,
      },
    ]);
  }, [monthKey, theme.id, maxXp, tiers]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      return () => {};
    }, [refresh]),
  );

  return (
    <ScrollView contentContainerStyle={[styles.wrap, { paddingBottom: scrollBottomPad }]}>
      <Text style={styles.lead}>
        Your prayers grow this month’s landscape. These marks celebrate what you’ve already done—quietly,
        without a second currency.
      </Text>
      <Text style={styles.meta}>
        This month: {monthXp} / {maxXp} XP toward the next scene step.
      </Text>

      <Text style={styles.section}>This month’s scene</Text>
      {tiers.map((t, i) => {
        const earned = i <= highestTier;
        return (
          <View key={t.id} style={[styles.row, earned && styles.rowEarned]}>
            <FontAwesome
              name={earned ? 'leaf' : 'circle-o'}
              size={22}
              color={earned ? colors.success : colors.textMuted}
              style={styles.rowIcon}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{t.label}</Text>
              <Text style={styles.rowSub}>{earned ? 'Unlocked for this month' : 'Not yet'}</Text>
            </View>
          </View>
        );
      })}

      <Text style={[styles.section, { marginTop: space.lg }]}>Gentle habits</Text>
      {habitBadges.map((b) => (
        <View key={b.id} style={[styles.row, b.earned && styles.rowEarned]}>
          <FontAwesome
            name={b.earned ? 'certificate' : 'circle-o'}
            size={22}
            color={b.earned ? colors.primary : colors.textMuted}
            style={styles.rowIcon}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{b.title}</Text>
            <Text style={styles.rowSub}>{b.detail}</Text>
          </View>
        </View>
      ))}

      <Pressable style={styles.done} onPress={() => router.back()} accessibilityLabel="Close scene badges">
        <Text style={styles.doneText}>Back</Text>
      </Pressable>
    </ScrollView>
  );
}

function buildStyles(colors: AppColorPalette) {
  return StyleSheet.create({
    wrap: { padding: space.lg },
    lead: { color: colors.textMuted, marginBottom: space.md, lineHeight: 22, fontSize: 15 },
    meta: { color: colors.text, fontWeight: '600', marginBottom: space.lg },
    section: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: space.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: space.md,
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      marginBottom: space.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    rowEarned: {
      borderColor: colors.success,
      backgroundColor: colors.surface,
    },
    rowIcon: { marginRight: space.md, width: 28, textAlign: 'center' },
    rowTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
    rowSub: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
    done: {
      marginTop: space.lg,
      alignSelf: 'center',
      paddingHorizontal: space.xl,
      paddingVertical: space.sm,
      borderRadius: radii.pill,
      backgroundColor: colors.primary,
    },
    doneText: { color: colors.onPrimary, fontWeight: '700' },
  });
}
