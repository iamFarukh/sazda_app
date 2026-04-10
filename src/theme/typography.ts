import { Platform, TextStyle } from 'react-native';

/**
 * Typography (DESIGN.md)
 * - Manrope for editorial headlines / display
 * - Plus Jakarta Sans for body + labels
 * - Traditional Arabic for verses (`src/assets/fonts/`, linked on iOS + Android)
 */
export const fontFamilies = {
  headline: 'Manrope',
  body: 'PlusJakartaSans', // No spaces for PlusJakartaSans filename mapping
  arabic: 'Amiri',
} as const;

type WeightStr = '400' | '500' | '600' | '700' | '800' | '900';

/**
 * Android struggles with mapping standard weights if fonts are in legacy assets/fonts folder.
 * This exact maps to files like "Manrope-ExtraBold.ttf" on Android natively.
 */
export function getFontConfig(
  baseFamily: string,
  weight: WeightStr,
): Pick<TextStyle, 'fontFamily' | 'fontWeight'> {
  if (Platform.OS === 'ios') {
    // iOS interprets variations intelligently
    return { fontFamily: baseFamily === 'PlusJakartaSans' ? 'Plus Jakarta Sans' : baseFamily, fontWeight: weight };
  }

  // Android strict mapping to filenames (e.g., Manrope-Bold)
  let mappedWeight = weight;
  
  if (baseFamily === 'Amiri') {
    // Amiri only has Regular and Bold
    if (weight !== '400' && weight !== '700') {
      mappedWeight = (parseInt(weight, 10) >= 600 ? '700' : '400') as WeightStr;
    }
  }

  const weightMap: Record<WeightStr, string> = {
    '400': 'Regular',
    '500': 'Medium',
    '600': 'SemiBold',
    '700': 'Bold',
    '800': 'ExtraBold',
    '900': 'ExtraBold',
  };

  return {
    fontFamily: `${baseFamily}-${weightMap[mappedWeight]}`,
    fontWeight: undefined, // Use undefined so Android uses exact loaded font weights without artificial styling
  };
}

export const typography = {
  // Structural voice (DESIGN.md: display-lg = 3.5rem)
  displayLg: {
    ...getFontConfig(fontFamilies.headline, '800'),
    fontSize: 56,
    // -0.02em with a 16px base ~= -0.32px
    letterSpacing: -0.4,
  },
  headlineLarge: {
    ...getFontConfig(fontFamilies.headline, '800'),
    fontSize: 32,
    letterSpacing: -0.5,
  },
  headlineMedium: {
    ...getFontConfig(fontFamilies.headline, '700'),
    fontSize: 20,
    letterSpacing: -0.25,
  },
  titleSm: {
    ...getFontConfig(fontFamilies.headline, '700'),
    fontSize: 14,
  },

  // Functional voice
  body: {
    ...getFontConfig(fontFamilies.body, '400'),
    fontSize: 16,
  },
  bodyMedium: {
    ...getFontConfig(fontFamilies.body, '500'),
    fontSize: 16,
  },
  caption: {
    ...getFontConfig(fontFamilies.body, '500'),
    fontSize: 12,
  },
  label: {
    ...getFontConfig(fontFamilies.body, '600'),
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },

  // Sacred text: 20% larger than surrounding UI text
  verse: {
    ...getFontConfig(fontFamilies.arabic, '700'),
    fontSize: 20, // 1.25 * 16px ~ 20px
    lineHeight: 28,
  },
} as const;
