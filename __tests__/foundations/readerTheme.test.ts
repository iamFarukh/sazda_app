import { getReaderPalette } from '../../src/services/quran/readerTheme';
import { getReadingTheme } from '../../src/theme/readingThemes';

describe('getReaderPalette', () => {
  it('maps each reader theme to the canonical reading palette', () => {
    for (const t of ['light', 'sepia', 'dark'] as const) {
      expect(getReaderPalette(t)).toEqual(getReadingTheme(t));
    }
  });
  it('falls back to light for an undefined / unknown theme', () => {
    // @ts-expect-error runtime fallback
    expect(getReaderPalette(undefined)).toEqual(getReadingTheme('light'));
    // @ts-expect-error runtime fallback
    expect(getReaderPalette('nope')).toEqual(getReadingTheme('light'));
  });
});
