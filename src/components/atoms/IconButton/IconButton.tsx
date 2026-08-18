import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { radius } from '../../../theme/radius';
import { useThemePalette } from '../../../theme/useThemePalette';
import { hapticMedium } from '../../../utils/appHaptics';
import { PressableScale } from '../PressableScale/PressableScale';

export type IconButtonVariant = 'ghost' | 'soft' | 'solid';
export type IconButtonSize = 'sm' | 'md' | 'lg';

type Props = {
  icon: ReactNode;
  onPress?: () => void;
  accessibilityLabel: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  disabled?: boolean;
};

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  variant = 'ghost',
  size = 'md',
  disabled,
}: Props) {
  const { colors: c } = useThemePalette();
  const isDisabled = disabled || !onPress;

  const sizeStyle =
    size === 'lg'
      ? styles.sizeLg
      : size === 'sm'
        ? styles.sizeSm
        : styles.sizeMd;

  const variantBg =
    variant === 'solid'
      ? { backgroundColor: c.primaryContainer }
      : variant === 'soft'
        ? { backgroundColor: c.surfaceContainerLow }
        : { backgroundColor: 'transparent' };

  return (
    <PressableScale
      disabled={isDisabled}
      onPress={
        isDisabled
          ? undefined
          : () => {
              hapticMedium();
              onPress?.();
            }
      }
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isDisabled }}
      hitSlop={8}
      to={0.92}
      style={[styles.base, variantBg, sizeStyle, isDisabled ? styles.disabled : null]}>
      <View>{icon}</View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeSm: { width: 32, height: 32 },
  sizeMd: { width: 40, height: 40 },
  sizeLg: { width: 48, height: 48 },
  disabled: { opacity: 0.55 },
});
