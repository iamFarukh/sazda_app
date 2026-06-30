import type { MushafTheme } from '../mushaf/mushafTheme';
import {
  getReadingTheme,
  type ReadingTheme,
  type ReadingThemePalette,
} from '../../theme/readingThemes';

const VALID: ReadingTheme[] = ['light', 'sepia', 'dark'];

/**
 * Maps the reader's persisted theme (`surahReaderTheme`, a MushafTheme) to the canonical
 * reading palette shared by Surah reader / Mushaf / Tafsir. Total + safe.
 */
export function getReaderPalette(theme: MushafTheme | undefined): ReadingThemePalette {
  const t = (theme && VALID.includes(theme as ReadingTheme) ? theme : 'light') as ReadingTheme;
  return getReadingTheme(t);
}
