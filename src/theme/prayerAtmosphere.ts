import type { PrayerHeroPeriod } from '../utils/prayerSchedule';

/**
 * Period-aware "sky" system for the home prayer card.
 *
 * The card always renders light text, so every sky lives in a darker, saturated family
 * (even midday is a rich teal, never white) — this guarantees contrast while the *mood*
 * comes from hue, not brightness. A readability scrim (top + bottom) sits above the sky.
 *
 * Each period resolves to one of a small set of cohesive "moods" so the three card states
 * (standard / between-prayers / makruh) all share one visual language.
 */

export type AtmosphereAccent = 'stars' | 'particles' | 'rays' | 'embers' | null;

export type SkyStop = {
  /** Hex color. */
  color: string;
  /** 0 (top) → 1 (bottom). */
  offset: number;
};

/** Sun / moon orb, positioned in fractional card coords (0..1). */
export type AtmosphereOrb = {
  color: string;
  /** Soft halo color (rgba string ok). */
  glow: string;
  /** Center X as fraction of width. */
  cx: number;
  /** Center Y as fraction of height. */
  cy: number;
  /** Radius as fraction of width. */
  r: number;
};

export type PrayerAtmosphere = {
  /** Stable identity used to key crossfades — same mood → no transition. */
  mood: AtmosphereMood;
  skyStops: SkyStop[];
  orb: AtmosphereOrb | null;
  accent: AtmosphereAccent;
  /** 0..1 multiplier applied to the (already subtle) Lottie accent. */
  accentOpacity: number;
  /** Top scrim darkness 0..1 (protects kicker / streak). */
  scrimTop: number;
  /** Bottom scrim darkness 0..1 (protects footnotes over bright horizons). */
  scrimBottom: number;
  /** Gold accent used for time + countdown highlight on this sky. */
  highlight: string;
};

export type AtmosphereMood =
  | 'night'
  | 'fajr'
  | 'sunrise'
  | 'dhuhr'
  | 'asr'
  | 'maghrib'
  | 'isha';

const GOLD = '#ffd86b';
const GOLD_WARM = '#ffe08a';

const MOODS: Record<AtmosphereMood, PrayerAtmosphere> = {
  night: {
    mood: 'night',
    skyStops: [
      { color: '#123b4a', offset: 0 },
      { color: '#0c2233', offset: 0.45 },
      { color: '#06121f', offset: 1 },
    ],
    orb: { color: '#cfeaff', glow: 'rgba(150,210,255,0.45)', cx: 0.74, cy: 0.18, r: 0.16 },
    accent: 'stars',
    accentOpacity: 0.9,
    scrimTop: 0.28,
    scrimBottom: 0.46,
    highlight: GOLD,
  },
  fajr: {
    mood: 'fajr',
    skyStops: [
      { color: '#2a2b54', offset: 0 },
      { color: '#5b3b6e', offset: 0.42 },
      { color: '#b9617a', offset: 0.74 },
      { color: '#e7a988', offset: 1 },
    ],
    orb: { color: '#ffd9b0', glow: 'rgba(255,180,140,0.5)', cx: 0.5, cy: 0.82, r: 0.2 },
    accent: 'stars',
    accentOpacity: 0.55,
    scrimTop: 0.26,
    scrimBottom: 0.4,
    highlight: GOLD_WARM,
  },
  sunrise: {
    mood: 'sunrise',
    skyStops: [
      { color: '#3f6f93', offset: 0 },
      { color: '#c98f4a', offset: 0.55 },
      { color: '#e6b25c', offset: 1 },
    ],
    orb: { color: '#fff2c2', glow: 'rgba(255,225,150,0.7)', cx: 0.5, cy: 0.7, r: 0.24 },
    accent: 'rays',
    accentOpacity: 0.85,
    scrimTop: 0.3,
    scrimBottom: 0.5,
    highlight: '#fff0c0',
  },
  dhuhr: {
    mood: 'dhuhr',
    skyStops: [
      { color: '#0f6f60', offset: 0 },
      { color: '#1f8a78', offset: 0.5 },
      { color: '#48b39a', offset: 1 },
    ],
    orb: { color: '#fffbe6', glow: 'rgba(255,255,220,0.55)', cx: 0.78, cy: 0.18, r: 0.18 },
    accent: 'rays',
    accentOpacity: 0.7,
    scrimTop: 0.3,
    scrimBottom: 0.5,
    highlight: GOLD,
  },
  asr: {
    mood: 'asr',
    skyStops: [
      { color: '#2f7d6b', offset: 0 },
      { color: '#b08a3e', offset: 0.66 },
      { color: '#d4ac5f', offset: 1 },
    ],
    orb: { color: '#ffe7b0', glow: 'rgba(255,210,130,0.55)', cx: 0.24, cy: 0.24, r: 0.17 },
    accent: 'particles',
    accentOpacity: 0.8,
    scrimTop: 0.3,
    scrimBottom: 0.5,
    highlight: GOLD_WARM,
  },
  maghrib: {
    mood: 'maghrib',
    skyStops: [
      { color: '#33184a', offset: 0 },
      { color: '#7e3257', offset: 0.4 },
      { color: '#c9532f', offset: 0.74 },
      { color: '#e98c3f', offset: 1 },
    ],
    orb: { color: '#ffd27a', glow: 'rgba(255,150,80,0.6)', cx: 0.5, cy: 0.78, r: 0.22 },
    accent: 'embers',
    accentOpacity: 0.85,
    scrimTop: 0.28,
    scrimBottom: 0.46,
    highlight: GOLD_WARM,
  },
  isha: {
    mood: 'isha',
    skyStops: [
      { color: '#0d4038', offset: 0 },
      { color: '#08231f', offset: 0.46 },
      { color: '#04130f', offset: 1 },
    ],
    orb: { color: '#eef7d0', glow: 'rgba(200,230,150,0.4)', cx: 0.74, cy: 0.16, r: 0.14 },
    accent: 'stars',
    accentOpacity: 0.9,
    scrimTop: 0.26,
    scrimBottom: 0.44,
    highlight: GOLD,
  },
};

/** Maps a hero period (incl. makruh / between) to its sky mood. */
export function periodToMood(period: PrayerHeroPeriod): AtmosphereMood {
  switch (period) {
    case 'Night':
      return 'night';
    case 'Fajr':
      return 'fajr';
    case 'BetweenFajrDhuhr':
    case 'MakruhSunrise':
      return 'sunrise';
    case 'Dhuhr':
    case 'MakruhBeforeDhuhr':
      return 'dhuhr';
    case 'Asr':
      return 'asr';
    case 'Maghrib':
    case 'MakruhSunset':
      return 'maghrib';
    case 'Isha':
      return 'isha';
    default:
      return 'dhuhr';
  }
}

export function resolvePrayerAtmosphere(period: PrayerHeroPeriod): PrayerAtmosphere {
  return MOODS[periodToMood(period)];
}
