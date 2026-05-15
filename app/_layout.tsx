import 'react-native-gesture-handler';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  DarkTheme as NavDarkTheme,
  DefaultTheme as NavDefaultTheme,
  ThemeProvider,
  type Theme as NavigationTheme,
} from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { BottomTabBar } from '@/components/BottomTabBar';
import { AppThemeProvider, useAppTheme } from '@/src/ui/AppThemeProvider';
import type { AppColorPalette } from '@/src/ui/palettes';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

function buildNavigationTheme(scheme: 'light' | 'dark', c: AppColorPalette): NavigationTheme {
  const base = scheme === 'dark' ? NavDarkTheme : NavDefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: c.primary,
      background: c.background,
      card: c.surface,
      text: c.text,
      border: c.border,
      notification: c.success,
    },
  };
}

function ThemedRoot() {
  const { scheme, colors } = useAppTheme();
  const navigationTheme = useMemo(() => buildNavigationTheme(scheme, colors), [scheme, colors]);

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <ThemeProvider value={navigationTheme}>
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
          <Stack>
            <Stack.Screen name="index" options={{ title: 'Sholatin', headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="settings" options={{ title: 'Settings' }} />
            <Stack.Screen name="badges" options={{ title: 'Scene & badges' }} />
          </Stack>
          <BottomTabBar />
        </GestureHandlerRootView>
      </ThemeProvider>
    </>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <AppThemeProvider>
      <ThemedRoot />
    </AppThemeProvider>
  );
}
