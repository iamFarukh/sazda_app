import {
  buildSection,
  shouldAppendNext,
} from '../../src/services/quran/continuousReading';
import type { QuranApiSurah } from '../../src/services/quranApi';

const surah2: QuranApiSurah = {
  number: 2, name: 'البقرة', englishName: 'Al-Baqarah',
  englishNameTranslation: 'The Cow', numberOfAyahs: 2, revelationType: 'Medinan',
};

describe('buildSection', () => {
  it('wraps surah data into a keyed section', () => {
    const s = buildSection({
      surah: surah2,
      ayahs: [{ numberInSurah: 1, arabic: 'A1' }, { numberInSurah: 2, arabic: 'A2' }],
    });
    expect(s.key).toBe('surah-2');
    expect(s.surah.number).toBe(2);
    expect(s.data).toHaveLength(2);
  });
});

describe('shouldAppendNext', () => {
  it('returns the next surah number to append when not loaded and not appending', () => {
    expect(shouldAppendNext(new Set([1]), 1, false)).toBe(2);
  });
  it('returns null while an append is already in flight', () => {
    expect(shouldAppendNext(new Set([1]), 1, true)).toBeNull();
  });
  it('returns null when the next surah is already loaded', () => {
    expect(shouldAppendNext(new Set([1, 2]), 1, false)).toBeNull();
  });
  it('returns null past the last surah', () => {
    expect(shouldAppendNext(new Set([114]), 114, false)).toBeNull();
  });
});
