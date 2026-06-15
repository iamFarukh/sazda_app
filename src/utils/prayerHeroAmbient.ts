import type { AppPalette, ResolvedScheme } from '../theme/useThemePalette';
import type { PrayerHeroPeriod } from './prayerSchedule';

/**
 * Period-aware hero fills (subtle “living” UI). Uses design tokens only.
 */
export function resolvePrayerHeroCardAmbient(
  c: AppPalette,
  scheme: ResolvedScheme,
  period: PrayerHeroPeriod,
  isBetweenPrayers: boolean,
): string {
  if (isBetweenPrayers) {
    return c.secondaryContainer;
  }
  switch (period) {
    case 'Night':
      return scheme === 'dark' ? c.surfaceContainerLow : c.primaryContainer;
    case 'Fajr':
      return c.primary;
    case 'BetweenFajrDhuhr':
      return c.secondaryContainer;
    case 'MakruhSunrise':
    case 'MakruhBeforeDhuhr':
    case 'MakruhSunset':
      return c.primaryContainer;
    case 'Dhuhr':
      return scheme === 'dark' ? c.primaryContainer : c.primary;
    case 'Asr':
      return c.primaryContainer;
    case 'Maghrib':
      return c.secondary;
    case 'Isha':
      return scheme === 'dark' ? c.primary : c.primaryContainer;
    default:
      return scheme === 'dark' ? c.primaryContainer : c.primary;
  }
}

export function resolvePrayerHeroGlowAmbient(
  c: AppPalette,
  scheme: ResolvedScheme,
  period: PrayerHeroPeriod,
  isBetweenPrayers: boolean,
): string {
  if (isBetweenPrayers) {
    return scheme === 'dark' ? 'rgba(228, 199, 101, 0.28)' : 'rgba(115, 92, 0, 0.2)';
  }
  switch (period) {
    case 'Night':
      return scheme === 'dark' ? 'rgba(6, 78, 59, 0.38)' : 'rgba(6, 78, 59, 0.12)';
    case 'Fajr':
      return scheme === 'dark' ? 'rgba(142, 207, 178, 0.22)' : 'rgba(0, 53, 39, 0.15)';
    case 'Maghrib':
      return scheme === 'dark' ? 'rgba(212, 175, 55, 0.22)' : 'rgba(115, 92, 0, 0.18)';
    case 'Isha':
      return scheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 53, 39, 0.1)';
    default:
      return c.secondaryContainer;
  }
}
