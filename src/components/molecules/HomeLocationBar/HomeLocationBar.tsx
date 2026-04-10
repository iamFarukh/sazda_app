import { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { ChevronDown, MapPin } from 'lucide-react-native';
import { SazdaText } from '../../atoms/SazdaText/SazdaText';
import { radius } from '../../../theme/radius';
import { spacing } from '../../../theme/spacing';
import { fontFamilies, getFontConfig } from '../../../theme/typography';
import type { AppPalette } from '../../../theme/useThemePalette';
import type { ResolvedScheme } from '../../../theme/useThemePalette';
import { useThemePalette } from '../../../theme/useThemePalette';

type Props = {
  cityLabel: string;
  onPress: () => void;
  disabled?: boolean;
};

export function HomeLocationBar({ cityLabel, onPress, disabled }: Props) {
  const { colors: c, scheme } = useThemePalette();
  const styles = useMemo(() => createStyles(c, scheme), [c, scheme]);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={{ top: 10, bottom: 10, left: 4, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={`Location: ${cityLabel}. Open location settings`}
      style={({ pressed }) => [
        styles.wrap,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <MapPin size={18} color={c.primary} strokeWidth={2.2} />
      <SazdaText variant="titleSm" color="primary" style={styles.city} numberOfLines={1}>
        {cityLabel}
      </SazdaText>
      <ChevronDown size={16} color={c.primary} strokeWidth={2} style={styles.chevron} />
    </Pressable>
  );
}

function createStyles(c: AppPalette, _scheme: ResolvedScheme) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      marginTop: 0,
      marginBottom: 0,
      paddingVertical: 2,
      paddingLeft: 0,
      paddingRight: spacing.xs,
      marginLeft: 0,
      borderRadius: radius.md,
      backgroundColor: 'transparent',
      maxWidth: '100%',
    },
    pressed: {
      opacity: 0.88,
      backgroundColor: c.surfaceContainerHighest,
    },
    disabled: { opacity: 0.5 },
    city: {
      ...getFontConfig(fontFamilies.headline, '700'),
      fontSize: 18,
      lineHeight: 22,
      letterSpacing: -0.35,
      flexShrink: 1,
    },
    chevron: { opacity: 0.45, marginLeft: 2 },
  });
}
