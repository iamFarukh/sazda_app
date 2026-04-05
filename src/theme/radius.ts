/**
 * Roundedness scale (DESIGN.md)
 * - sm: 0.5rem (~8px)
 * - md: 1.5rem (~24px)
 * - xl: 3rem (~48px)
 */
export const radius = {
  sm: 8,
  md: 24,
  xl: 48,
  full: 9999,
} as const;

export type RadiusKey = keyof typeof radius;

