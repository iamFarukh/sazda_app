import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { radius } from '../../../theme/radius';
import { spacing } from '../../../theme/spacing';
import { cardGlassBackground } from '../../../theme/themeSurfaces';
import { elevation } from '../../../theme/elevation';
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
        ...elevation('lg', scheme),
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
