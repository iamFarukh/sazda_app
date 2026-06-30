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
