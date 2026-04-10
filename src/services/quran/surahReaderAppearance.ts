import type { MushafTheme } from '../mushaf/mushafTheme';
import { getMushafPalette } from '../mushaf/mushafTheme';

/** Semantic colors for Surah reader (list mode), derived from mushaf-style themes. */
export type SurahReaderColors = {
  surface: string;
  primary: string;
  primaryContainer: string;
  onPrimary: string;
  onSurface: string;
  onSurfaceVariant: string;
  secondary: string;
  outline: string;
  outlineVariant: string;
  error: string;
  headerBorder: string;
  ayahSeparator: string;
};

export function getSurahReaderColors(theme: MushafTheme): SurahReaderColors {
  const p = getMushafPalette(theme);
  switch (theme) {
    case 'dark':
      return {
        surface: p.background,
        primary: p.text,
        primaryContainer: '#2b6954',
        onPrimary: '#f2f2d9',
        onSurface: p.text,
        onSurfaceVariant: p.textMuted,
        secondary: '#d4c48a',
        outline: '#7a9a8a',
        outlineVariant: '#4a5650',
        error: '#ffb4ab',
        headerBorder: 'rgba(149, 211, 186, 0.14)',
        ayahSeparator: 'rgba(255,255,255, 0.1)',
      };
    case 'sepia':
      return {
        surface: p.background,
        primary: p.text,
        primaryContainer: '#064e3b',
        onPrimary: '#ffffff',
        onSurface: p.text,
        onSurfaceVariant: p.textMuted,
        secondary: '#735c00',
        outline: '#6b5d4f',
        outlineVariant: '#a89888',
        error: '#ba1a1a',
        headerBorder: 'rgba(43, 24, 16, 0.1)',
        ayahSeparator: 'rgba(92, 74, 58, 0.28)',
      };
    case 'light':
    default:
      return {
        surface: p.background,
        primary: '#003527',
        primaryContainer: '#064e3b',
        onPrimary: '#ffffff',
        onSurface: '#1b1d0e',
        onSurfaceVariant: '#404944',
        secondary: '#735c00',
        outline: '#707974',
        outlineVariant: '#bfc9c3',
        error: '#ba1a1a',
        headerBorder: 'rgba(0, 53, 39, 0.08)',
        ayahSeparator: 'rgba(191, 201, 195, 0.35)',
      };
  }
}
