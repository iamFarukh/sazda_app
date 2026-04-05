import { useColorScheme } from 'react-native';
import { useMemo } from 'react';
import { useThemeStore } from '../store/themeStore';
import { useIslamicContext } from '../context/useIslamicContext';
import type { colors } from './colors';

export type ResolvedScheme = 'light' | 'dark';
export type AppPalette = Record<keyof typeof colors, string>;

export function useThemePalette() {
  const preference = useThemeStore(s => s.preference);
  const system = useColorScheme();
  const islamicConfig = useIslamicContext(s => s.config);

  const scheme: ResolvedScheme = useMemo(() => {
    if (preference === 'system') {
      return system === 'dark' ? 'dark' : 'light';
    }
    return preference as ResolvedScheme;
  }, [preference, system]);

  const active = useMemo(
    () => (scheme === 'dark' ? islamicConfig.paletteDark : islamicConfig.paletteLight),
    [scheme, islamicConfig],
  );

  return { scheme, colors: active };
}

