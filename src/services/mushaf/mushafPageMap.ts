import mushafJson from '../../data/mushafPageStarts.json';
import { SURAH_AYAH_COUNTS } from '../../data/surahAyahCounts';

export type AyahRef = { surah: number; ayah: number };

export const MUSHAF_TOTAL_PAGES = 604;

const PAGE_STARTS = mushafJson.pageStarts as AyahRef[];

/** Sentinel: one past last ayah (114:6) — end-exclusive for page 604. */
const END_QURAN_EXCLUSIVE: AyahRef = { surah: 114, ayah: 7 };

export function assertPageMappingValid(): void {
  if (PAGE_STARTS.length !== MUSHAF_TOTAL_PAGES) {
    throw new Error(`Expected ${MUSHAF_TOTAL_PAGES} page starts, got ${PAGE_STARTS.length}`);
  }
  let total = 0;
  for (let p = 1; p <= MUSHAF_TOTAL_PAGES; p++) {
    total += countAyahsOnPage(p);
  }
  if (total !== 6236) {
    throw new Error(`Ayah sum across pages should be 6236, got ${total}`);
  }
}

function cmp(a: AyahRef, b: AyahRef): number {
  if (a.surah !== b.surah) return a.surah - b.surah;
  return a.ayah - b.ayah;
}

export function getPageStart(page: number): AyahRef {
  if (page < 1 || page > MUSHAF_TOTAL_PAGES) {
    throw new Error(`Page out of range: ${page}`);
  }
  return PAGE_STARTS[page - 1];
}

export function getPageEndExclusive(page: number): AyahRef {
  if (page < MUSHAF_TOTAL_PAGES) return PAGE_STARTS[page];
  return END_QURAN_EXCLUSIVE;
}

export function countAyahsOnPage(page: number): number {
  let n = 0;
  for (const _ of iterateAyahsOnPage(page)) {
    n += 1;
  }
  return n;
}

/** Inclusive start, exclusive end — same convention as Madinah page boundaries. */
export function* iterateAyahsOnPage(page: number): Generator<AyahRef> {
  const start = getPageStart(page);
  const endEx = getPageEndExclusive(page);
  let s = start.surah;
  let a = start.ayah;
  while (true) {
    if (cmp({ surah: s, ayah: a }, endEx) >= 0) return;
    yield { surah: s, ayah: a };
    const maxA = SURAH_AYAH_COUNTS[s - 1];
    if (a < maxA) {
      a += 1;
    } else {
      s += 1;
      a = 1;
      if (s > 114) return;
    }
  }
}

/**
 * Largest page P such that first ayah on P is at or before (surah, ayah).
 */
export function findPageForAyah(surah: number, ayah: number): number {
  const t: AyahRef = { surah, ayah };
  let lo = 1;
  let hi = MUSHAF_TOTAL_PAGES;
  let best = 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const st = getPageStart(mid);
    if (cmp(st, t) <= 0) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}
