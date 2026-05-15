import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useScrollBottomTabPadding } from '@/components/BottomTabBar';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

import { ambient } from '@/src/audio/AmbientController';
import { getDb } from '@/src/data/db';
import {
  getOrCreateMonthRun,
  getPrayerInstancesForDate,
  getProfile,
  getTimingsBetween,
  insertXpEvent,
  saveDayTimings,
  sumXpEventsBetween,
  syncMonthUnlockState,
  updateMonthRun,
  upsertPrayerInstance,
} from '@/src/data/repositories';
import { formatCountdown, getFocusPrayerContext } from '@/src/domain/activePrayer';
import { meanHarmony } from '@/src/domain/channelAllocation';
import { maxMonthXp, monthXpProgress } from '@/src/domain/monthXp';
import type { PrayerName } from '@/src/domain/types';
import { BASE_XP, BONUS_ON_TIME_XP, PRAYER_ORDER } from '@/src/domain/types';
import { classifyAndScoreXp } from '@/src/domain/xpEngine';
import { LandscapeView } from '@/src/landscape/LandscapeView';
import { getCumulativeSceneCount } from '@/src/landscape/cumulativeScenes';
import { loadDefaultTheme } from '@/src/landscape/loadTheme';
import {
  getLandscapeLevelSegment,
  getMergedChannelProgress,
  getUnlockTiers,
  highestUnlockedTierIndex,
  nextTierLabel,
} from '@/src/landscape/unlockCatalog';
import { localDateKey } from '@/src/logic/monthMetrics';
import { fetchAladhanTimings, type DayTimings } from '@/src/services/prayerTimes';
import { ensureNotificationPermission, schedulePrayerReminders } from '@/src/services/notifications';
import { fetchPercentileSnapshot } from '@/src/services/percentileClient';
import { localMondayWeekBoundsISO } from '@/src/services/weekXp';
import { useAppTheme } from '@/src/ui/AppThemeProvider';
import type { AppColorPalette } from '@/src/ui/palettes';
import { radii, space } from '@/src/ui/tokens';

function parseTimingsJson(raw: string): DayTimings {
  return JSON.parse(raw) as DayTimings;
}

function titleCasePrayer(p: PrayerName): string {
  return p.charAt(0) + p.slice(1).toLowerCase();
}

function previewLogXp(
  phase: 'until_official' | 'gentle_window' | 'late_same_day' | 'all_logged' | 'dev_mode' | undefined,
): number {
  if (phase === 'gentle_window' || phase === 'dev_mode') return BASE_XP + BONUS_ON_TIME_XP;
  return BASE_XP;
}

