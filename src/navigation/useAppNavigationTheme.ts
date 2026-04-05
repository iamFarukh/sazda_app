import { useMemo } from 'react';
import { DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native';
import { useThemePalette } from '../theme/useThemePalette';

/**
 * React Navigation theme aligned with Sazda palette (light/dark).
 */
export function useAppNavigationTheme(): Theme {
  const { scheme, colors: c } = useThemePalette();

  return useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: c.primary,
        background: c.surface,
        card: c.surface,
        text: c.onSurface,
        border: c.outlineVariant,
        notification: c.secondaryContainer,
      },
    };
  }, [scheme, c]);
}
