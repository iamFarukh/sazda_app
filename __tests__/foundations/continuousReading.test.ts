import { nextSurahNumber } from '../../src/services/quran/continuousReading';

describe('nextSurahNumber', () => {
  it('returns the following surah for ordinary numbers', () => {
    expect(nextSurahNumber(1)).toBe(2);
    expect(nextSurahNumber(113)).toBe(114);
  });
  it('returns null at and past the last surah (114)', () => {
    expect(nextSurahNumber(114)).toBeNull();
    expect(nextSurahNumber(200)).toBeNull();
  });
  it('returns null for invalid input', () => {
    expect(nextSurahNumber(0)).toBeNull();
    expect(nextSurahNumber(-3)).toBeNull();
    expect(nextSurahNumber(1.5)).toBeNull();
  });
});
