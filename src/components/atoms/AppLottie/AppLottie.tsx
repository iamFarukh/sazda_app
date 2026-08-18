import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { View } from 'react-native';
import LottieView from 'lottie-react-native';
import type { AnimationObject } from 'lottie-react-native';
import { useReduceMotion } from '../../../hooks/useReduceMotion';

type Props = {
  /** require('...json') or a remote { uri }. When omitted, `fallback` renders instead. */
  source?: AnimationObject | { uri: string };
  size?: number;
  loop?: boolean;
  autoPlay?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Rendered when there's no source OR when Reduce Motion is on. Keep it meaningful. */
  fallback?: ReactNode;
};

/**
 * Lottie with guaranteed graceful degradation.
 *
 * - No `source` → renders `fallback` (lets screens ship now and light up once a
 *   licensed .json is dropped into src/assets/lottie/).
 * - Reduce Motion on → renders `fallback` if provided, else a paused first frame.
 *
 * This keeps Lottie a progressive enhancement: the UI is never blank if an asset is
 * missing or motion is disabled.
 */
export function AppLottie({
  source,
  size = 160,
  loop = true,
  autoPlay = true,
  style,
  fallback = null,
}: Props) {
  const reduced = useReduceMotion();

  if (!source || (reduced && fallback)) {
    return <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>{fallback}</View>;
  }

  return (
    <LottieView
      source={source}
      autoPlay={!reduced && autoPlay}
      loop={loop}
      style={[{ width: size, height: size }, style]}
    />
  );
}
