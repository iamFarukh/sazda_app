import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import LottieView from 'lottie-react-native';
import type { AnimationObject } from 'lottie-react-native';
import { useReduceMotion } from '../../../hooks/useReduceMotion';

type Props = {
  /** Bump this number to (re)play the burst once. Falsy (0) renders nothing. */
  trigger: number;
  /** require('...json') celebration animation. */
  source: AnimationObject | { uri: string };
  size?: number;
  speed?: number;
  /** Absolute-centered overlay by default; pass style to reposition. */
  style?: StyleProp<ViewStyle>;
};

/**
 * A play-once Lottie celebration for meaningful moments (goal reached, payment saved,
 * perfect day). Remounts on each `trigger` change so it replays cleanly, sits above content
 * without intercepting touches, and renders nothing under Reduce Motion.
 */
export function LottieBurst({ trigger, source, size = 220, speed = 1, style }: Props) {
  const reduced = useReduceMotion();
  if (reduced || !trigger) return null;
  return (
    <View pointerEvents="none" style={[styles.wrap, style]}>
      <LottieView
        key={trigger}
        source={source}
        autoPlay
        loop={false}
        speed={speed}
        style={{ width: size, height: size }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
});
