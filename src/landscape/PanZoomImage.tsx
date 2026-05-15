import React, { useEffect } from 'react';
import { Image, ImageSourcePropType, Platform, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { clamp, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

const MIN_SCALE = 1;
const MAX_SCALE = 4;

type Props = {
  source: ImageSourcePropType;
  /** Viewport width / height (clip area). */
  width: number;
  height: number;
  /** When this changes, pan and zoom reset. */
  resetKey: number | string;
  /** Extra styles for the underlying image (e.g. web object-fit). */
  imageStyle?: object;
};

const AnimatedImage = Animated.createAnimatedComponent(Image);

/**
 * Pinch to zoom (1–4×), drag to pan, double-tap to reset. Viewport clips overflow.
 * Web: wheel zoom over the scene. Scale is applied around the viewport center.
 */
export function PanZoomImage({ source, width, height, resetKey, imageStyle }: Props) {
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const scale = useSharedValue(1);

  const pinchStartScale = useSharedValue(1);
  const panStartX = useSharedValue(0);
  const panStartY = useSharedValue(0);

  useEffect(() => {
    offsetX.value = 0;
    offsetY.value = 0;
    scale.value = 1;
    pinchStartScale.value = 1;
  }, [resetKey, offsetX, offsetY, scale, pinchStartScale]);

  const pinchGesture = Gesture.Pinch()
    .onBegin(() => {
      pinchStartScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = clamp(pinchStartScale.value * e.scale, MIN_SCALE, MAX_SCALE);
    });

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      panStartX.value = offsetX.value;
      panStartY.value = offsetY.value;
    })
    .onUpdate((e) => {
      offsetX.value = panStartX.value + e.translationX;
      offsetY.value = panStartY.value + e.translationY;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(280)
    .onEnd(() => {
      offsetX.value = 0;
      offsetY.value = 0;
      scale.value = 1;
      pinchStartScale.value = 1;
    });

  const composed = Gesture.Simultaneous(Gesture.Simultaneous(pinchGesture, panGesture), doubleTap);

  const animatedStyle = useAnimatedStyle(() => {
    const cx = width / 2;
    const cy = height / 2;
    return {
      transform: [
        { translateX: offsetX.value },
        { translateY: offsetY.value },
        { translateX: cx },
        { translateY: cy },
        { scale: scale.value },
        { translateX: -cx },
        { translateY: -cy },
      ],
    };
  });

  const webWheelProps =
    Platform.OS === 'web'
      ? {
          onWheel: (e: { nativeEvent?: { deltaY?: number }; preventDefault?: () => void }) => {
            const dy = e.nativeEvent?.deltaY ?? 0;
            if (dy === 0) return;
            e.preventDefault?.();
            const factor = dy < 0 ? 1.06 : 0.94;
            scale.value = clamp(scale.value * factor, MIN_SCALE, MAX_SCALE);
          },
        }
      : {};

  return (
    <View style={[styles.clip, { width, height }]} {...webWheelProps}>
      <GestureDetector gesture={composed}>
        <Animated.View style={[styles.fill, animatedStyle]}>
          <AnimatedImage
            source={source}
            style={[styles.fill, imageStyle]}
            resizeMode="contain"
            accessibilityRole="image"
            accessibilityLabel="Monthly landscape"
            accessibilityHint={
              Platform.OS === 'web'
                ? 'Drag to move. Pinch or scroll wheel to zoom. Double-tap to reset.'
                : 'Drag to move the scene. Pinch with two fingers to zoom. Double-tap to reset.'
            }
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    height: '100%',
  },
});
