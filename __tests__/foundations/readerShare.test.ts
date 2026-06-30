import { isActiveAyah, buildShareText } from '../../src/services/quran/readerLogic';

describe('isActiveAyah', () => {
  it('matches only when both surah and ayah equal the playing pair', () => {
    expect(isActiveAyah(2, 5, 2, 5)).toBe(true);
    expect(isActiveAyah(2, 5, 2, 6)).toBe(false);
    expect(isActiveAyah(2, 5, 3, 5)).toBe(false);
    expect(isActiveAyah(2, 5, null, null)).toBe(false);
  });
});

describe('buildShareText', () => {
  it('includes arabic, translation, and a reference line', () => {
    const txt = buildShareText({ arabic: 'ARABIC', translation: 'In the name of God', surahEnglishName: 'Al-Baqarah', surahNumber: 2, ayahNumber: 255 });
    expect(txt).toContain('ARABIC');
    expect(txt).toContain('In the name of God');
    expect(txt).toContain('Al-Baqarah 2:255');
  });
  it('omits the translation block when none is provided', () => {
    const txt = buildShareText({ arabic: 'ARABIC', surahEnglishName: 'Al-Ikhlas', surahNumber: 112, ayahNumber: 1 });
    expect(txt).toContain('ARABIC');
    expect(txt).toContain('Al-Ikhlas 112:1');
    expect(txt).not.toMatch(/undefined/);
  });
});
