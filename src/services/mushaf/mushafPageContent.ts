import type { AyahReaderRow } from '../quranApi';
import { loadSurahReaderDataOfflineFirst } from '../offlineQuran/reader';
import { iterateAyahsOnPage, type AyahRef } from './mushafPageMap';

export type MushafAyahLine = {
  ref: AyahRef;
  arabic: string;
  translation?: string;
};

export type MushafPagePayload = {
  page: number;
  primarySurah: number;
  /** Surah metadata for header (first surah on page). */
  surahEnglishName: string;
  surahTranslation: string;
  ayahs: MushafAyahLine[];
};

const pagePayloadCache = new Map<number, Promise<MushafPagePayload>>();
const MAX_CACHE = 8;

export function clearMushafPagePayloadCache(): void {
  pagePayloadCache.clear();
}

export async function loadMushafPagePayload(page: number): Promise<MushafPagePayload> {
  const hit = pagePayloadCache.get(page);
  if (hit) return hit;

  const promise = (async () => {
    const refs: AyahRef[] = [];
    for (const r of iterateAyahsOnPage(page)) refs.push(r);

    const uniqueSurahs = [...new Set(refs.map(r => r.surah))].sort((a, b) => a - b);
    const bySurah = new Map<number, Map<number, AyahReaderRow>>();

    let headerMeta: { englishName: string; translation: string } = {
      englishName: '',
      translation: '',
    };

    await Promise.all(
      uniqueSurahs.map(async sn => {
        const data = await loadSurahReaderDataOfflineFirst(sn);
        const m = new Map<number, AyahReaderRow>();
        data.ayahs.forEach(row => m.set(row.numberInSurah, row));
        bySurah.set(sn, m);
        if (sn === refs[0]?.surah) {
          headerMeta = {
            englishName: data.surah.englishName,
            translation: data.surah.englishNameTranslation,
          };
        }
      }),
    );

    const ayahs: MushafAyahLine[] = [];
    for (const ref of refs) {
      const m = bySurah.get(ref.surah);
      const row = m?.get(ref.ayah);
      if (!row) {
        throw new Error(`Missing ayah data for ${ref.surah}:${ref.ayah}`);
      }
      ayahs.push({
        ref,
        arabic: row.arabic,
        translation: row.translation,
      });
    }

    const primarySurah = refs[0]?.surah ?? 1;
    return {
      page,
      primarySurah,
      surahEnglishName: headerMeta.englishName,
      surahTranslation: headerMeta.translation,
      ayahs,
    };
  })();

  pagePayloadCache.set(page, promise);
  while (pagePayloadCache.size > MAX_CACHE) {
    const first = pagePayloadCache.keys().next().value as number;
    pagePayloadCache.delete(first);
  }

  return promise;
}

export function prefetchMushafPages(pages: number[]): void {
  for (const n of pages) {
    if (n >= 1 && n <= 604) void loadMushafPagePayload(n).catch(() => {});
  }
}
