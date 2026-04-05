import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { computePrayerWidgetSnapshot } from '../features/prayerWidget/engine';
import type { PrayerWidgetSnapshot } from '../features/prayerWidget/types';
import type { PrayerTimingsDay } from '../services/prayerTimesApi';

/**
 * Minute-cadence prayer widget state + native snapshot payload.
 * Recomputes on foreground so boundaries stay correct after backgrounding.
 */
export function usePrayerWidgetSnapshot(
  todayDateKey: string,
  todayTimings: PrayerTimingsDay | null,
  tomorrowTimings: PrayerTimingsDay | null,
  yesterdayTimings: PrayerTimingsDay | null,
  nowBeforeFajr: boolean,
  waitingNightData: boolean,
): PrayerWidgetSnapshot | null {
  const [minuteTick, setMinuteTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setMinuteTick(x => x + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') setMinuteTick(x => x + 1);
    });
    return () => sub.remove();
  }, []);

  return useMemo(() => {
    void minuteTick;
    if (!todayTimings || !tomorrowTimings) return null;
    if (nowBeforeFajr && waitingNightData) return null;
    return computePrayerWidgetSnapshot(
      new Date(),
      todayDateKey,
      todayTimings,
      tomorrowTimings,
      yesterdayTimings ?? undefined,
    );
  }, [
    minuteTick,
    todayDateKey,
    todayTimings,
    tomorrowTimings,
    yesterdayTimings,
    nowBeforeFajr,
    waitingNightData,
  ]);
}
