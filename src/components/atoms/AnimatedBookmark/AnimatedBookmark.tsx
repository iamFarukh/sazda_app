import { Bookmark } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { springs } from '../../../theme/motion';
import { hapticLight, hapticSuccess } from '../../../utils/appHaptics';

type Props = {
  filled: boolean;
  onPress: () => void;
  size?: number;
  /** Outline color when not filled. */
  color: string;
  /** Color when filled (gold "saved"). */
  fillColor: string;
  accessibilityLabel?: string;
  hitSlop?: number;
};

/**
 * Bookmark toggle with a satisfying micro-interaction: a small bounce on every tap and a
 * soft golden glow that blooms when a verse is saved. Reduce-Motion → instant, no bounce.
 */
export function AnimatedBookmark({
  filled,
  onPress,
  size = 22,
  color,
  fillColor,
  accessibilityLabel,
  hitSlop = 10,
}: Props) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);

  const handlePress = () => {
    const willFill = !filled;
    if (willFill) hapticSuccess();
    else hapticLight();
    if (!reduced) {
      scale.value = withSequence(
        withTiming(0.82, { duration: 90, easing: Easing.out(Easing.quad) }),
        withSpring(1, springs.delight),
      );
      if (willFill) {
        glow.value = withSequence(
          withTiming(0.55, { duration: 140, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 520, easing: Easing.out(Easing.quad) }),
        );
      }
    }
    onPress();
  };

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityState={{ selected: filled }}
      accessibilityLabel={accessibilityLabel ?? (filled ? 'Remove bookmark' : 'Add bookmark')}>
      <View style={styles.wrap}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.glow,
            { width: size * 1.7, height: size * 1.7, borderRadius: size, backgroundColor: fillColor },
            glowStyle,
          ]}
        />
        <Animated.View style={iconStyle}>
          <Bookmark
            size={size}
            color={filled ? fillColor : color}
            fill={filled ? fillColor : 'transparent'}
            strokeWidth={2}
          />
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute' },
});
