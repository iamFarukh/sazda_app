import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import type { AppPalette } from '../../../theme/useThemePalette';
import { useThemePalette } from '../../../theme/useThemePalette';

type Props = {
  name: string;
  size?: number;
  fill?: 0 | 1;
  color?: keyof AppPalette | string;
  children?: ReactNode;
};

function resolveIconColor(
  color: keyof AppPalette | string | undefined,
  palette: AppPalette,
): string {
  if (color && typeof color === 'string' && color in palette) {
    return palette[color as keyof AppPalette] as string;
  }
  if (typeof color === 'string') {
    return color;
  }
  return palette.onSurface;
}

export function SazdaIcon({
  name,
  size = 24,
  fill = 0,
  color,
}: Props) {
  const { colors: palette } = useThemePalette();
  const resolvedColor = resolveIconColor(color, palette);

  return (
    <MaterialIcons
      name={name as never}
      size={size}
      color={resolvedColor}
      style={[
        styles.icon,
        fill === 1 ? styles.fillActive : styles.fillInactive,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  icon: { includeFontPadding: false },
  fillActive: { opacity: 1 },
  fillInactive: { opacity: 1 },
});
