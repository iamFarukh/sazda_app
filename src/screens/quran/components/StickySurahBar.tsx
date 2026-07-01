import { memo, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SazdaText } from '../../../components/atoms/SazdaText/SazdaText';
import { motionPresets, durationFor } from '../../../theme/motionPresets';
import { spacing } from '../../../theme/spacing';
import { radius } from '../../../theme/radius';
import type { ReadingThemePalette } from '../../../theme/readingThemes';

type Props = {
  palette: ReadingThemePalette;
  /** Current top-most surah name, or null to hide the bar. */
  englishName: string | null;
  reduceMotion: boolean;
};

/**
 * Floating, absolutely-positioned bar (below the nav header) showing the CURRENT surah.
 * Cross-fades + slides gently whenever the name changes; instant under reduce-motion.
 * Replaces SectionList sticky headers (which are disabled on the list).
 */
export const StickySurahBar = memo(function StickySurahBar({
  palette: p,
  englishName,
  reduceMotion,
}: Props) {
  const enter = useSharedValue(1);

  useEffect(() => {
    if (englishName == null) return;
    const duration = durationFor(motionPresets.enter.duration, reduceMotion);
    enter.value = 0;
    enter.value = withTiming(1, { duration, easing: motionPresets.enter.easing });
  }, [englishName, enter, reduceMotion]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * -8 }],
  }), [enter]);

  if (englishName == null) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        { backgroundColor: p.surface, borderColor: p.divider },
        animStyle,
      ]}>
      <SazdaText variant="label" color={p.textMuted} numberOfLines={1}>
        {englishName}
      </SazdaText>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: spacing.xs,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: '80%',
    opacity: 0.96,
  },
});
