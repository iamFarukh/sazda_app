import { useEffect } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useReduceMotion } from '../../../hooks/useReduceMotion';
import { motionEasing } from '../../../theme/motion';

Animated.addWhitelistedNativeProps({ text: true });
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type Props = {
  /** Target integer value. The display counts up/down to it. */
  value: number;
  prefix?: string;
  suffix?: string;
  /** Group thousands with commas (plain, non-locale). Default false. */
  group?: boolean;
  durationMs?: number;
  style?: StyleProp<TextStyle>;
  color?: string;
};

/**
 * A number that animates to its target on the UI thread (TextInput text-prop trick —
 * no per-frame re-renders). Honours Reduce Motion by jumping straight to the value.
 */
export function AnimatedCounter({
  value,
  prefix = '',
  suffix = '',
  group = false,
  durationMs = 800,
  style,
  color,
}: Props) {
  const reduced = useReduceMotion();
  const sv = useSharedValue(value);

  useEffect(() => {
    if (reduced) {
      sv.value = value;
      return;
    }
    sv.value = withTiming(value, { duration: durationMs, easing: motionEasing.standardOut });
  }, [value, reduced, durationMs, sv]);

  const animatedProps = useAnimatedProps(() => {
    'worklet';
    let n = Math.round(sv.value);
    let s = `${n < 0 ? '-' : ''}`;
    let digits = `${Math.abs(n)}`;
    if (group && digits.length > 3) {
      let out = '';
      let c = 0;
      for (let i = digits.length - 1; i >= 0; i--) {
        out = digits[i] + out;
        c++;
        if (c % 3 === 0 && i > 0) out = ',' + out;
      }
      digits = out;
    }
    const text = `${prefix}${s}${digits}${suffix}`;
    return { text, defaultValue: text } as never;
  });

  const initial = `${prefix}${value}${suffix}`;
  return (
    <AnimatedTextInput
      editable={false}
      underlineColorAndroid="transparent"
      value={initial}
      animatedProps={animatedProps}
      pointerEvents="none"
      style={[styles.base, color ? { color } : null, style]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    padding: 0,
    margin: 0,
  },
});
