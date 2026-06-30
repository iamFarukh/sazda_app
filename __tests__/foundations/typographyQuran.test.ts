import { fontFamilies, typography } from '../../src/theme/typography';

describe('quran typography', () => {
  it('exposes a dedicated quran font family', () => {
    expect(fontFamilies.quran).toBeDefined();
    expect(typeof fontFamilies.quran).toBe('string');
  });

  it('has a quranVerse variant larger than the incidental verse variant', () => {
    expect(typography.quranVerse.fontSize).toBeGreaterThanOrEqual(typography.verse.fontSize);
    expect(typography.quranVerse.fontFamily).toBeTruthy();
  });
});
