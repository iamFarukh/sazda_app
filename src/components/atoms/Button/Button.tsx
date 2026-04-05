import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useThemePalette } from '../../../theme/useThemePalette';
import { spacing } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';
import { hapticMedium } from '../../../utils/appHaptics';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary';
export type ButtonSize = 'md' | 'lg';

type Props = {
  title: ReactNode;
  onPress?: () => void;
  variant: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
};

export function Button({
  title,
  onPress,
  variant,
  size = 'md',
  disabled,
}: Props) {
  const { colors: c } = useThemePalette();
  const isDisabled = disabled || !onPress;

  const dynamic = useMemo(() => {
    const primaryBg = { backgroundColor: c.primaryContainer };
    const secondaryBg = { backgroundColor: c.secondaryContainer };
    const primaryText = { color: c.onPrimaryContainer };
    const secondaryText = { color: c.onSecondaryContainer };
    const tertiaryText = { color: c.primary };
    return { primaryBg, secondaryBg, primaryText, secondaryText, tertiaryText };
  }, [c]);

  const sizeStyle =
    size === 'lg'
      ? styles.sizeLg
      : styles.sizeMd;

  const textStyle =
    variant === 'tertiary' ? typography.titleSm : typography.bodyMedium;

  return (
    <Pressable
      onPress={
        isDisabled
          ? undefined
          : () => {
              hapticMedium();
              onPress?.();
            }
      }
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        variant === 'primary'
          ? dynamic.primaryBg
          : variant === 'secondary'
            ? dynamic.secondaryBg
            : styles.tertiary,
        sizeStyle,
        isDisabled ? styles.disabled : null,
        pressed && !isDisabled ? styles.pressed : null,
      ]}>
      <Text
        style={[
          textStyle,
          variant === 'primary'
            ? dynamic.primaryText
            : variant === 'secondary'
              ? dynamic.secondaryText
              : dynamic.tertiaryText,
        ]}>
        {title}
      </Text>
    </Pressable>
  );
}

const pillRadius = 9999;

const styles = StyleSheet.create({
  base: {
    borderRadius: pillRadius,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  sizeMd: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    minHeight: 44,
  },
  sizeLg: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minHeight: 52,
  },
  tertiary: {
    backgroundColor: 'transparent',
    paddingHorizontal: spacing.md,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
});
