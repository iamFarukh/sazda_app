import { topVisibleSurah } from '../../src/services/quran/continuousReading';

// Minimal shape of SectionList ViewToken entries we rely on.
const tok = (surahNumber: number, ayah: number, isViewable = true) => ({
  isViewable,
  item: { numberInSurah: ayah },
  section: { surah: { number: surahNumber } },
});

describe('topVisibleSurah', () => {
  it('returns the surah + ayah of the first viewable item', () => {
    expect(topVisibleSurah([tok(2, 5), tok(2, 6)])).toEqual({ surahNumber: 2, ayahNumber: 5 });
  });
  it('skips non-viewable leading tokens', () => {
    expect(topVisibleSurah([tok(3, 1, false), tok(3, 2, true)])).toEqual({
      surahNumber: 3, ayahNumber: 2,
    });
  });
  it('returns null when nothing is viewable', () => {
    expect(topVisibleSurah([tok(2, 1, false)])).toBeNull();
    expect(topVisibleSurah([])).toBeNull();
  });
  it('returns null when the token lacks section/item data', () => {
    expect(topVisibleSurah([{ isViewable: true, item: null, section: null } as never])).toBeNull();
  });
});
