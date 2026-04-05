/**
 * Typography (DESIGN.md)
 * - Manrope for editorial headlines / display
 * - Plus Jakarta Sans for body + labels
 * - Traditional Arabic for verses (`src/assets/fonts/`, linked on iOS + Android)
 */
export const fontFamilies = {
  headline: 'Manrope',
  body: 'Plus Jakarta Sans',
  arabic: 'Amiri',
} as const;

/**
 * With bundled Manrope / Plus Jakarta / Amiri (see `src/assets/fonts`), Android uses
 * real weight faces instead of synthesizing bold from regular — same numeric weights as iOS.
 */
export function platformFontWeight(
  weight: '400' | '500' | '600' | '700' | '800' | '900',
): '400' | '500' | '600' | '700' | '800' | '900' {
  return weight;
}

export const typography = {
  // Structural voice (DESIGN.md: display-lg = 3.5rem)
  displayLg: {
    fontFamily: fontFamilies.headline,
    fontSize: 56,
    fontWeight: platformFontWeight('800'),
    // -0.02em with a 16px base ~= -0.32px
    letterSpacing: -0.4,
  },
  headlineLarge: {
    fontFamily: fontFamilies.headline,
    fontSize: 32,
    fontWeight: platformFontWeight('800'),
    letterSpacing: -0.5,
  },
  headlineMedium: {
    fontFamily: fontFamilies.headline,
    fontSize: 20,
    fontWeight: platformFontWeight('700'),
    letterSpacing: -0.25,
  },
  titleSm: {
    fontFamily: fontFamilies.headline,
    fontSize: 14,
    fontWeight: platformFontWeight('700'),
  },

  // Functional voice
  body: {
    fontFamily: fontFamilies.body,
    fontSize: 16,
    fontWeight: platformFontWeight('400'),
  },
  bodyMedium: {
    fontFamily: fontFamilies.body,
    fontSize: 16,
    fontWeight: platformFontWeight('500'),
  },
  caption: {
    fontFamily: fontFamilies.body,
    fontSize: 12,
    fontWeight: platformFontWeight('500'),
  },
  label: {
    fontFamily: fontFamilies.body,
    fontSize: 10,
    fontWeight: platformFontWeight('600'),
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },

  // Sacred text: 20% larger than surrounding UI text
  verse: {
    fontFamily: fontFamilies.arabic,
    fontSize: 20, // 1.25 * 16px ~ 20px
    fontWeight: platformFontWeight('700'),
    lineHeight: 28,
  },
} as const;
