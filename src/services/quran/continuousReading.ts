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

/** Builds a keyed section from freshly-loaded surah reader data. */
export function buildSection(input: {
  surah: QuranApiSurah;
  ayahs: AyahReaderRow[];
}): ReaderSection {
  return { key: `surah-${input.surah.number}`, surah: input.surah, data: input.ayahs };
}

/**
 * Decides which surah (if any) to append next.
 * Returns the next surah number when: the highest loaded surah has a valid successor,
 * that successor is not already loaded, and no append is currently in flight.
 * Otherwise returns null.
 */
export function shouldAppendNext(
  loaded: Set<number>,
  maxLoaded: number,
  isAppending: boolean,
): number | null {
  if (isAppending) return null;
  const next = nextSurahNumber(maxLoaded);
  if (next == null) return null;
  if (loaded.has(next)) return null;
  return next;
}

/** Loosely-typed SectionList viewable-item token (only the fields we read). */
export type ReaderViewToken = {
  isViewable: boolean;
  item?: { numberInSurah?: number } | null;
  section?: { surah?: { number?: number } } | null;
};

/**
 * Derives the surah + ayah of the top-most viewable item — used for both the sticky
 * current-surah bar and last-read tracking. Returns null when nothing usable is visible.
 */
export function topVisibleSurah(
  tokens: ReaderViewToken[],
): { surahNumber: number; ayahNumber: number } | null {
  const first = tokens.find(t => t.isViewable);
  const surahNumber = first?.section?.surah?.number;
  const ayahNumber = first?.item?.numberInSurah;
  if (typeof surahNumber !== 'number' || typeof ayahNumber !== 'number') return null;
  return { surahNumber, ayahNumber };
}
