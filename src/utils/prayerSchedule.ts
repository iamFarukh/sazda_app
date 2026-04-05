import type { PrayerTimingsDay } from '../services/prayerTimesApi';

export type DailyPrayerName = 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';

/**
 * Periods for the home hero — not the same as “named salah window until next adhān”.
 * Fajr ends at **Sunrise** (API field). Aladhan does **not** send a dedicated makruh window;
 * we approximate the minutes before listed Dhuhr when nafl is commonly avoided near zawāl.
 */
export type PrayerHeroPeriod =
  | DailyPrayerName
  | 'Night'
  | 'BetweenFajrDhuhr'
  | 'MakruhSunrise'
  | 'MakruhBeforeDhuhr'
  | 'MakruhSunset';

/**
 * Minutes before **listed Dhuhr** to show the yellow “prohibited / zawāl” hero (heuristic).
 * Aladhan does not send true solar noon; a narrow window hid the UI until the last few minutes.
 * Fiqh details vary by madhhab; this is UX guidance only.
 */
export const MAKRUH_SUNRISE_MINUTES = 20;
export const MAKRUH_BEFORE_DHUHR_MINUTES = 55;
export const MAKRUH_SUNSET_MINUTES = 15;

export type PrayerHeroState = {
  currentPeriod: PrayerHeroPeriod;
  /** Start instant for the current period (Fajr adhān, sunrise, Dhuhr adhān, …). */
  currentPeriodStart: Date;
  /** Shown as the gold time next to the hero title. */
  headlineTime: Date;
  /** “Time to {countdownTargetName}” — human label. */
  countdownTargetName: string;
  /** Which row in the day list matches the countdown target (Fajr→Sunrise, etc.). */
  countdownTargetRow: keyof PrayerTimingsDay;
  /** Highlight row for the active obligatory window, if any. */
  currentSalahRow: keyof PrayerTimingsDay | null;
  /** When the countdown hits zero. */
  nextPrayerAt: Date;
  countdownMs: number;
  /** Extra line under the card (makruh / between prayers). */
  periodNote?: string;
  /** Night before Fajr: we could not load yesterday’s Isha — hide “current time” row. */
  hideCurrentAdhanTime?: boolean;
};

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

/** Parse "HH:mm" on a calendar day in local timezone (handles Aladhan suffixes e.g. "(GMT)"). */
export function parseTimeOnLocalDay(hhmm: string, dayStart: Date): Date {
  const match = hhmm.match(/(\d{1,2}):(\d{2})/);
  const h = match ? Number(match[1]) : Number(hhmm.split(':')[0]);
  const m = match ? Number(match[2]) : Number(hhmm.split(':')[1]);
  const x = new Date(dayStart);
  x.setHours(h, m, 0, 0);
  return x;
}

