import { getReaderPalette } from '../../src/services/quran/readerTheme';
import { getReadingTheme } from '../../src/theme/readingThemes';

describe('getReaderPalette', () => {
  it('maps each reader theme to the canonical reading palette', () => {
    for (const t of ['light', 'sepia', 'dark'] as const) {
      expect(getReaderPalette(t)).toEqual(getReadingTheme(t));
    }
  });
  it('falls back to light for an undefined / unknown theme', () => {
    // undefined is a valid argument (MushafTheme | undefined) and hits the fallback.
    expect(getReaderPalette(undefined)).toEqual(getReadingTheme('light'));
    // @ts-expect-error runtime fallback for an out-of-type value
    expect(getReaderPalette('nope')).toEqual(getReadingTheme('light'));
  });
});
