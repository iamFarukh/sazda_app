import { useMemo } from 'react';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { getDefaultStackScreenOptions } from './stackScreenOptions';
import { useThemePalette } from '../theme/useThemePalette';

export function useThemedStackScreenOptions(): NativeStackNavigationOptions {
  const { colors } = useThemePalette();
  return useMemo(() => getDefaultStackScreenOptions(colors), [colors]);
}
