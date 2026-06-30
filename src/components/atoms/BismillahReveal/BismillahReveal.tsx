import { memo, useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { motionDurations, motionEasing } from '../../../theme/motion';
import { fontFamilies, getFontConfig } from '../../../theme/typography';

/** Arabic Basmala. */
const BISMILLAH = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';

type Props = {
  reduceMotion?: boolean;
  color?: string;
  fontSize?: number;
};

export function bismillahRevealPlan(reduceMotion: boolean): { durationMs: number } {
  return { durationMs: reduceMotion ? 0 : motionDurations.slower };
}

/** Gold Basmala that fades + rises in on mount (instant under reduce-motion). */
export const BismillahReveal = memo(function BismillahReveal({
  reduceMotion = false,
  color = '#d4af37',
  fontSize = 26,
}: Props) {
  const progress = useSharedValue(reduceMotion ? 1 : 0);
  const { durationMs } = bismillahRevealPlan(reduceMotion);

  useEffect(() => {
    progress.value = withTiming(1, {
      duration: durationMs,
      easing: motionEasing.emphasizedOut,
    });
  }, [progress, durationMs]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 10 }],
  }));

  return (
    <Animated.View style={[styles.wrap, style]}>
      <Text
        allowFontScaling={false}
        style={[
          styles.text,
          { color, fontSize, lineHeight: Math.round(fontSize * 1.6) },
        ]}>
        {BISMILLAH}
      </Text>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  text: {
    ...getFontConfig(fontFamilies.arabic, '700'),
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});
