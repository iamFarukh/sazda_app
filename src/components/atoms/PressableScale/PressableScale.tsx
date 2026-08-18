import type { PressableProps, StyleProp, ViewStyle } from 'react-native';
import { Pressable } from 'react-native';
import Animated from 'react-native-reanimated';
import { usePressScale } from '../../../hooks/usePressScale';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style'> & {
  /** Static style for the pressable surface (the press scale is layered on top). */
  style?: StyleProp<ViewStyle>;
  /** Scale to shrink to while pressed. Default 0.97. */
  to?: number;
  /** Optional opacity dip while pressed (e.g. 0.9). Default 1 (scale carries feedback). */
  pressedOpacity?: number;
};

/**
 * A Pressable with a built-in spring press-scale (UI-thread, Reduce-Motion aware).
 * Drop-in replacement for Pressable where you want the standard Sazda press feel.
 * All Pressable props (onPress, accessibility*, hitSlop, disabled, …) pass through.
 */
export function PressableScale({
  style,
  to,
  pressedOpacity,
  disabled,
  onPressIn,
  onPressOut,
  children,
  ...rest
}: Props) {
  const press = usePressScale({ to, pressedOpacity, disabled: !!disabled });

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={e => {
        press.onPressIn();
        onPressIn?.(e);
      }}
      onPressOut={e => {
        press.onPressOut();
        onPressOut?.(e);
      }}
      style={[style, press.animatedStyle]}>
      {children}
    </AnimatedPressable>
  );
}
