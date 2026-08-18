import { useCallback } from 'react';
import {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { springs } from '../theme/motion';

type Options = {
  /** Scale to shrink to while pressed. Default 0.97 (subtle, never aggressive). */
  to?: number;
  /** Optional opacity dip while pressed. Default 1 (no dip — scale carries the feedback). */
  pressedOpacity?: number;
  /** Disable the interaction entirely (e.g. button disabled). */
  disabled?: boolean;
};

/**
 * Reusable spring press-scale for any Pressable-based component.
 *
 * Returns an `animatedStyle` to put on an `Animated.View` wrapping the content, plus
 * `onPressIn`/`onPressOut` to forward to the Pressable. Respects Reduce Motion (the
 * scale becomes a no-op; an optional opacity dip still provides feedback).
 *
 * Example:
 *   const press = usePressScale();
 *   <Pressable onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
 *     <Animated.View style={press.animatedStyle}>{children}</Animated.View>
 *   </Pressable>
 */
export function usePressScale(options: Options = {}) {
  const { to = 0.97, pressedOpacity = 1, disabled = false } = options;
  const reduced = useReducedMotion();
  const progress = useSharedValue(0); // 0 = rest, 1 = pressed

  const animatedStyle = useAnimatedStyle(() => {
    const scale = reduced ? 1 : 1 - progress.value * (1 - to);
    const opacity = 1 - progress.value * (1 - pressedOpacity);
    return { transform: [{ scale }], opacity };
  }, [reduced, to, pressedOpacity]);

  const onPressIn = useCallback(() => {
    if (disabled) return;
    progress.value = withSpring(1, springs.press);
  }, [disabled, progress]);

  const onPressOut = useCallback(() => {
    if (disabled) return;
    progress.value = withSpring(0, springs.press);
  }, [disabled, progress]);

  return { animatedStyle, onPressIn, onPressOut };
}
