import React, { forwardRef, useMemo } from 'react';
import { AccessibilityInfo, Image, ImageSourcePropType, Platform, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { lightPalette } from '@/src/ui/palettes';
import type { ThemePack } from './themeTypes';
import { resolveOpacity } from './themeTypes';
import { getCumulativeSceneCount, getCumulativeSceneSource } from './cumulativeScenes';
import { PanZoomImage } from './PanZoomImage';

const dioramaPlaceholder = require('../../assets/diorama-placeholder.png');

type Props = {
  theme: ThemePack;
  channelProgress: Record<string, number>;
  /** Highest unlocked tier (0-based, same order as `unlock_catalog.json`). */
  highestUnlockTierIndex: number;
  width: number;
  height: number;
  reducedMotion: boolean;
  /** Card backing behind art (theme-aware). */
  sceneCardBg?: string;
};

/** Cumulative PNG when art exists; otherwise procedural SVG + placeholder. */
export const LandscapeView = forwardRef<View, Props>(function LandscapeView(
  {
    theme,
    channelProgress,
    highestUnlockTierIndex,
    width,
    height,
    reducedMotion,
    sceneCardBg = lightPalette.sceneShellBg,
  },
  ref,
) {
  const drift = useSharedValue(0);
  const cumulativeFadeOpacity = useSharedValue(1);
  const prevTierForFadeRef = React.useRef<number | null>(null);
  const useCumulativeArt = getCumulativeSceneCount() > 0;
  const cumulativeSource = useMemo(
    () => (useCumulativeArt ? getCumulativeSceneSource(highestUnlockTierIndex) : undefined),
    [useCumulativeArt, highestUnlockTierIndex],
  );

  React.useEffect(() => {
    if (!useCumulativeArt) {
      prevTierForFadeRef.current = null;
      cumulativeFadeOpacity.value = 1;
      return;
    }
    const prev = prevTierForFadeRef.current;
    const cur = highestUnlockTierIndex;
    if (prev === null) {
      prevTierForFadeRef.current = cur;
      cumulativeFadeOpacity.value = 1;
      return;
    }
    if (reducedMotion) {
      prevTierForFadeRef.current = cur;
      cumulativeFadeOpacity.value = 1;
      return;
    }
    if (cur > prev) {
      cumulativeFadeOpacity.value = 0;
      cumulativeFadeOpacity.value = withTiming(1, {
        duration: 520,
        easing: Easing.out(Easing.cubic),
      });
    }
    prevTierForFadeRef.current = cur;
  }, [useCumulativeArt, highestUnlockTierIndex, reducedMotion, cumulativeFadeOpacity]);

  const cumulativeFadeStyle = useAnimatedStyle(() => ({
    opacity: cumulativeFadeOpacity.value,
  }));

  React.useEffect(() => {
    if (useCumulativeArt) return;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((rm) => {
      if (cancelled || rm || reducedMotion) return;
      drift.value = withRepeat(
        withTiming(1, { duration: 12000, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
    });
    return () => {
      cancelled = true;
    };
  }, [drift, reducedMotion, useCumulativeArt]);

  const driftStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: drift.value * 6 - 3 }],
  }));

  const layers = useMemo(() => theme.layers, [theme.layers]);

  const baseImageSource: ImageSourcePropType =
    useCumulativeArt && cumulativeSource ? cumulativeSource : dioramaPlaceholder;

  const cumulativeWebImageStyle = useMemo(
    () =>
      Platform.OS === 'web'
        ? ({ objectFit: 'contain' as const, objectPosition: 'center center' as const })
        : {},
    [],
  );

  return (
    <View
      ref={ref}
      style={[styles.wrap, { width, height, backgroundColor: sceneCardBg }]}
      collapsable={false}>
      {useCumulativeArt ? (
        <Animated.View style={[StyleSheet.absoluteFill, styles.cumulativeMat, cumulativeFadeStyle]}>
          {reducedMotion ? (
            <Image
              source={baseImageSource}
              style={[StyleSheet.absoluteFill, cumulativeWebImageStyle]}
              resizeMode="contain"
              accessibilityRole="image"
              accessibilityLabel="Monthly landscape"
            />
          ) : (
            <PanZoomImage
              source={baseImageSource}
              width={width}
              height={height}
              resetKey={highestUnlockTierIndex}
              imageStyle={cumulativeWebImageStyle}
            />
          )}
        </Animated.View>
      ) : (
        <Image
          source={baseImageSource}
          style={[StyleSheet.absoluteFill, { width, height }]}
          resizeMode="contain"
          accessibilityRole="image"
          accessibilityLabel="Landscape placeholder"
        />
      )}
      {!useCumulativeArt
        ? layers.map((layer) => {
            const p = channelProgress[layer.channelId] ?? 0;
            const op = resolveOpacity(layer.bind, p);
            const key = layer.id;
            if (layer.id === 'sky') {
              return (
                <Svg
                  key={key}
                  width={width}
                  height={height}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none">
                  <Defs>
                    <LinearGradient id="skyG" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor="#DDD6FE" stopOpacity="1" />
                      <Stop offset="1" stopColor="#F5F3FF" stopOpacity="1" />
                    </LinearGradient>
                  </Defs>
                  <Rect x={0} y={0} width={width} height={height} fill="url(#skyG)" opacity={op} />
                </Svg>
              );
            }
            if (layer.id === 'mist') {
              return (
                <Svg
                  key={key}
                  width={width}
                  height={height * 0.45}
                  style={[StyleSheet.absoluteFill, { top: height * 0.2 }]}
                  pointerEvents="none">
                  <Defs>
                    <LinearGradient id="mistG" x1="0" y1="0" x2="1" y2="0">
                      <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
                      <Stop offset="0.5" stopColor="#E9E0FF" stopOpacity={op * 0.55} />
                      <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
                    </LinearGradient>
                  </Defs>
                  <Rect x={0} y={0} width={width} height={height * 0.45} fill="url(#mistG)" />
                </Svg>
              );
            }
            if (layer.id === 'river') {
              return (
                <Animated.View
                  key={key}
                  style={[
                    {
                      position: 'absolute',
                      bottom: height * 0.12,
                      left: -20,
                      right: -20,
                      height: height * 0.14,
                      borderRadius: 20,
                      backgroundColor: `rgba(91, 75, 154, ${0.15 + op * 0.55})`,
                    },
                    !reducedMotion ? driftStyle : undefined,
                  ]}
                />
              );
            }
            if (layer.id === 'flora') {
              const dots = [0.12, 0.28, 0.52, 0.72, 0.86];
              return (
                <View key={key} style={StyleSheet.absoluteFill} pointerEvents="none">
                  {dots.map((left, i) => (
                    <View
                      key={i}
                      style={{
                        position: 'absolute',
                        bottom: height * 0.18,
                        left: width * left,
                        width: 8 + op * 10,
                        height: 8 + op * 14,
                        borderRadius: 8,
                        backgroundColor: `rgba(61, 139, 110, ${0.2 + op * 0.55})`,
                      }}
                    />
                  ))}
                </View>
              );
            }
            if (layer.id === 'fauna') {
              return (
                <View key={key} style={StyleSheet.absoluteFill} pointerEvents="none">
                  <View
                    style={{
                      position: 'absolute',
                      top: height * (0.22 + (1 - op) * 0.08),
                      right: width * 0.18,
                      width: 10 + op * 8,
                      height: 6,
                      borderRadius: 4,
                      backgroundColor: `rgba(30, 26, 46, ${op * 0.35})`,
                      opacity: op,
                    }}
                  />
                  <View
                    style={{
                      position: 'absolute',
                      top: height * (0.26 + (1 - op) * 0.06),
                      right: width * 0.22,
                      width: 14 + op * 6,
                      height: 5,
                      borderRadius: 3,
                      backgroundColor: `rgba(30, 26, 46, ${op * 0.28})`,
                      opacity: op,
                    }}
                  />
                </View>
              );
            }
            return null;
          })
        : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 22,
    overflow: 'hidden',
  },
  /** White mat behind cumulative art. */
  cumulativeMat: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
  },
});
