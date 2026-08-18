import { useEffect } from 'react';
import type { DimensionValue, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { motionDurations, motionEasing } from '../../../theme/motion';
import { useThemePalette } from '../../../theme/useThemePalette';

type SkeletonProps = {
  width?: DimensionValue;
  height?: DimensionValue;
  /** Corner radius. Pass a large number / use `circle` for avatars. */
  radius?: number;
  circle?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * A single placeholder block with a calm breathing pulse. Use to mirror the shape of
 * content while it loads — far less jarring than a centered spinner (no layout shift
 * when real content arrives). Honors Reduce Motion (renders a static dim block).
 */
export function Skeleton({ width = '100%', height = 16, radius = 8, circle, style }: SkeletonProps) {
  const { colors: c } = useThemePalette();
  const reduced = useReducedMotion();
  const pulse = useSharedValue(reduced ? 0.65 : 0.4);

  useEffect(() => {
    if (reduced) {
      pulse.value = 0.65;
      return;
    }
    pulse.value = withRepeat(
      withTiming(0.85, {
        duration: motionDurations.skeletonPulseMs,
        easing: motionEasing.inOutSine,
      }),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
  }, [reduced, pulse]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  const resolvedRadius = circle && typeof height === 'number' ? height / 2 : radius;

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        { width, height, borderRadius: resolvedRadius, backgroundColor: c.surfaceContainerHighest },
        animatedStyle,
        style,
      ]}
    />
  );
}
