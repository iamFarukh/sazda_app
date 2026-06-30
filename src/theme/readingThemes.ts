/**
 * Unified reading palettes shared by the Surah reader, Mushaf, and Tafsir.
 * Single source of truth for reading-surface colors so all three modes feel identical.
 */
export const READING_THEMES = ['light', 'sepia', 'dark'] as const;
export type ReadingTheme = (typeof READING_THEMES)[number];

export type ReadingThemePalette = {
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  accent: string;
  divider: string;
  /** Soft fill behind the currently-playing / focused ayah. */
  ayahHighlight: string;
  ayahMarkerBg: string;
  ayahMarkerBorder: string;
  ayahMarkerText: string;
};

const PALETTES: Record<ReadingTheme, ReadingThemePalette> = {
  light: {
    background: '#fbfbe2',
    surface: '#f5f5dc',
    text: '#003527',
    textMuted: '#404944',
    accent: '#735c00',
    divider: 'rgba(0,53,39,0.10)',
    ayahHighlight: 'rgba(254,214,91,0.18)',
    ayahMarkerBg: '#ffffff',
    ayahMarkerBorder: '#735c00',
    ayahMarkerText: '#735c00',
  },
  sepia: {
    background: '#f4ecd8',
    surface: '#ebe3cf',
    text: '#2b1810',
    textMuted: '#5c4a3a',
    accent: '#735c00',
    divider: 'rgba(43,24,16,0.12)',
    ayahHighlight: 'rgba(115,92,0,0.16)',
    ayahMarkerBg: '#fffdf5',
    ayahMarkerBorder: '#735c00',
    ayahMarkerText: '#735c00',
  },
  dark: {
    background: '#121612',
    surface: '#1a221c',
    text: '#e8edd9',
    textMuted: '#a3aea4',
    accent: '#95d3ba',
    divider: 'rgba(232,237,217,0.12)',
    ayahHighlight: 'rgba(149,211,186,0.16)',
    ayahMarkerBg: '#1e2822',
    ayahMarkerBorder: '#95d3ba',
    ayahMarkerText: '#c9e4d8',
  },
};

export function getReadingTheme(theme: ReadingTheme): ReadingThemePalette {
  return PALETTES[theme] ?? PALETTES.light;
}
