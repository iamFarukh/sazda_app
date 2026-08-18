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
  | 'titleLarge'
  | 'titleSm'
  | 'body'
  | 'bodyMedium'
  | 'bodySmall'
  | 'subtitle'
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
  /** Respect the OS Dynamic Type setting (default true). */
  allowFontScaling?: boolean;
  /** Cap runaway scaling so layouts don't break at the largest accessibility sizes. */
  maxFontSizeMultiplier?: number;
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
  allowFontScaling = true,
  maxFontSizeMultiplier = 1.4,
}: Props) {
  const { colors: palette } = useThemePalette();
  const baseStyle = typography[variant];
  const resolvedColor = resolveColor(color, palette);

  return (
    <Text
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
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
