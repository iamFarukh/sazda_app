import { JUZ_START } from '../../data/juzBoundaries';
import { getPageStart, type AyahRef } from './mushafPageMap';

function cmp(a: AyahRef, b: AyahRef): number {
  if (a.surah !== b.surah) return a.surah - b.surah;
  return a.ayah - b.ayah;
}

/** Juz (1–30) containing the first ayah of this Mushaf page. */
export function juzForMushafPage(page: number): number {
  const key = getPageStart(page);
  for (let i = JUZ_START.length - 1; i >= 0; i--) {
    const j = JUZ_START[i];
    if (cmp({ surah: j.surah, ayah: j.ayah }, key) <= 0) {
      return j.juz;
    }
  }
  return 1;
}
