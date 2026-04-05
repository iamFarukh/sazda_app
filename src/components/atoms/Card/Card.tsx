import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { radius } from '../../../theme/radius';
import { spacing } from '../../../theme/spacing';
import { cardGlassBackground, elevatedCardShadow } from '../../../theme/themeSurfaces';
import { useThemePalette } from '../../../theme/useThemePalette';

export type CardVariant = 'flat' | 'elevated' | 'glass';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

type Props = {
  children: ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  borderRadius?: number;
};

export function Card({
  children,
  variant = 'flat',
  padding = 'md',
  borderRadius,
}: Props) {
  const { colors: c, scheme } = useThemePalette();

  const paddingStyle =
    padding === 'none'
      ? styles.p0
      : padding === 'sm'
        ? styles.pSm
        : padding === 'lg'
          ? styles.pLg
          : styles.pMd;

  const variantStyle = useMemo(() => {
    if (variant === 'elevated') {
      return {
        backgroundColor: c.surfaceContainerLowest,
        shadowColor: elevatedCardShadow(scheme),
        shadowOpacity: scheme === 'dark' ? 0.5 : 1,
        shadowRadius: 40,
        shadowOffset: { width: 0, height: 12 },
        elevation: scheme === 'dark' ? 8 : 6,
      };
    }
    if (variant === 'glass') {
      return { backgroundColor: cardGlassBackground(scheme) };
    }
    return { backgroundColor: c.surfaceContainerLow };
  }, [c.surfaceContainerLow, c.surfaceContainerLowest, scheme, variant]);

  return (
    <View
      style={[
        styles.base,
        { borderRadius: borderRadius ?? radius.xl },
        variantStyle,
        paddingStyle,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {},
  p0: { padding: 0 },
  pSm: { padding: spacing.sm },
  pMd: { padding: spacing.md },
  pLg: { padding: spacing.lg },
});
