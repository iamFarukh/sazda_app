import type { PrayerTimingsDay } from '../services/prayerTimesApi';
import type { FiveDailyPrayer } from '../store/prayerTrackerStore';
import { FIVE_DAILY_PRAYERS } from '../store/prayerTrackerStore';
import { parseTimeOnLocalDay } from './prayerSchedule';
import { formatHhmmTo12h } from './prayerTimesDisplay';

export type NextSalahHint = {
  name: FiveDailyPrayer;
  at: Date;
  label12h: string;
};

/**
 * Next upcoming salah among the five, based on API HH:mm strings for **today** (local).
 */
export function getNextSalahFromTodayTimings(
  now: Date,
  timings: PrayerTimingsDay,
): NextSalahHint | null {
  const day0 = new Date(now);
  day0.setHours(0, 0, 0, 0);

  let best: { name: FiveDailyPrayer; at: Date } | null = null;

  for (const name of FIVE_DAILY_PRAYERS) {
    const at = parseTimeOnLocalDay(timings[name], day0);
    if (at.getTime() > now.getTime()) {
      if (!best || at.getTime() < best.at.getTime()) {
        best = { name, at };
      }
    }
  }

  if (best) {
    return {
      ...best,
      label12h: formatHhmmTo12h(timings[best.name]),
    };
  }

  /** After Isha → next is tomorrow Fajr (not in today's timings object). */
  const fajrTomorrow = parseTimeOnLocalDay(timings.Fajr, new Date(day0.getTime() + 86400_000));
  return {
    name: 'Fajr',
    at: fajrTomorrow,
    label12h: formatHhmmTo12h(timings.Fajr),
  };
}

/**
 * Suggested prayer to log **now** (current period among the five by time windows).
 */
export function getSuggestedLogPrayer(now: Date, timings: PrayerTimingsDay): FiveDailyPrayer | null {
  const day0 = new Date(now);
  day0.setHours(0, 0, 0, 0);
  const fajr = parseTimeOnLocalDay(timings.Fajr, day0);
  const sunrise = parseTimeOnLocalDay(timings.Sunrise, day0);
  const dhuhr = parseTimeOnLocalDay(timings.Dhuhr, day0);

  /** Before Fajr adhān — still “night”; logging Fajr is optional UX */
  if (now.getTime() < fajr.getTime()) {
    return 'Fajr';
  }

  /** After sunrise until Dhuhr — not inside a named five-salah window for logging */
  if (now.getTime() >= sunrise.getTime() && now.getTime() < dhuhr.getTime()) {
    return null;
  }

  const times = FIVE_DAILY_PRAYERS.map(name => ({
    name,
    at: parseTimeOnLocalDay(timings[name], day0),
  }));
  for (let i = 0; i < times.length; i++) {
    const start = times[i]!.at;
    const end = i < times.length - 1 ? times[i + 1]!.at : new Date(day0.getTime() + 86400_000);
    if (now.getTime() >= start.getTime() && now.getTime() < end.getTime()) {
      return times[i]!.name;
    }
  }
  return null;
}
