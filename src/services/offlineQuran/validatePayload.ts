import type { QuranApiSurah } from '../quranApi';
import type { SurahOfflinePayload } from './types';

export type SurahValidationResult = { ok: true } | { ok: false; reason: string };

/**
 * Ensures ayah count matches metadata and required text fields are present.
 */
export function validateSurahPayload(payload: SurahOfflinePayload): SurahValidationResult {
  const { surah, ayahs } = payload;
  if (!surah?.number || surah.number < 1 || surah.number > 114) {
    return { ok: false, reason: 'Invalid surah metadata' };
  }
  const expected = surah.numberOfAyahs;
  if (!expected || expected < 1) {
    return { ok: false, reason: 'Missing ayah count' };
  }
  if (!ayahs || ayahs.length !== expected) {
    return {
      ok: false,
      reason: `Ayah count mismatch (expected ${expected}, got ${ayahs?.length ?? 0})`,
    };
  }
  const seen = new Set<number>();
  for (const row of ayahs) {
    if (!row.arabic || !row.arabic.trim()) {
      return { ok: false, reason: `Empty Arabic at ayah ${row.numberInSurah}` };
    }
    if (row.numberInSurah < 1 || row.numberInSurah > expected) {
      return { ok: false, reason: `Invalid ayah index ${row.numberInSurah}` };
    }
    seen.add(row.numberInSurah);
  }
  if (seen.size !== expected) {
    return { ok: false, reason: 'Duplicate or missing ayah numbers' };
  }
  return { ok: true };
}

export function assertSurahMetaConsistent(surah: QuranApiSurah, payload: SurahOfflinePayload): boolean {
  return payload.surah.number === surah.number && payload.surah.numberOfAyahs === surah.numberOfAyahs;
}
