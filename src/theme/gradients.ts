import type { ResolvedScheme } from './useThemePalette';

/** A linear/radial gradient stop set. `locations` (0..1) optional; defaults to even spacing. */
export type GradientStops = {
  colors: string[];
  locations?: number[];
};

/** Soft emerald ambient glow used behind reading surfaces (low opacity in use). */
const ambientGlowLight: GradientStops = {
  colors: ['rgba(6,78,59,0.10)', 'rgba(6,78,59,0.03)', 'rgba(251,251,226,0)'],
  locations: [0, 0.45, 1],
};
const ambientGlowDark: GradientStops = {
  colors: ['rgba(149,211,186,0.10)', 'rgba(18,22,18,0.04)', 'rgba(18,22,18,0)'],
  locations: [0, 0.45, 1],
};

/** Gold sheen for sacred accents / progress arcs. */
export const goldSheen: GradientStops = {
  colors: ['#fed65b', '#d4af37'],
  locations: [0, 1],
};

export function getAmbientGradient(scheme: ResolvedScheme): GradientStops {
  return scheme === 'dark' ? ambientGlowDark : ambientGlowLight;
}
