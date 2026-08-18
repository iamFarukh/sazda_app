import { Platform } from 'react-native';
import type { ViewStyle } from 'react-native';
import type { ResolvedScheme } from './useThemePalette';

/**
 * Elevation scale — one consistent depth system instead of ad-hoc shadows.
 *
 * Light mode uses a brand-tinted (emerald) shadow so cards feel warm rather than grey;
 * dark mode uses true black for honest depth. Android maps each level to a native
 * `elevation` value; iOS uses the shadow* fields.
 *
 * Levels:
 *  - none : flush surfaces
 *  - sm   : resting cards, list rows, chips
 *  - md   : interactive / raised cards
 *  - lg   : floating elements (hero, FAB, sticky bars)
 *  - xl   : overlays, modals, sheets
 */
export type ElevationLevel = 'none' | 'sm' | 'md' | 'lg' | 'xl';

type ShadowSpec = {
  radius: number;
  offsetY: number;
  opacityLight: number;
  opacityDark: number;
  android: number;
};

const SPECS: Record<Exclude<ElevationLevel, 'none'>, ShadowSpec> = {
  sm: { radius: 10, offsetY: 2, opacityLight: 0.06, opacityDark: 0.3, android: 2 },
  md: { radius: 18, offsetY: 6, opacityLight: 0.1, opacityDark: 0.42, android: 5 },
  lg: { radius: 28, offsetY: 12, opacityLight: 0.14, opacityDark: 0.5, android: 9 },
  xl: { radius: 40, offsetY: 18, opacityLight: 0.18, opacityDark: 0.6, android: 14 },
};

function shadowColor(scheme: ResolvedScheme): string {
  return scheme === 'dark' ? '#000000' : 'rgb(6, 78, 59)';
}

/**
 * Returns a ready-to-spread shadow style for the given level + theme.
 * Usage: `style={[styles.card, elevation('md', scheme)]}`
 */
export function elevation(level: ElevationLevel, scheme: ResolvedScheme): ViewStyle {
  if (level === 'none') {
    return Platform.OS === 'android'
      ? { elevation: 0 }
      : { shadowOpacity: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 } };
  }
  const spec = SPECS[level];
  if (Platform.OS === 'android') {
    return { elevation: spec.android, shadowColor: shadowColor(scheme) };
  }
  return {
    shadowColor: shadowColor(scheme),
    shadowOpacity: scheme === 'dark' ? spec.opacityDark : spec.opacityLight,
    shadowRadius: spec.radius,
    shadowOffset: { width: 0, height: spec.offsetY },
  };
}
