import { useMemo } from 'react';
import dayjs from 'dayjs';
import {
  FIVE_DAILY_PRAYERS,
  type DayPrayerLog,
  usePrayerTrackerStore,
} from '../store/prayerTrackerStore';

function isDayComplete(log: DayPrayerLog | undefined): boolean {
  if (!log) return false;
  return FIVE_DAILY_PRAYERS.every(p => log[p] === 'prayed');
}

/** Consecutive past days (including today if complete) with all five fard marked prayed. */
export function usePrayerStreak(): number {
  const byDay = usePrayerTrackerStore(s => s.byDay);

  return useMemo(() => {
    let streak = 0;
    let check = dayjs().startOf('day');
    const todayKey = check.format('YYYY-MM-DD');

    for (let i = 0; i < 400; i++) {
      const key = check.format('YYYY-MM-DD');
      const log = byDay[key];

      if (isDayComplete(log)) {
        streak += 1;
        check = check.subtract(1, 'day');
        continue;
      }

      // Today incomplete: don't break streak; start counting from yesterday.
      if (i === 0 && key === todayKey) {
        check = check.subtract(1, 'day');
        continue;
      }

      break;
    }

    return streak;
  }, [byDay]);
}
