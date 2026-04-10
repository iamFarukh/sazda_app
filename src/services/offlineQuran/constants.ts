/** Bump when on-disk layout or bundled edition set changes (triggers re-download guidance). */
export const OFFLINE_QURAN_VERSION = 2;

export const OFFLINE_EDITION_TEXT = 'quran-uthmani+en.sahih';
export const OFFLINE_EDITION_AUDIO = 'ar.alafasy';

export const OFFLINE_QURAN_ROOT_DIR = 'SazdaOfflineQuran';

/** Rough total for UI progress (Arabic + translation + audio URLs JSON; no audio files). */
export const ESTIMATED_FULL_OFFLINE_BYTES = 14 * 1024 * 1024;

const TOTAL_MUSHAF_AYAHS = 6236;

export function estimateSurahOfflineBytes(numberOfAyahs: number): number {
  return Math.max(
    1,
    Math.round((numberOfAyahs / TOTAL_MUSHAF_AYAHS) * ESTIMATED_FULL_OFFLINE_BYTES),
  );
}
