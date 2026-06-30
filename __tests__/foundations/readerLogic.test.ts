import { shouldShowBismillah, clampFontScale } from '../../src/services/quran/readerLogic';

describe('shouldShowBismillah', () => {
  it('is false for At-Tawbah (9) and Al-Fatiha (1)', () => {
    expect(shouldShowBismillah(9)).toBe(false);
    expect(shouldShowBismillah(1)).toBe(false);
  });
  it('is true for ordinary surahs', () => {
    expect(shouldShowBismillah(2)).toBe(true);
    expect(shouldShowBismillah(114)).toBe(true);
  });
});

describe('clampFontScale', () => {
  it('clamps into [0.85, 1.6]', () => {
    expect(clampFontScale(0.5)).toBeCloseTo(0.85);
    expect(clampFontScale(2)).toBeCloseTo(1.6);
    expect(clampFontScale(1.1)).toBeCloseTo(1.1);
  });
});
