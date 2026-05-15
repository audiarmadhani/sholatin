import FontAwesome from '@expo/vector-icons/FontAwesome';
import { usePathname, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/src/ui/AppThemeProvider';
import type { AppColorPalette } from '@/src/ui/palettes';
import { space } from '@/src/ui/tokens';

/** Extra bottom padding for scroll content so it clears the global tab bar + home indicator. */
export function useScrollBottomTabPadding(): number {
  const { bottom } = useSafeAreaInsets();
  return 92 + Math.max(bottom, 10);
}

function tabStyles(c: AppColorPalette) {
  return StyleSheet.create({
    bar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingTop: space.sm,
      paddingHorizontal: space.lg,
      backgroundColor: c.tabBarBg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.tabBarBorder,
    },
    item: { alignItems: 'center', minWidth: 72 },
    label: { fontSize: 11, fontWeight: '600', color: c.textMuted, marginTop: 4 },
    labelActive: { fontSize: 11, fontWeight: '800', color: c.homeDeep, marginTop: 4 },
  });
}

/**
 * Fixed bottom navigation on main screens.
 */
export function BottomTabBar() {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const styles = useMemo(() => tabStyles(colors), [colors]);

  const isHome = pathname === '/' || pathname === '/index' || pathname === '';
  const isBadges = pathname === '/badges';
  const isProfile = pathname === '/settings';

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <Pressable
        style={styles.item}
        onPress={() => router.push('/')}
        accessibilityLabel="Home"
        accessibilityState={{ selected: isHome }}>
        <FontAwesome name="home" size={22} color={isHome ? colors.homeDeep : colors.textMuted} />
        <Text style={isHome ? styles.labelActive : styles.label}>Home</Text>
      </Pressable>
      <Pressable
        style={styles.item}
        onPress={() => router.push('/badges')}
        accessibilityLabel="Scene and badges"
        accessibilityState={{ selected: isBadges }}>
        <FontAwesome
          name="leaf"
          size={22}
          color={isBadges ? colors.homeDeep : colors.textMuted}
        />
        <Text style={isBadges ? styles.labelActive : styles.label}>Scene</Text>
      </Pressable>
      <Pressable
        style={styles.item}
        onPress={() => router.push('/settings')}
        accessibilityLabel="Settings"
        accessibilityState={{ selected: isProfile }}>
        <FontAwesome name="user-o" size={22} color={isProfile ? colors.homeDeep : colors.textMuted} />
        <Text style={isProfile ? styles.labelActive : styles.label}>Profile</Text>
      </Pressable>
    </View>
  );
}
