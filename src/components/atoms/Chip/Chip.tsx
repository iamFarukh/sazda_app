import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { radius } from '../../../theme/radius';
import { spacing } from '../../../theme/spacing';
import { useThemePalette } from '../../../theme/useThemePalette';
import { SazdaText } from '../SazdaText/SazdaText';

export type ChipVariant = 'filled' | 'outlined';

type Props = {
  label: ReactNode;
  selected?: boolean;
  variant?: ChipVariant;
  onPress?: () => void;
  disabled?: boolean;
};

export function Chip({
  label,
  selected,
  variant = 'filled',
  onPress,
  disabled,
}: Props) {
  const { colors: c } = useThemePalette();
  const isSelected = !!selected;
  const isDisabled = !!disabled || !onPress;

  const backgroundColor = isSelected
    ? c.primaryContainer
    : variant === 'outlined'
      ? 'transparent'
      : c.surfaceContainerHighest;

  const textColor = isSelected ? c.onPrimaryContainer : c.onSurfaceVariant;

  return (
    <Pressable
      disabled={isDisabled}
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor,
          borderColor: variant === 'outlined' ? c.outlineVariant : 'transparent',
          borderWidth: variant === 'outlined' ? 1 : 0,
        },
        isDisabled ? styles.disabled : null,
        pressed && !isDisabled ? styles.pressed : null,
      ]}>
      <SazdaText variant="label" color={textColor} align="center">
        {label}
      </SazdaText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.9,
  },
});
