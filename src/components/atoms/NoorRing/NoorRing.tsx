import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

type Props = {
  size?: number;
  /** Ring/glow color. Defaults to a warm gold "noor". */
  color?: string;
  /** Bump this (or toggle true) to (re)play the burst. */
  playKey?: number | boolean;
  style?: StyleProp<ViewStyle>;
};

const GOLD = '#D4AF37';

/**
 * "Noor" — an elegant expanding ring of light for moments of completion (prayer marked,
 * goal reached). Calm and reverent: a soft golden ring blooms outward and fades, with a
 * gentle central glow. No confetti. Honors Reduce Motion (renders nothing animated).
 */
export function NoorRing({ size = 140, color = GOLD, playKey = true, style }: Props) {
  const reduced = useReducedMotion();
  const ringScale = useSharedValue(0.3);
  const ringOpacity = useSharedValue(0);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    ringScale.value = 0.3;
    ringOpacity.value = 0;
    glowOpacity.value = 0;
    ringScale.value = withTiming(1, { duration: 950, easing: Easing.out(Easing.cubic) });
    ringOpacity.value = withSequence(
      withTiming(0.7, { duration: 140, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 820, easing: Easing.out(Easing.quad) }),
    );
    glowOpacity.value = withSequence(
      withTiming(0.5, { duration: 220, easing: Easing.out(Easing.quad) }),
      withDelay(120, withTiming(0, { duration: 700, easing: Easing.out(Easing.quad) })),
    );
  }, [playKey, reduced, ringScale, ringOpacity, glowOpacity]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));

  return (
    <View pointerEvents="none" style={[styles.wrap, { width: size, height: size }, style]}>
      <Animated.View
        style={[
          styles.glow,
          { width: size * 0.62, height: size * 0.62, borderRadius: size, backgroundColor: color },
          glowStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          { width: size, height: size, borderRadius: size / 2, borderColor: color },
          ringStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute' },
  ring: { position: 'absolute', borderWidth: 2 },
});
