/**
 * Dark palette — warm emerald night, tuned for contrast with light mode unchanged.
 * Keys must stay aligned with `colors.ts` for `useThemePalette()`.
 */
export const colorsDark = {
  primary: '#92e2c8',
  primaryContainer: '#245648',
  secondary: '#e9c84a',
  secondaryContainer: '#453a1c',

  surface: '#050907',
  surfaceContainerLow: '#0c1613',
  surfaceContainer: '#162824',
  surfaceContainerHighest: '#243a34',
  surfaceContainerLowest: '#020403',

  onSurface: '#f0f6f3',
  onSurfaceVariant: '#aec9bd',
  onPrimary: '#051912',
  onPrimaryContainer: '#dff5ea',
  onSecondaryContainer: '#fff8e1',

  outlineVariant: '#4a6659',
  outline: '#809586',

  tertiary: '#d6c9a8',
  error: '#ffb4ab',
  white: '#ffffff',
  gold: '#f0cf5e',
} as const;

export type DarkColorName = keyof typeof colorsDark;
