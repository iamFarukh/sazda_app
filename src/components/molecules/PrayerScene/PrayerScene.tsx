import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import type { AnimationObject } from 'lottie-react-native';
import { AppLottie } from '../../atoms/AppLottie/AppLottie';
import type { PrayerHeroPeriod } from '../../../utils/prayerSchedule';

/** The distinct "time of day" scenes we animate. */
export type PrayerSceneKey =
  | 'fajr' // sunrise
  | 'dhuhr' // bright sun rays
  | 'asr' // warm afternoon
  | 'maghrib' // sunset
  | 'isha' // moon + stars
  | 'night' // moon
  | 'makruh'; // sun behind cloud

/** Map the hero period to a scene. */
export function periodToScene(period: PrayerHeroPeriod): PrayerSceneKey {
  switch (period) {
    case 'Fajr':
      return 'fajr';
    case 'Dhuhr':
    case 'BetweenFajrDhuhr':
      return 'dhuhr';
    case 'Asr':
      return 'asr';
    case 'Maghrib':
      return 'maghrib';
    case 'Isha':
      return 'isha';
    case 'Night':
      return 'night';
    case 'MakruhSunrise':
    case 'MakruhBeforeDhuhr':
    case 'MakruhSunset':
      return 'makruh';
    default:
      return 'dhuhr';
  }
}

/**
 * Scene → Lottie asset slots.
 *
 * These are intentionally empty: drop licensed scene animations into src/assets/lottie/
 * and uncomment the matching `require` to light them up. Until then every scene resolves
 * to `undefined`, so <PrayerScene> renders its `fallback` (the current icon) — never blank.
 * See src/assets/lottie/README.md for the recommended look per scene.
 */
const SCENE_SOURCES: Partial<Record<PrayerSceneKey, AnimationObject>> = {
  // fajr: require('../../../assets/lottie/fajr.json'),
  // dhuhr: require('../../../assets/lottie/dhuhr.json'),
  // asr: require('../../../assets/lottie/asr.json'),
  // maghrib: require('../../../assets/lottie/maghrib.json'),
  // isha: require('../../../assets/lottie/isha.json'),
  // night: require('../../../assets/lottie/night.json'),
  // makruh: require('../../../assets/lottie/makruh.json'),
};

type Props = {
  period: PrayerHeroPeriod;
  size?: number;
  /** Shown until a scene asset is added for this period (e.g. the existing icon). */
  fallback?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Renders the time-of-day scene for the current prayer period. Gracefully degrades to
 * `fallback` when the scene's Lottie asset hasn't been added yet.
 */
export function PrayerScene({ period, size = 120, fallback, style }: Props) {
  const source = SCENE_SOURCES[periodToScene(period)];
  return <AppLottie source={source} size={size} fallback={fallback} style={style} loop />;
}
