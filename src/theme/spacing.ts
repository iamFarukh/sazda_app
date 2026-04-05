export const spacing = {
  // Small base
  xxs: 4,

  // Material-ish rhythm (DESIGN.md references spacing-2/4/8/10)
  xs: 8, // spacing-2
  sm: 12,
  md: 16, // spacing-4
  lg: 24, // spacing-6 (used for many internal gaps)
  xl: 32, // spacing-8
  xxl: 40, // spacing-10 (editorial breathing room)

  // Extra headroom for "floating cards" / larger breathing room
  x3xl: 48, // spacing-12

  // Explicit aliases to match DESIGN.md wording
  spacing2: 8,
  spacing4: 16,
  spacing8: 32,
  spacing10: 40,
} as const;

export type SpacingKey = keyof typeof spacing;
