export type MushafTheme = 'light' | 'sepia' | 'dark';

export type MushafThemePalette = {
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  accent: string;
  ayahMarkerBg: string;
  ayahMarkerBorder: string;
  ayahMarkerText: string;
  overlayBar: string;
  primaryChip: string;
  onPrimaryChip: string;
};

export function getMushafPalette(theme: MushafTheme): MushafThemePalette {
  switch (theme) {
    case 'sepia':
      return {
        background: '#f4ecd8',
        surface: '#ebe3cf',
        text: '#2b1810',
        textMuted: '#5c4a3a',
        accent: '#735c00',
        ayahMarkerBg: '#fffdf5',
        ayahMarkerBorder: '#735c00',
        ayahMarkerText: '#735c00',
        overlayBar: 'rgba(244, 236, 216, 0.92)',
        primaryChip: '#064e3b',
        onPrimaryChip: '#ffffff',
      };
    case 'dark':
      return {
        background: '#121612',
        surface: '#1a221c',
        text: '#e8edd9',
        textMuted: '#a3aea4',
        accent: '#95d3ba',
        ayahMarkerBg: '#1e2822',
        ayahMarkerBorder: '#95d3ba',
        ayahMarkerText: '#c9e4d8',
        overlayBar: 'rgba(18, 22, 18, 0.94)',
        primaryChip: '#2b6954',
        onPrimaryChip: '#f2f2d9',
      };
    case 'light':
    default:
      return {
        background: '#fbfbe2',
        surface: '#f5f5dc',
        text: '#003527',
        textMuted: '#404944',
        accent: '#735c00',
        ayahMarkerBg: '#ffffff',
        ayahMarkerBorder: '#735c00',
        ayahMarkerText: '#735c00',
        overlayBar: 'rgba(251, 251, 226, 0.92)',
        primaryChip: '#064e3b',
        onPrimaryChip: '#ffffff',
      };
  }
}
