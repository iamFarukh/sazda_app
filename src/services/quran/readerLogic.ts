/** Standalone Bismillah is shown for all surahs except 9 (no Basmala) and 1 (Basmala is ayah 1). */
export function shouldShowBismillah(surahNumber: number): boolean {
  return surahNumber !== 9 && surahNumber !== 1;
}

export const MIN_FONT_SCALE = 0.85;
export const MAX_FONT_SCALE = 1.6;

/** Clamp the reader font-scale multiplier into the supported range. */
export function clampFontScale(n: number): number {
  return Math.min(MAX_FONT_SCALE, Math.max(MIN_FONT_SCALE, n));
}

/** True when the given surah/ayah is the one currently loaded in the audio store. */
export function isActiveAyah(
  surahNumber: number,
  ayahNumber: number,
  currentSurahNumber: number | null,
  currentAyahNumber: number | null,
): boolean {
  return currentSurahNumber === surahNumber && currentAyahNumber === ayahNumber;
}

export type ShareVerseInput = {
  arabic: string;
  translation?: string;
  surahEnglishName: string;
  surahNumber: number;
  ayahNumber: number;
};

/** Plain-text share payload for an ayah: Arabic, optional translation, then a reference line. */
export function buildShareText(v: ShareVerseInput): string {
  const ref = `— Surah ${v.surahEnglishName} ${v.surahNumber}:${v.ayahNumber}`;
  const parts = [v.arabic.trim()];
  if (v.translation && v.translation.trim().length > 0) {
    parts.push(`\n${v.translation.trim()}`);
  }
  parts.push(`\n${ref}`);
  return parts.join('\n');
}