export default function HomeScreen() {
  const router = useRouter();
  const { colors, scheme, toggleLightDark } = useAppTheme();
  const styles = useMemo(() => buildHomeStyles(colors), [colors]);
  const scrollBottomPad = useScrollBottomTabPadding();
  const { width } = useWindowDimensions();
  /** Minimum scene inner height; slot grows with flex to sit just above the dock. */
  const minSceneInnerH = Math.round(width * 0.52);
  const [sceneSlotH, setSceneSlotH] = useState(0);
  const landscapeRef = useRef<View>(null);

  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<string | null>(null);
  const [dateKey, setDateKey] = useState(localDateKey(new Date()));
  const [timingsToday, setTimingsToday] = useState<DayTimings | null>(null);
  const [instancesToday, setInstancesToday] = useState(
    [] as ReturnType<typeof getPrayerInstancesForDate>,
  );
  const [channelProgress, setChannelProgress] = useState<Record<string, number>>({});
  const [percentileLine, setPercentileLine] = useState<string | null>(null);
  const [profile, setProfile] = useState<ReturnType<typeof getProfile> | null>(null);
  const [tickMs, setTickMs] = useState(() => Date.now());
  const [monthXpTotal, setMonthXpTotal] = useState(0);
  const [systemReduceMotion, setSystemReduceMotion] = useState(false);

  const theme = useMemo(() => loadDefaultTheme(), []);
  const unlockTiers = useMemo(() => getUnlockTiers(), []);
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const maxXpThisMonth = useMemo(() => maxMonthXp(monthKey), [monthKey]);
  const landscapeSegment = useMemo(
    () => getLandscapeLevelSegment(monthXpTotal, maxXpThisMonth, unlockTiers),
    [monthXpTotal, maxXpThisMonth, unlockTiers],
  );
  const levelBarPct = useMemo(() => {
    if (landscapeSegment.maxLevels <= 0) {
      return Math.min(100, monthXpProgress(monthXpTotal, monthKey) * 100);
    }
    return Math.min(100, landscapeSegment.segmentFill * 100);
  }, [landscapeSegment, monthXpTotal, monthKey]);
  const nextUnlockHint = useMemo(() => {
    if (unlockTiers.length === 0 || maxXpThisMonth <= 0) return null;
    const tier = highestUnlockedTierIndex(monthXpTotal, maxXpThisMonth, unlockTiers);
    const next = nextTierLabel(tier, unlockTiers);
    if (!next) return 'This month’s landscape is fully awake.';
    return `Next at gentle pace: ${next}.`;
  }, [monthXpTotal, maxXpThisMonth, unlockTiers]);

  const highestUnlockTierIndex = useMemo(() => {
    if (unlockTiers.length === 0 || maxXpThisMonth <= 0) return 0;
    return highestUnlockedTierIndex(monthXpTotal, maxXpThisMonth, unlockTiers);
  }, [monthXpTotal, maxXpThisMonth, unlockTiers]);

  const prevUnlockTierRef = useRef<number | null>(null);
  const [landscapeUnlockModal, setLandscapeUnlockModal] = useState<{ label: string } | null>(null);

  useEffect(() => {
    if (loading || !profile) return;
    if (getCumulativeSceneCount() === 0) {
      prevUnlockTierRef.current = highestUnlockTierIndex;
      return;
    }
    const cur = highestUnlockTierIndex;
    const prev = prevUnlockTierRef.current;
    if (prev === null) {
      prevUnlockTierRef.current = cur;
      return;
    }
    prevUnlockTierRef.current = cur;
    if (cur > prev) {
      const label = unlockTiers[cur]?.label ?? 'New landscape step';
      setLandscapeUnlockModal({ label });
      if (profile.haptics_enabled) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  }, [loading, profile, highestUnlockTierIndex, unlockTiers]);

  const load = useCallback(async () => {
    getDb();
    const p = getProfile();
    setProfile(p);
    if (!p.onboarding_done) {
      router.replace('/onboarding');
      return;
    }
    const dk = localDateKey(new Date());
    setDateKey(dk);
    const y = dk.slice(0, 4);
    const mo = dk.slice(5, 7);
    const start = `${y}-${mo}-01`;
    const rows = getTimingsBetween(start, dk);
    const map: Record<string, DayTimings> = {};
    for (const r of rows) {
      map[r.date_key] = parseTimingsJson(r.json);
    }

    const todayInst = getPrayerInstancesForDate(dk);
    setInstancesToday(todayInst);

    const mr = getOrCreateMonthRun(monthKey, theme.id);
    setMonthXpTotal(mr.xp_total);
    syncMonthUnlockState(monthKey, theme.id, mr.xp_total);
    const mrSynced = getOrCreateMonthRun(monthKey, theme.id);
    setChannelProgress(getMergedChannelProgress(mrSynced));

    const lat = p.last_lat;
    const lon = p.last_lon;
    if (lat != null && lon != null) {
      try {
        let t = map[dk];
        if (!t) {
          t = await fetchAladhanTimings({
            dateKey: dk,
            lat,
            lon,
            method: p.calculation_method,
          });
          saveDayTimings(dk, Intl.DateTimeFormat().resolvedOptions().timeZone, JSON.stringify(t));
          map[dk] = t;
        }
        setTimingsToday(t);
        setBanner(null);
        if (p.notifications_enabled) {
          const granted = await ensureNotificationPermission();
          if (granted) {
            const items = PRAYER_ORDER.map((pr) => ({
              prayer: pr,
              whenMs: t[pr],
            })).filter((x) => x.whenMs > Date.now());
            await schedulePrayerReminders(items.slice(0, 5));
          }
        }
      } catch {
        setBanner('Using saved data. Prayer times could not be refreshed.');
        setTimingsToday(map[dk] ?? null);
      }
    } else {
      setBanner('Set location in Settings to load prayer times.');
      setTimingsToday(null);
    }

    if (p.percentile_opt_in && p.percentile_install_id) {
      const { startIso, endIso } = localMondayWeekBoundsISO();
      const wk = sumXpEventsBetween(startIso, endIso);
      const snap = await fetchPercentileSnapshot({
        installId: p.percentile_install_id,
        weeklyXpTotal: wk,
      });
      if (snap) {
        setPercentileLine(
          `This week you’re in the top ${snap.topPercent}% for gentle weekly XP (anonymous comparison).`,
        );
      } else {
        setPercentileLine(null);
      }
    } else {
      setPercentileLine(null);
    }

    setLoading(false);
  }, [monthKey, router, theme.id]);

  useEffect(() => {
    void ambient.init();
    return () => {
      void ambient.unload();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {};
    }, [load]),
  );

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (!cancelled) setSystemReduceMotion(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      setSystemReduceMotion(enabled);
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (!profile) return;
    ambient.setMuted(false);
    void ambient.updateFromHarmony(meanHarmony(channelProgress));
  }, [profile, channelProgress]);

  useEffect(() => {
    const id = setInterval(() => setTickMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const loggedPrayersToday = useMemo(() => {
    const s = new Set<PrayerName>();
    for (const r of instancesToday) {
      if (r.status !== 'missed' && PRAYER_ORDER.includes(r.prayer as PrayerName)) {
        s.add(r.prayer as PrayerName);
      }
    }
    return s;
  }, [instancesToday]);

  const focusPrayer = useMemo(() => {
    if (!timingsToday) return null;
    return getFocusPrayerContext(tickMs, timingsToday, loggedPrayersToday, {
      devMode: !!profile?.dev_mode,
    });
  }, [tickMs, timingsToday, loggedPrayersToday, profile?.dev_mode]);

  const hero = useMemo(() => {
    if (!timingsToday || !focusPrayer) {
      return {
        main: new Date(tickMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sub: 'Add location in Settings for prayer rhythm.',
      };
    }
    if (focusPrayer.allLogged) {
      return {
        main: new Date(tickMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sub: 'All prayers logged today.',
      };
    }
    if (focusPrayer.targetMs != null) {
      if (focusPrayer.phase === 'dev_mode') {
        return {
          main: formatCountdown(focusPrayer.targetMs - tickMs),
          sub: 'Dev mode · tap adds max XP',
        };
      }
      const sub =
        focusPrayer.phase === 'until_official'
          ? 'Until adhān'
          : focusPrayer.phase === 'gentle_window'
            ? 'Gentle window'
            : 'Coming up';
      return { main: formatCountdown(focusPrayer.targetMs - tickMs), sub };
    }
    return {
      main: new Date(tickMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sub:
        focusPrayer.phase === 'dev_mode'
          ? 'Dev mode · tap to add max XP'
          : `${titleCasePrayer(focusPrayer.prayer)} · still can log`,
    };
  }, [timingsToday, focusPrayer, tickMs]);

  const logPrayer = (prayer: PrayerName) => {
    if (!profile || !timingsToday) {
      Alert.alert('Prayer times', 'Location and times are required to log.');
      return;
    }
    const officialMs = timingsToday[prayer];
    const recordedAtMs = Date.now();
    const devMode = !!profile.dev_mode;
    if (!devMode && recordedAtMs < officialMs) {
      Alert.alert('Not yet', 'Logging opens at adhān time for this prayer.');
      return;
    }
    const xp = devMode
      ? classifyAndScoreXp({ recordedAtMs: officialMs + 60_000, officialTimeMs: officialMs })
      : classifyAndScoreXp({ recordedAtMs, officialTimeMs: officialMs });
    const row = {
      date_key: dateKey,
      prayer,
      official_time_iso: new Date(officialMs).toISOString(),
      status: xp.status,
      recorded_at_iso: new Date(recordedAtMs).toISOString(),
      xp_total: xp.total,
    };
    upsertPrayerInstance(row);
    insertXpEvent({
      amount: xp.total,
      reason: devMode ? 'dev_mode' : xp.bonus > 0 ? 'on_time_bonus' : 'base_prayer',
      date_key: dateKey,
      prayer,
    });
    const mr = getOrCreateMonthRun(monthKey, theme.id);
    const nextXp = mr.xp_total + xp.total;
    updateMonthRun(monthKey, {
      xp_total: nextXp,
    });
    syncMonthUnlockState(monthKey, theme.id, nextXp);
    const mrAfter = getOrCreateMonthRun(monthKey, theme.id);
    setChannelProgress(getMergedChannelProgress(mrAfter));
    setMonthXpTotal(nextXp);
    setInstancesToday(getPrayerInstancesForDate(dateKey));
    if (profile.haptics_enabled) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const onShareLandscape = async () => {
    try {
      const uri = await captureRef(landscapeRef, {
        format: 'png',
        quality: 0.92,
        result: 'tmpfile',
      });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) await Sharing.shareAsync(uri);
      else await Share.share({ url: uri });
    } catch {
      Alert.alert('Share', 'Could not capture the scene.');
    }
  };

  if (loading || !profile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.homeAccent} />
      </View>
    );
  }

  const hasFocusDock = !timingsToday || focusPrayer != null;
  const sceneInnerH =
    sceneSlotH > 0 ? Math.max(minSceneInnerH, sceneSlotH - 8) : minSceneInnerH;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient
        colors={[colors.homeSky, colors.homeMint, colors.homeGrass]}
        locations={[0, 0.45, 1]}
        style={styles.gradient}>
        <View style={styles.mainColumn}>
          <ScrollView
            style={styles.scrollFlex}
            contentContainerStyle={[
              styles.scroll,
              styles.scrollContent,
              { paddingBottom: hasFocusDock ? space.xl : scrollBottomPad },
            ]}
            showsVerticalScrollIndicator={false}>
            <View style={styles.topRow}>
              <Pressable
                onPress={() => {
                  if (profile?.haptics_enabled) {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  toggleLightDark();
                }}
                accessibilityLabel={scheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                accessibilityRole="button"
                hitSlop={12}>
                <FontAwesome
                  name={scheme === 'dark' ? 'sun-o' : 'moon-o'}
                  size={26}
                  color={colors.homeDeep}
                />
              </Pressable>
              <View style={styles.topActions}>
                <Pressable onPress={onShareLandscape} accessibilityLabel="Share landscape" hitSlop={10}>
                  <FontAwesome name="share-alt" size={26} color={colors.homeDeep} />
                </Pressable>
              </View>
            </View>

            {banner ? <Text style={styles.banner}>{banner}</Text> : null}

            <Text style={styles.heroTime} accessibilityRole="text">
              {hero.main}
            </Text>
            <Text style={styles.heroSub}>{hero.sub}</Text>

            <View style={styles.xpBlock}>
              <View style={styles.xpRow}>
                <View style={styles.levelBlock}>
                  <View style={styles.levelPill} accessibilityRole="text">
                    <Text style={styles.levelPillMain}>Level {landscapeSegment.level}</Text>
                    <Text style={styles.levelPillMax}> / {landscapeSegment.maxLevels}</Text>
                  </View>
                  {landscapeSegment.highestTierIndex >= 0 &&
                  unlockTiers[landscapeSegment.highestTierIndex] ? (
                    <Text style={styles.landscapeUnlockedName} numberOfLines={1}>
                      {unlockTiers[landscapeSegment.highestTierIndex].label}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.xpMonthMeta} accessibilityLabel="Progress toward next landscape step">
                  {landscapeSegment.maxLevels > 0
                    ? `${landscapeSegment.withinSegmentXp} / ${landscapeSegment.segmentSpanXp} XP`
                    : `${monthXpTotal} / ${maxXpThisMonth} XP`}
                </Text>
              </View>
              <View
                style={styles.xpTrack}
                accessibilityRole="progressbar"
                accessibilityLabel="Progress in this landscape level"
                accessibilityValue={{
                  min: 0,
                  max: 100,
                  now: Math.round(levelBarPct),
                }}>
                <View style={[styles.xpFill, { width: `${levelBarPct}%` }]} />
              </View>
              <Text style={styles.xpMonthFoot}>
                Month {monthXpTotal} / {maxXpThisMonth} XP
              </Text>
              {nextUnlockHint ? <Text style={styles.xpUnlockHint}>{nextUnlockHint}</Text> : null}
            </View>

            {percentileLine ? <Text style={styles.percentile}>{percentileLine}</Text> : null}

            <View
              style={[styles.sceneGrow, { minHeight: minSceneInnerH + 8 }]}
              onLayout={(e) => {
                const h = Math.round(e.nativeEvent.layout.height);
                setSceneSlotH((prev) => (Math.abs(prev - h) <= 1 ? prev : h));
              }}>
              <View style={[styles.sceneShell, styles.sceneShellStretch]}>
                <LandscapeView
                  ref={landscapeRef}
                  theme={theme}
                  channelProgress={channelProgress}
                  highestUnlockTierIndex={highestUnlockTierIndex}
                  width={width - space.lg * 2 - 8}
                  height={sceneInnerH}
                  reducedMotion={systemReduceMotion}
                  sceneCardBg={colors.sceneShellBg}
                />
              </View>
            </View>
          </ScrollView>

          {hasFocusDock ? (
            <View style={[styles.focusDock, { paddingBottom: scrollBottomPad }]}>
              {!timingsToday ? (
                <>
                  <View style={styles.focusCard}>
                    <Text style={styles.focusLabel}>Location</Text>
                    <Text style={styles.focusValue}>Not set</Text>
                    <Text style={styles.focusHint}>
                      Turn on location in Settings so we can load today’s prayer times.
                    </Text>
                  </View>
                  <Pressable style={styles.primaryCtaDocked} onPress={() => router.push('/settings')}>
                    <Text style={styles.primaryCtaLabel}>Open Settings</Text>
                    <View style={styles.xpChip}>
                      <Text style={styles.xpChipText}>GPS</Text>
                    </View>
                  </Pressable>
                </>
              ) : focusPrayer?.allLogged ? (
                <>
                  <View style={styles.focusCard}>
                    <Text style={styles.focusLabel}>Today</Text>
                    <Text style={styles.focusValue}>Complete</Text>
                    <Text style={styles.focusHint}>Every salah is logged. Rest in that calm.</Text>
                  </View>
                  <Pressable style={[styles.primaryCtaMuted, styles.primaryCtaDocked]} disabled>
                    <Text style={styles.primaryCtaLabelMuted}>Peace until tomorrow</Text>
                  </Pressable>
                </>
              ) : focusPrayer ? (
                <>
                  <View style={styles.focusCard}>
                    <Text style={styles.focusLabel}>Now</Text>
                    <Text style={styles.focusValue}>{titleCasePrayer(focusPrayer.prayer)}</Text>
                    <Text style={styles.focusHint}>
                      Adhān{' '}
                      {new Date(timingsToday[focusPrayer.prayer]).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {' · '}
                      {focusPrayer.phase === 'gentle_window'
                        ? 'Bonus window open'
                        : focusPrayer.phase === 'dev_mode'
                          ? 'Dev mode · ignores adhān gate'
                          : focusPrayer.phase === 'until_official'
                            ? 'Before adhān'
                            : 'Base XP if you log now'}
                    </Text>
                  </View>
                  <Pressable
                    style={[
                      styles.primaryCta,
                      styles.primaryCtaDocked,
                      focusPrayer.phase === 'until_official' && !profile.dev_mode && styles.primaryCtaDisabled,
                    ]}
                    disabled={focusPrayer.phase === 'until_official' && !profile.dev_mode}
                    onPress={() => logPrayer(focusPrayer.prayer)}
                    accessibilityLabel={`Log ${focusPrayer.prayer}`}
                    accessibilityState={{
                      disabled: focusPrayer.phase === 'until_official' && !profile.dev_mode,
                    }}>
                    <Text
                      style={[
                        styles.primaryCtaLabel,
                        focusPrayer.phase === 'until_official' &&
                          !profile.dev_mode &&
                          styles.primaryCtaLabelDisabled,
                      ]}>
                      Log {titleCasePrayer(focusPrayer.prayer)}
                    </Text>
                    {focusPrayer.phase === 'until_official' && !profile.dev_mode ? (
                      <View style={[styles.xpChip, styles.xpChipPending]}>
                        <Text style={styles.xpChipTextPending}>After adhān</Text>
                      </View>
                    ) : (
                      <View style={styles.xpChip}>
                        <Text style={styles.xpChipText}>+{previewLogXp(focusPrayer.phase)} XP</Text>
                      </View>
                    )}
                  </Pressable>
                </>
              ) : null}
            </View>
          ) : null}
        </View>
      </LinearGradient>

      <Modal
        visible={!!landscapeUnlockModal}
        transparent
        animationType="fade"
        onRequestClose={() => setLandscapeUnlockModal(null)}>
        <Pressable
          style={styles.unlockModalBackdrop}
          onPress={() => setLandscapeUnlockModal(null)}
          accessibilityLabel="Dismiss">
          <Pressable style={styles.unlockModalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.unlockModalTitle}>Landscape unlocked</Text>
            <Text style={styles.unlockModalSubtitle}>{landscapeUnlockModal?.label}</Text>
            <Text style={styles.unlockModalHint}>Your scene has opened a little more this month.</Text>
            <Pressable
              style={styles.unlockModalButton}
              onPress={() => setLandscapeUnlockModal(null)}
              accessibilityRole="button"
              accessibilityLabel="Continue">
              <Text style={styles.unlockModalButtonLabel}>Continue</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function buildHomeStyles(colors: AppColorPalette) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.homeSky },
  gradient: { flex: 1 },
  mainColumn: { flex: 1 },
  scrollFlex: { flex: 1 },
  scroll: { paddingHorizontal: space.lg, paddingTop: space.sm },
  scrollContent: { flexGrow: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.homeSky,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.md,
  },
  topActions: { flexDirection: 'row', alignItems: 'center' },
  banner: {
    color: colors.homeDeep,
    opacity: 0.75,
    marginBottom: space.sm,
    fontSize: 13,
    textAlign: 'center',
  },
  heroTime: {
    fontSize: 44,
    fontWeight: '800',
    color: colors.homeDeep,
    textAlign: 'center',
    letterSpacing: -0.75,
    fontVariant: ['tabular-nums'],
  },
  heroSub: {
    marginTop: space.xs,
    fontSize: 15,
    fontWeight: '500',
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: space.md,
  },
  xpBlock: {
    backgroundColor: colors.homeGlass,
    borderRadius: radii.xl,
    padding: space.md,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: colors.homeGlassBorder,
    alignItems: 'stretch',
  },
  xpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    width: '100%',
    gap: space.sm,
    marginBottom: space.xs,
  },
  /** Column under the meta row: keep children flush left (matches xpTrack below on web). */
  levelBlock: { flex: 1, minWidth: 0, alignItems: 'flex-start' },
  levelPill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: `${colors.primary}22`,
    paddingHorizontal: space.sm + 2,
    paddingVertical: 5,
    borderRadius: radii.pill,
    marginBottom: 4,
  },
  levelPillMain: { fontSize: 14, fontWeight: '800', color: colors.homeDeep },
  levelPillMax: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  landscapeUnlockedName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    alignSelf: 'stretch',
  },
  xpMonthMeta: { fontSize: 13, fontWeight: '600', color: colors.textMuted, flexShrink: 0, paddingTop: 2 },
  xpMonthFoot: {
    marginTop: space.xs,
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    opacity: 0.9,
  },
  xpUnlockHint: {
    marginTop: space.sm,
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
    lineHeight: 17,
  },
  xpTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.xpTrackBg,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: colors.homeAccent,
  },
  sceneShell: {
    alignSelf: 'center',
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: colors.sceneShellBg,
    padding: 4,
    marginBottom: space.lg,
    shadowColor: colors.homeCardShadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
  sceneGrow: {
    flex: 1,
  },
  sceneShellStretch: {
    alignSelf: 'stretch',
    flex: 1,
    marginBottom: 0,
  },
  focusCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: space.lg,
    marginBottom: space.md,
    shadowColor: colors.focusCardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  focusLabel: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },
  focusValue: { fontSize: 28, fontWeight: '800', color: colors.homeDeep, marginTop: 4 },
  focusHint: { fontSize: 14, color: colors.textMuted, marginTop: space.sm, lineHeight: 20 },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.homeCtaBg,
    borderRadius: radii.xl,
    paddingVertical: space.md + 2,
    paddingHorizontal: space.lg,
    marginBottom: space.lg,
    shadowColor: colors.homeCtaShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 5,
  },
  primaryCtaDisabled: {
    opacity: 0.55,
    shadowOpacity: 0.08,
    elevation: 1,
  },
  primaryCtaMuted: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.homeMutedCtaBg,
    borderRadius: radii.xl,
    paddingVertical: space.md + 2,
    paddingHorizontal: space.lg,
    marginBottom: space.lg,
    borderWidth: 1,
    borderColor: colors.homeMutedCtaBorder,
  },
  primaryCtaLabel: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  primaryCtaLabelDisabled: { color: 'rgba(255,255,255,0.85)' },
  primaryCtaLabelMuted: { fontSize: 16, fontWeight: '700', color: colors.textMuted },
  xpChip: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  xpChipText: { fontSize: 14, fontWeight: '800', color: '#E8FFF1' },
  xpChipPending: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  xpChipTextPending: { fontSize: 13, fontWeight: '700', color: 'rgba(232,255,241,0.85)' },
  percentile: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginBottom: space.md },
  focusDock: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
  },
  primaryCtaDocked: { marginBottom: 0 },
  unlockModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: space.lg,
  },
  unlockModalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unlockModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: space.sm,
  },
  unlockModalSubtitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: space.sm,
  },
  unlockModalHint: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: space.lg,
  },
  unlockModalButton: {
    alignSelf: 'stretch',
    backgroundColor: colors.homeCtaBg,
    borderRadius: radii.lg,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  unlockModalButtonLabel: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  });
}
