import type { ResolvedScheme } from './useThemePalette';

/** Translucent header / chrome — pairs with light cream vs dark emerald surfaces. */
export function headerGlassBackground(scheme: ResolvedScheme): string {
  return scheme === 'dark' ? 'rgba(12, 18, 16, 0.92)' : 'rgba(251, 251, 226, 0.8)';
}

/** Card “glass” variant tint */
export function cardGlassBackground(scheme: ResolvedScheme): string {
  return scheme === 'dark' ? 'rgba(19, 29, 26, 0.9)' : 'rgba(251, 251, 226, 0.8)';
}

/** Subtle focus ring on inputs — theme aware */
export function inputFocusBorder(p: { primary: string }, scheme: ResolvedScheme): string {
  return scheme === 'dark' ? 'rgba(142, 207, 178, 0.35)' : 'rgba(6, 78, 59, 0.2)';
}

/** Outer pill “halo” when the shared TextInput is focused (light sage / soft mint). */
export function inputFocusHaloOuter(scheme: ResolvedScheme): string {
  return scheme === 'dark' ? 'rgba(142, 207, 178, 0.42)' : 'rgba(6, 78, 59, 0.26)';
}

/** Elevated card shadow (RGB from brand green) */
export function elevatedCardShadow(scheme: ResolvedScheme): string {
  return scheme === 'dark' ? 'rgba(0, 0, 0, 0.45)' : 'rgba(6, 78, 59, 0.06)';
}
