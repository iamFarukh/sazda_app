import { getReadingTheme, READING_THEMES } from '../../src/theme/readingThemes';

describe('reading themes', () => {
  it('exposes exactly light, sepia, dark', () => {
    expect(READING_THEMES).toEqual(['light', 'sepia', 'dark']);
  });

  it('returns a complete palette for every theme', () => {
    for (const t of READING_THEMES) {
      const p = getReadingTheme(t);
      for (const key of [
        'background', 'surface', 'text', 'textMuted', 'accent',
        'divider', 'ayahHighlight', 'ayahMarkerBg', 'ayahMarkerBorder',
        'ayahMarkerText',
      ] as const) {
        expect(typeof p[key]).toBe('string');
        expect(p[key].length).toBeGreaterThan(0);
      }
    }
  });

  it('falls back to light for an unknown theme', () => {
    // @ts-expect-error testing runtime fallback
    expect(getReadingTheme('nope')).toEqual(getReadingTheme('light'));
  });
});
