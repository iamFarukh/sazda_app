import type { ReactNode } from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import { Text, StyleSheet } from 'react-native';
import { typography } from '../../../theme/typography';
import type { AppPalette } from '../../../theme/useThemePalette';
import { useThemePalette } from '../../../theme/useThemePalette';

type TextVariant =
  | 'displayLg'
  | 'headlineLarge'
  | 'headlineMedium'
  | 'titleSm'
  | 'body'
  | 'bodyMedium'
  | 'caption'
  | 'label'
  | 'verse';

type Props = {
  children: ReactNode;
  variant: TextVariant;
  /**
   * Palette token name or raw hex/rgba string.
   */
  color?: keyof AppPalette | string;
  align?: 'left' | 'right' | 'center' | 'justify';
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
  rtl?: boolean;
};

function resolveColor(color: keyof AppPalette | string | undefined, palette: AppPalette): string {
  if (color && typeof color === 'string' && color in palette) {
    return palette[color as keyof AppPalette] as string;
  }
  if (typeof color === 'string') {
    return color;
  }
  return palette.onSurface;
}

export function SazdaText({
  children,
  variant,
  color,
  align,
  numberOfLines,
  rtl,
  style,
}: Props) {
  const { colors: palette } = useThemePalette();
  const baseStyle = typography[variant];
  const resolvedColor = resolveColor(color, palette);

  return (
    <Text
      style={[
        baseStyle,
        styles.text,
        { color: resolvedColor },
        align ? { textAlign: align } : null,
        rtl ? ({ writingDirection: 'rtl' } as object) : null,
        style,
      ]}
      numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    includeFontPadding: false,
  },
});
