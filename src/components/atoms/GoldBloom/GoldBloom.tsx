import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { motionEasing } from '../../../theme/motion';

type Props = {
  reduceMotion?: boolean;
  size?: number;
  color?: string;
  onFinish?: () => void;
};

export function bloomDurationMs(reduceMotion: boolean): number {
  return reduceMotion ? 0 : 1400;
}

/** Expanding gold ring + fade. One-shot; parent unmounts on onFinish. */
export const GoldBloom = memo(function GoldBloom({
  reduceMotion = false,
  size = 160,
  color = '#fed65b',
  onFinish,
}: Props) {
  const t = useSharedValue(0);
  const duration = bloomDurationMs(reduceMotion);

  useEffect(() => {
    if (reduceMotion) {
      onFinish?.();
      return;
    }
    t.value = withTiming(1, { duration, easing: motionEasing.standardOut }, finished => {
      if (finished && onFinish) runOnJS(onFinish)();
    });
  }, [t, duration, reduceMotion, onFinish]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 1 - t.value,
    transform: [{ scale: 0.4 + t.value * 0.9 }],
  }));

  if (reduceMotion) return null;

  return (
    <View pointerEvents="none" style={styles.center}>
      <Animated.View
        style={[
          styles.ring,
          { width: size, height: size, borderRadius: size / 2, borderColor: color },
          ringStyle,
        ]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  ring: { borderWidth: 3 },
});
