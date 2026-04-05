/**
 * Sazda design tokens (authoritative source: `sazda_spiritual/DESIGN.md`)
 * Keep names stable; components should rely on these tokens (not hex literals).
 */
export const colors = {
  // Core
  primary: '#003527', // Deep Emerald - Authority & Depth
  primaryContainer: '#064e3b', // Brand core
  secondary: '#735c00', // Gold - status & devotion
  secondaryContainer: '#fed65b', // Warm highlight

  // Surfaces (environmental light / tonal depth)
  surface: '#fbfbe2', // Soft Beige - paper base
  surfaceContainerLow: '#f5f5dc',
  /** Standard section background (Stitch / M3 `surface-container`) */
  surfaceContainer: '#efefd7',
  surfaceContainerHighest: '#e4e4cc',
  surfaceContainerLowest: '#ffffff',

  // Text colors
  onSurface: '#1b1d0e',
  onSurfaceVariant: '#404944',
  onPrimary: '#ffffff',
  /** Text on `primaryContainer` fills (buttons, chips) */
  onPrimaryContainer: '#ffffff',
  /** Text on gold / secondary fill */
  onSecondaryContainer: '#745c00',

  // Strokes / "ghost border" fallback (15% opacity is applied by components)
  outlineVariant: '#bfc9c3',
  outline: '#707974',

  // Optional extras (not explicitly defined in DESIGN.md, kept for compatibility)
  tertiary: '#3d2b13',
  error: '#ba1a1a',
  white: '#ffffff',
  gold: '#D4AF37',
} as const;

export type ColorName = keyof typeof colors;
