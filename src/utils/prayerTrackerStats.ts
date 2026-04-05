import dayjs from 'dayjs';
import { FIVE_DAILY_PRAYERS, type DayPrayerLog } from '../store/prayerTrackerStore';

export const PRAYERS_PER_DAY = FIVE_DAILY_PRAYERS.length;

export function isPerfectDay(log: DayPrayerLog | undefined): boolean {
  if (!log) return false;
  return FIVE_DAILY_PRAYERS.every(p => log[p] === 'prayed');
}

export function countTodayProgress(log: DayPrayerLog | undefined): {
  prayed: number;
  missed: number;
  pending: number;
} {
  const l = log ?? {};
  let prayed = 0;
  let missed = 0;
  let pending = 0;
  for (const p of FIVE_DAILY_PRAYERS) {
    const s = l[p];
    if (s === 'prayed') prayed++;
    else if (s === 'missed') missed++;
    else pending++;
  }
  return { prayed, missed, pending };
}

/** Streak of consecutive days with 5/5 prayed (today counts only if complete). */
export function computeStreak(byDay: Record<string, DayPrayerLog>, todayKey: string): number {
  let streak = 0;
  let key = todayKey;

  if (isPerfectDay(byDay[todayKey])) {
    streak = 1;
    key = dayjs(todayKey).subtract(1, 'day').format('YYYY-MM-DD');
  } else {
    key = dayjs(todayKey).subtract(1, 'day').format('YYYY-MM-DD');
  }

  while (isPerfectDay(byDay[key])) {
    streak++;
    key = dayjs(key).subtract(1, 'day').format('YYYY-MM-DD');
  }

  return streak;
}

export type RangeStats = {
  /** Total prayed marks in window */
  prayed: number;
  missed: number;
  /** Slots still unmarked (out of 5 × days) */
  pending: number;
  /** Days with 5/5 prayed */
  perfectDays: number;
  /** Days with at least one mark (any) */
  daysTouched: number;
  maxPrayers: number;
};

export function statsForLastNDays(
  byDay: Record<string, DayPrayerLog>,
  todayKey: string,
  dayCount: number,
): RangeStats {
  let prayed = 0;
  let missed = 0;
  let pending = 0;
  let perfectDays = 0;
  let daysTouched = 0;

  for (let i = 0; i < dayCount; i++) {
    const key = dayjs(todayKey).subtract(i, 'day').format('YYYY-MM-DD');
    const log = byDay[key];
    let dayPrayed = 0;
    let dayMissed = 0;
    for (const p of FIVE_DAILY_PRAYERS) {
      const s = log?.[p];
      if (s === 'prayed') {
        dayPrayed++;
        prayed++;
      } else if (s === 'missed') {
        dayMissed++;
        missed++;
      } else {
        pending++;
      }
    }
    if (dayPrayed === PRAYERS_PER_DAY) perfectDays++;
    if (dayPrayed + dayMissed > 0) daysTouched++;
  }

  return {
    prayed,
    missed,
    pending,
    perfectDays,
    daysTouched,
    maxPrayers: dayCount * PRAYERS_PER_DAY,
  };
}

export function formatPercent(part: number, whole: number): string {
  if (whole <= 0) return '0%';
  return `${Math.round((part / whole) * 100)}%`;
}

/** Last N calendar day keys ending with todayKey (today first). */
export function lastNDayKeys(todayKey: string, n: number): string[] {
  const keys: string[] = [];
  for (let i = 0; i < n; i++) {
    keys.push(dayjs(todayKey).subtract(i, 'day').format('YYYY-MM-DD'));
  }
  return keys;
}

export type DayQuality = 'perfect' | 'partial' | 'empty' | 'allMissed';

export function dayQuality(log: DayPrayerLog | undefined): DayQuality {
  if (!log || Object.keys(log).length === 0) return 'empty';
  const { prayed, missed, pending } = countTodayProgress(log);
  if (prayed === PRAYERS_PER_DAY) return 'perfect';
  if (missed === PRAYERS_PER_DAY && pending === 0) return 'allMissed';
  if (prayed + missed > 0) return 'partial';
  return 'empty';
}
