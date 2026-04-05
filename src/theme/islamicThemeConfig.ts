import { colors as baseLight } from './colors';
import { colorsDark as baseDark } from './colorsDark';

export type AppMode = 'default' | 'jummah' | 'ramadan' | 'ramadan_jummah';

export interface SplashConfig {
  backgroundColor: string;
  gradient: string[];
  message: string;
  logoTint?: string;
}

export interface ThemeModeConfig {
  mode: AppMode;
  paletteLight: Record<keyof typeof baseLight, string>;
  paletteDark: Record<keyof typeof baseDark, string>;
  splash: SplashConfig;
}

// Subtle gold tint for Jummah
const jummahLight = { ...baseLight, secondary: '#A67C00', secondaryContainer: '#FFE082' };
const jummahDark = { ...baseDark, secondary: '#FFD54F', secondaryContainer: '#594300' };

// We will NOT force deep-night mode because it destroys the contrast (primary was too dark).
// We'll use the beautifully tuned baseDark as the standard.
const ramadanDark = { ...baseDark };
const ramadanLight = { ...baseLight };

export const islamicThemeConfig: Record<AppMode, ThemeModeConfig> = {
  default: {
    mode: 'default',
    paletteLight: baseLight,
    paletteDark: baseDark,
    splash: {
      backgroundColor: '#003527',
      gradient: ['#003527', '#00221A'],
      message: 'Connect. Reflect. Grow.',
    },
  },
  jummah: {
    mode: 'jummah',
    paletteLight: jummahLight,
    paletteDark: jummahDark,
    splash: {
      backgroundColor: '#004231',
      gradient: ['#004231', '#002B20'],
      message: 'Jummah Mubarak',
      logoTint: '#D4AF37', // Gold hint
    },
  },
  ramadan: {
    mode: 'ramadan',
    // Do not force dark mode on light mode users! Light theme is perfect.
    paletteLight: ramadanLight,
    paletteDark: ramadanDark,
    splash: {
      backgroundColor: '#050A08',
      gradient: ['#050A08', '#020403'],
      message: 'Ramadan Kareem',
    },
  },
  ramadan_jummah: {
    mode: 'ramadan_jummah',
    paletteLight: jummahLight,
    paletteDark: jummahDark,
    splash: {
      backgroundColor: '#0A0C0B',
      gradient: ['#1A170A', '#050605'], // Subtle dark gold to pure dark
      message: 'Ramadan Jummah Mubarak',
      logoTint: '#D4AF37', 
    },
  },
};

/** Approximate Gregorian Start/End dates for Ramadan to guarantee 0ms local offline resolution */
export const PRECOMPUTED_RAMADAN_DATES = [
  { year: 2024, start: '2024-03-11', end: '2024-04-09' },
  { year: 2025, start: '2025-02-28', end: '2025-03-29' },
  { year: 2026, start: '2026-02-17', end: '2026-03-18' },
  { year: 2027, start: '2027-02-07', end: '2027-03-08' },
  { year: 2028, start: '2028-01-27', end: '2028-02-25' },
  { year: 2029, start: '2029-01-15', end: '2029-02-13' },
  { year: 2030, start: '2030-01-04', end: '2030-02-02' },
  { year: 2030, start: '2030-12-25', end: '2031-01-23' },
  { year: 2031, start: '2031-12-14', end: '2032-01-12' },
];

export function checkIsRamadanLocal(date: Date): boolean {
  const time = date.getTime();
  for (const block of PRECOMPUTED_RAMADAN_DATES) {
    const start = new Date(block.start + 'T00:00:00').getTime();
    const end = new Date(block.end + 'T23:59:59').getTime();
    if (time >= start && time <= end) return true;
  }
  return false;
}

export function resolveIslamicMode(date: Date): AppMode {
  const isJummah = date.getDay() === 5;
  const isRamadan = checkIsRamadanLocal(date);

  if (isRamadan && isJummah) return 'ramadan_jummah';
  if (isRamadan) return 'ramadan';
  if (isJummah) return 'jummah';
  return 'default';
}
