import { formatCountdown, type PrayerHeroState } from '../utils/prayerSchedule';
import type { SazdaNotificationVariant } from '../native/sazdaCustomNotificationAndroid';

/**
 * One-time “welcome” notification copy from the same hero state as the home screen
 * (makruh windows, between-prayers, current salah, next countdown).
 */
export function buildWelcomeContextNotificationPayload(hero: PrayerHeroState): {
  meta: string;
  headline: string;
  detail: string;
  variant: SazdaNotificationVariant;
} {
  const nextIn = formatCountdown(hero.countdownMs);
  const isMakruh = hero.currentPeriod.startsWith('Makruh');

  if (isMakruh) {
    let headline = 'Makruh time';
    if (hero.currentPeriod === 'MakruhSunrise') headline = 'Makruh after sunrise';
    if (hero.currentPeriod === 'MakruhBeforeDhuhr') headline = 'Caution before Dhuhr';
    if (hero.currentPeriod === 'MakruhSunset') headline = 'Makruh before Maghrib';

    const detail = `Next: ${hero.countdownTargetName} in ${nextIn}. Guidance only—follow your madhhab.`;
    return {
      meta: 'SAZDA • NOW',
      headline,
      detail,
      variant: 'reminder',
    };
  }

  if (hero.currentPeriod === 'BetweenFajrDhuhr') {
    return {
      meta: 'SAZDA • NOW',
      headline: 'Between Fajr and Dhuhr',
      detail: `Next obligatory prayer: ${hero.countdownTargetName} in ${nextIn}.`,
      variant: 'prayer',
    };
  }

  if (hero.currentPeriod === 'Night') {
    return {
      meta: 'SAZDA • NOW',
      headline: 'Before Fajr',
      detail: `Fajr in ${nextIn}.`,
      variant: 'prayer',
    };
  }

  if (hero.currentPeriod === 'Fajr') {
    return {
      meta: 'SAZDA • NOW',
      headline: 'Fajr prayer time',
      detail: `Sunrise in ${nextIn}.`,
      variant: 'prayer',
    };
  }

  if (hero.currentPeriod === 'Dhuhr' || hero.currentPeriod === 'Asr' || hero.currentPeriod === 'Maghrib' || hero.currentPeriod === 'Isha') {
    return {
      meta: 'SAZDA • NOW',
      headline: `${hero.currentPeriod} window`,
      detail: `Next: ${hero.countdownTargetName} in ${nextIn}.`,
      variant: 'prayer',
    };
  }

  return {
    meta: 'SAZDA • NOW',
    headline: 'Salah times',
    detail: `Next: ${hero.countdownTargetName} in ${nextIn}.`,
    variant: 'prayer',
  };
}
