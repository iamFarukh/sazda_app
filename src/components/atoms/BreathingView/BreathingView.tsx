import { useEffect } from 'react';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { motionEasing } from '../../../theme/motion';

type Props = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Lowest opacity in the cycle (1 = no opacity change). Default 0.75. */
  minOpacity?: number;
  /** Largest scale in the cycle (1 = no scale change). Default 1 (opacity-only breath). */
  maxScale?: number;
  /** Full inhale→exhale duration in ms. Default 5500 (slow, calming). */
  durationMs?: number;
  pointerEventsNone?: boolean;
};

/**
 * Wraps content in a very slow, calming "breath" (subtle opacity ± scale) so important
 * surfaces feel alive without demanding attention. Honors Reduce Motion (renders static).
 */
export function BreathingView({
  children,
  style,
  minOpacity = 0.75,
  maxScale = 1,
  durationMs = 5500,
  pointerEventsNone,
}: Props) {
  const reduced = useReducedMotion();
  const t = useSharedValue(1); // 1 = full inhale, 0 = exhale

  useEffect(() => {
    if (reduced) return;
    t.value = withRepeat(
      withTiming(0, { duration: durationMs, easing: motionEasing.inOutSine }),
      -1,
      true,
    );
    return () => cancelAnimation(t);
  }, [reduced, durationMs, t]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: minOpacity + (1 - minOpacity) * t.value,
    transform: [{ scale: 1 + (maxScale - 1) * t.value }],
  }));

  return (
    <Animated.View
      pointerEvents={pointerEventsNone ? 'none' : undefined}
      style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}
