import type { AyahReaderRow, QuranApiSurah } from '../quranApi';

type Entry = {
  surah: QuranApiSurah;
  ayahs: AyahReaderRow[];
};

const MAX = 5;
const map = new Map<number, Entry>();

export function getCachedSurahReader(surahNumber: number): Entry | null {
  return map.get(surahNumber) ?? null;
}

export function setCachedSurahReader(
  surahNumber: number,
  data: Entry,
): void {
  if (map.has(surahNumber)) {
    map.delete(surahNumber);
  }
  map.set(surahNumber, data);
  while (map.size > MAX) {
    const first = map.keys().next().value as number | undefined;
    if (first === undefined) break;
    map.delete(first);
  }
}

export function clearSurahReaderMemoryCache(): void {
  map.clear();
}
