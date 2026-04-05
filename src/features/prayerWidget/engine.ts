import type { PrayerTimingsDay } from '../../services/prayerTimesApi';
import {
  formatTime12h,
  MAKRUH_BEFORE_DHUHR_MINUTES,
  MAKRUH_SUNRISE_MINUTES,
  MAKRUH_SUNSET_MINUTES,
  parseTimeOnLocalDay,
  type DailyPrayerName,
} from '../../utils/prayerSchedule';
import { formatCountdownMinutes, subtitleNextIn } from './format';
import type { PrayerWidgetSnapshot } from './types';

const FIVE: DailyPrayerName[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const MS_BEFORE_DHUHR = MAKRUH_BEFORE_DHUHR_MINUTES * 60 * 1000;

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addLocalDays(base: Date, days: number): Date {
  const x = new Date(base);
  x.setDate(x.getDate() + days);
  return x;
}

function parseDay(now: Date, today: PrayerTimingsDay) {
  const day0 = startOfLocalDay(now);
  const t = {
    Fajr: parseTimeOnLocalDay(today.Fajr, day0),
    Sunrise: parseTimeOnLocalDay(today.Sunrise, day0),
    Dhuhr: parseTimeOnLocalDay(today.Dhuhr, day0),
    Asr: parseTimeOnLocalDay(today.Asr, day0),
    Maghrib: parseTimeOnLocalDay(today.Maghrib, day0),
    Isha: parseTimeOnLocalDay(today.Isha, day0),
  };
  if (t.Sunrise.getTime() < t.Fajr.getTime()) {
    t.Sunrise = new Date(t.Fajr);
  }
  return { day0, t };
}

function scheduleRows(t: ReturnType<typeof parseDay>['t']): { name: DailyPrayerName; time12: string }[] {
  return FIVE.map(name => ({ name, time12: formatTime12h(t[name]) }));
}

/**
 * Real-time prayer widget state: active / Makruh / night / between.
 * Makruh after Fajr until sunrise: no current-prayer highlight; next target is Dhuhr.
 * Zawāl: heuristic window before listed Dhuhr (same as home hero).
 * Pre-sunset caution during Asr: Makruh (nafl) before Maghrib.
 */
export function computePrayerWidgetSnapshot(
  now: Date,
  dateKey: string,
  today: PrayerTimingsDay,
  tomorrow: PrayerTimingsDay,
  yesterday?: PrayerTimingsDay | null,
): PrayerWidgetSnapshot {
  const { day0, t } = parseDay(now, today);
  const dayP1 = addLocalDays(day0, 1);
  const dayM1 = addLocalDays(day0, -1);
  const fajrTomorrow = parseTimeOnLocalDay(tomorrow.Fajr, dayP1);
  const ishaYesterday = yesterday ? parseTimeOnLocalDay(yesterday.Isha, dayM1) : undefined;

  const baseSchedule = scheduleRows(t);

  const cdMin = (ms: number) => formatCountdownMinutes(ms);

  if (now < t.Fajr) {
    const countdownToNextMs = t.Fajr.getTime() - now.getTime();
    return {
      v: 1,
      computedAtMs: now.getTime(),
      dateKey,
      mode: 'night',
      title: 'Next: Fajr',
      subtitle: subtitleNextIn('Fajr', cdMin(countdownToNextMs)),
      highlight: null,
      nextName: 'Fajr',
      countdownToNextMs,
      countdownLabelMin: cdMin(countdownToNextMs),
      periodNote: ishaYesterday ? undefined : 'Open the app once to load night timings.',
      schedule: baseSchedule,
    };
  }

  // Spec: after Fajr until sunrise → Makruh; show next Dhuhr (not Sunrise).
  if (now >= t.Fajr && now < t.Sunrise) {
    const countdownToNextMs = t.Dhuhr.getTime() - now.getTime();
    return {
      v: 1,
      computedAtMs: now.getTime(),
      dateKey,
      mode: 'makruh',
      makruhVariant: 'post_fajr',
      title: 'Makruh time',
      subtitle: subtitleNextIn('Dhuhr', cdMin(countdownToNextMs)),
      highlight: null,
      nextName: 'Dhuhr',
      countdownToNextMs,
      countdownLabelMin: cdMin(countdownToNextMs),
      periodNote: 'Optional prayer is commonly avoided after Fajr until sunrise.',
      schedule: baseSchedule,
    };
  }

  const makruhSunriseEnd = new Date(t.Sunrise.getTime() + MAKRUH_SUNRISE_MINUTES * 60 * 1000);
  if (now >= t.Sunrise && now < makruhSunriseEnd) {
    const countdownToNextMs = t.Dhuhr.getTime() - now.getTime();
    return {
      v: 1,
      computedAtMs: now.getTime(),
      dateKey,
      mode: 'makruh',
      makruhVariant: 'ishraq',
      title: 'Makruh time',
      subtitle: subtitleNextIn('Dhuhr', cdMin(countdownToNextMs)),
      highlight: null,
      nextName: 'Dhuhr',
      countdownToNextMs,
      countdownLabelMin: cdMin(countdownToNextMs),
      periodNote: 'Short period after sunrise — many madhhabs discourage nafl here.',
      schedule: baseSchedule,
    };
  }

  let makruhStart = new Date(t.Dhuhr.getTime() - MS_BEFORE_DHUHR);
  if (makruhStart < t.Sunrise) makruhStart = new Date(t.Sunrise);
  const hasMakruhSegment = makruhStart < t.Dhuhr;

  if (hasMakruhSegment && now >= makruhStart && now < t.Dhuhr) {
    const countdownToNextMs = t.Dhuhr.getTime() - now.getTime();
    return {
      v: 1,
      computedAtMs: now.getTime(),
      dateKey,
      mode: 'makruh',
      makruhVariant: 'zawal',
      title: 'Makruh time',
      subtitle: subtitleNextIn('Dhuhr', cdMin(countdownToNextMs)),
      highlight: null,
      nextName: 'Dhuhr',
      countdownToNextMs,
      countdownLabelMin: cdMin(countdownToNextMs),
      periodNote:
        'Near solar noon — optional prayer is commonly avoided before Dhuhr. Consult your scholar.',
      schedule: baseSchedule,
    };
  }

  if (now < t.Dhuhr) {
    const countdownToNextMs = t.Dhuhr.getTime() - now.getTime();
    return {
      v: 1,
      computedAtMs: now.getTime(),
      dateKey,
      mode: 'between',
      title: 'Next: Dhuhr',
      subtitle: subtitleNextIn('Dhuhr', cdMin(countdownToNextMs)),
      highlight: null,
      nextName: 'Dhuhr',
      countdownToNextMs,
      countdownLabelMin: cdMin(countdownToNextMs),
      periodNote: 'Fajr window has ended.',
      schedule: baseSchedule,
    };
  }

  type Win = { name: DailyPrayerName; start: Date; end: Date; next: DailyPrayerName };
  const windows: Win[] = [
    { name: 'Dhuhr', start: t.Dhuhr, end: t.Asr, next: 'Asr' },
    { name: 'Asr', start: t.Asr, end: t.Maghrib, next: 'Maghrib' },
    { name: 'Maghrib', start: t.Maghrib, end: t.Isha, next: 'Isha' },
    { name: 'Isha', start: t.Isha, end: fajrTomorrow, next: 'Fajr' },
  ];

  for (const w of windows) {
    if (now >= w.start && now < w.end) {
      if (w.name === 'Asr') {
        const makruhSunsetStart = new Date(t.Maghrib.getTime() - MAKRUH_SUNSET_MINUTES * 60 * 1000);
        if (now >= makruhSunsetStart) {
          const countdownToNextMs = t.Maghrib.getTime() - now.getTime();
          return {
            v: 1,
            computedAtMs: now.getTime(),
            dateKey,
            mode: 'makruh',
            makruhVariant: 'sunset',
            title: 'Makruh time',
            subtitle: subtitleNextIn('Maghrib', cdMin(countdownToNextMs)),
            highlight: null,
            nextName: 'Maghrib',
            countdownToNextMs,
            countdownLabelMin: cdMin(countdownToNextMs),
            periodNote: 'Before sunset — caution period for nafl in many apps.',
            schedule: baseSchedule,
          };
        }
      }
      const countdownToNextMs = w.end.getTime() - now.getTime();
      return {
        v: 1,
        computedAtMs: now.getTime(),
        dateKey,
        mode: 'active',
        title: `Now: ${w.name}`,
        subtitle: subtitleNextIn(w.next, cdMin(countdownToNextMs)),
        highlight: w.name,
        nextName: w.next,
        countdownToNextMs,
        countdownLabelMin: cdMin(countdownToNextMs),
        schedule: baseSchedule,
      };
    }
  }

  const countdownToNextMs = fajrTomorrow.getTime() - now.getTime();
  return {
    v: 1,
    computedAtMs: now.getTime(),
    dateKey,
    mode: 'active',
    title: 'Now: Isha',
    subtitle: subtitleNextIn('Fajr', cdMin(countdownToNextMs)),
    highlight: 'Isha',
    nextName: 'Fajr',
    countdownToNextMs,
    countdownLabelMin: cdMin(countdownToNextMs),
    schedule: baseSchedule,
  };
}