const ORDER: DailyPrayerName[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

const MS_BEFORE_DHUHR = MAKRUH_BEFORE_DHUHR_MINUTES * 60 * 1000;

/**
 * Compute current period, countdown target, and prayer-table highlights.
 * `tomorrow` timings are used for Fajr after today's Isha.
 * `yesterday` optional: when now is before today's Fajr, night period references yesterday's Isha.
 */
export function computePrayerHeroState(
  now: Date,
  today: PrayerTimingsDay,
  tomorrow: PrayerTimingsDay,
  yesterday?: PrayerTimingsDay | null,
): PrayerHeroState {
  const day0 = startOfLocalDay(now);
  const dayM1 = addLocalDays(day0, -1);
  const dayP1 = addLocalDays(day0, 1);

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

  const fajrTomorrow = parseTimeOnLocalDay(tomorrow.Fajr, dayP1);

  const ishaYesterday = yesterday
    ? parseTimeOnLocalDay(yesterday.Isha, dayM1)
    : undefined;

  // Before today's Fajr → night (after yesterday's Isha)
  if (now < t.Fajr) {
    const nextPrayerAt = t.Fajr;
    const hideCurrentAdhanTime = !ishaYesterday;
    return {
      currentPeriod: 'Night',
      currentPeriodStart: ishaYesterday ?? t.Fajr,
      headlineTime: ishaYesterday ?? t.Fajr,
      countdownTargetName: 'Fajr',
      countdownTargetRow: 'Fajr',
      currentSalahRow: null,
      nextPrayerAt,
      countdownMs: nextPrayerAt.getTime() - now.getTime(),
      hideCurrentAdhanTime,
    };
  }

  // Fajr adhān → sunrise: valid Fajr window
  if (now < t.Sunrise) {
    return {
      currentPeriod: 'Fajr',
      currentPeriodStart: t.Fajr,
      headlineTime: t.Fajr,
      countdownTargetName: 'Sunrise',
      countdownTargetRow: 'Sunrise',
      currentSalahRow: 'Fajr',
      nextPrayerAt: t.Sunrise,
      countdownMs: t.Sunrise.getTime() - now.getTime(),
      periodNote: 'Fajr ends at sunrise.',
    };
  }

  // Makruh after Sunrise (Ishraq)
  const makruhSunriseEnd = new Date(t.Sunrise.getTime() + MAKRUH_SUNRISE_MINUTES * 60 * 1000);
  if (now >= t.Sunrise && now < makruhSunriseEnd) {
    return {
      currentPeriod: 'MakruhSunrise',
      currentPeriodStart: t.Sunrise,
      headlineTime: makruhSunriseEnd,
      countdownTargetName: 'Dhuhr',
      countdownTargetRow: 'Dhuhr',
      currentSalahRow: null,
      nextPrayerAt: makruhSunriseEnd,
      countdownMs: makruhSunriseEnd.getTime() - now.getTime(),
    };
  }

  // Heuristic makruh / caution window before listed Dhuhr (not from API)
  let makruhStart = new Date(t.Dhuhr.getTime() - MS_BEFORE_DHUHR);
  if (makruhStart < t.Sunrise) makruhStart = new Date(t.Sunrise);
  const hasMakruhSegment = makruhStart < t.Dhuhr;

  if (hasMakruhSegment && now >= makruhStart && now < t.Dhuhr) {
    return {
      currentPeriod: 'MakruhBeforeDhuhr',
      currentPeriodStart: makruhStart,
      headlineTime: t.Dhuhr,
      countdownTargetName: 'Dhuhr',
      countdownTargetRow: 'Dhuhr',
      currentSalahRow: null,
      nextPrayerAt: t.Dhuhr,
      countdownMs: t.Dhuhr.getTime() - now.getTime(),
      periodNote:
        'Optional (nafl) prayer is commonly avoided shortly before Dhuhr (near solar noon). Follow your madhhab for details.',
    };
  }

  // After sunrise until makruh (or Dhuhr if no segment): between the five salāh
  if (now < t.Dhuhr) {
    return {
      currentPeriod: 'BetweenFajrDhuhr',
      currentPeriodStart: t.Sunrise,
      headlineTime: t.Sunrise,
      countdownTargetName: 'Dhuhr',
      countdownTargetRow: 'Dhuhr',
      currentSalahRow: null,
      nextPrayerAt: t.Dhuhr,
      countdownMs: t.Dhuhr.getTime() - now.getTime(),
      periodNote: 'Fajr time has ended. Next obligatory salah is Dhuhr.',
    };
  }

  // Dhuhr → Asr, Asr → Maghrib, Maghrib → Isha, Isha → Fajr (tomorrow)
  const windows: { name: DailyPrayerName; start: Date; end: Date; nextRow: keyof PrayerTimingsDay }[] = [
    { name: 'Dhuhr', start: t.Dhuhr, end: t.Asr, nextRow: 'Asr' },
    { name: 'Asr', start: t.Asr, end: t.Maghrib, nextRow: 'Maghrib' },
    { name: 'Maghrib', start: t.Maghrib, end: t.Isha, nextRow: 'Isha' },
    { name: 'Isha', start: t.Isha, end: fajrTomorrow, nextRow: 'Fajr' },
  ];

  for (const w of windows) {
    if (now >= w.start && now < w.end) {
      if (w.name === 'Asr') {
        // Makruh before Sunset (Ghurub)
        const makruhSunsetStart = new Date(t.Maghrib.getTime() - MAKRUH_SUNSET_MINUTES * 60 * 1000);
        if (now >= makruhSunsetStart) {
          return {
            currentPeriod: 'MakruhSunset',
            currentPeriodStart: makruhSunsetStart,
            headlineTime: t.Maghrib,
            countdownTargetName: 'Maghrib',
            countdownTargetRow: 'Maghrib',
            currentSalahRow: null,
            nextPrayerAt: t.Maghrib,
            countdownMs: t.Maghrib.getTime() - now.getTime(),
          };
        }
      }

      const nextName =
        w.end === fajrTomorrow ? 'Fajr' : (ORDER[ORDER.indexOf(w.name) + 1] as DailyPrayerName);
      return {
        currentPeriod: w.name,
        currentPeriodStart: w.start,
        headlineTime: w.start,
        countdownTargetName: nextName,
        countdownTargetRow: w.nextRow,
        currentSalahRow: w.name,
        nextPrayerAt: w.end,
        countdownMs: w.end.getTime() - now.getTime(),
      };
    }
  }

  return {
    currentPeriod: 'Isha',
    currentPeriodStart: t.Isha,
    headlineTime: t.Isha,
    countdownTargetName: 'Fajr',
    countdownTargetRow: 'Fajr',
    currentSalahRow: 'Isha',
    nextPrayerAt: fajrTomorrow,
    countdownMs: fajrTomorrow.getTime() - now.getTime(),
  };
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Now';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/** Format Date as local 12h time e.g. 12:30 PM */
export function formatTime12h(d: Date): string {
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
