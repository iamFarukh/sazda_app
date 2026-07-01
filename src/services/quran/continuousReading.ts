import type { AyahReaderRow, QuranApiSurah } from '../quranApi';

/** Total surahs in the mushaf. */
export const LAST_SURAH_NUMBER = 114;

/**
 * Next surah number in the forward chain, or null when there is no next surah
 * (current is the last surah, or the input is not a valid surah number).
 */
export function nextSurahNumber(current: number): number | null {
  if (!Number.isInteger(current) || current < 1 || current >= LAST_SURAH_NUMBER) {
    return null;
  }
  return current + 1;
}

/** One loaded surah section in the continuous reader. */
export type ReaderSection = {
  /** Stable list key, e.g. "surah-2". */
  key: string;
  surah: QuranApiSurah;
  data: AyahReaderRow[];
};
