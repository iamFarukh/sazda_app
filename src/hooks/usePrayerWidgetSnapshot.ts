import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import {
  computePrayerWidgetSnapshot,
  computePrayerWidgetTimelineEntries,
} from '../features/prayerWidget/engine';
import { pushPrayerWidgetSnapshotToNative } from '../features/prayerWidget';
import type { PrayerWidgetSnapshot } from '../features/prayerWidget/types';
import type { PrayerTimingsDay } from '../services/prayerTimesApi';
import { ensurePrayerTimesCache } from '../features/prayerTimesCache';
import { usePrayerLocationStore } from '../store/prayerLocationStore';

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
  const saved = usePrayerLocationStore(s => s.saved);

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

  const snapshot = useMemo(() => {
    void minuteTick;
    const now = new Date();

    // Prefer fully offline-first data from our rolling cache when we have a saved location.
    if (saved) {
      const timezoneId =
        Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const cache = ensurePrayerTimesCache({
        latitude: saved.latitude,
        longitude: saved.longitude,
        city: saved.city,
        timezoneId,
        timezoneOffsetMin: -now.getTimezoneOffset(),
      });

      const isoKey = `${now.getFullYear()}-${String(
        now.getMonth() + 1,
      ).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const isoKeyTomorrow = `${tomorrow.getFullYear()}-${String(
        tomorrow.getMonth() + 1,
      ).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

      const day = cache?.days[isoKey];
      const dayP1 = cache?.days[isoKeyTomorrow];

      if (day && dayP1) {
        const toTimings = (d: typeof day): PrayerTimingsDay => ({
          Fajr: d.wall.Fajr,
          Sunrise: d.wall.Sunrise,
          Dhuhr: d.wall.Dhuhr,
          Asr: d.wall.Asr,
          Sunset: d.wall.Maghrib,
          Maghrib: d.wall.Maghrib,
          Isha: d.wall.Isha,
        });

        const dd =
          todayDateKey ||
          `${String(now.getDate()).padStart(2, '0')}-${String(
            now.getMonth() + 1,
          ).padStart(2, '0')}-${now.getFullYear()}`;
        const snap = computePrayerWidgetSnapshot(
          now,
          dd,
          toTimings(day),
          toTimings(dayP1),
          undefined,
        );

        let timeline: typeof snap.timeline = [];
        for (let i = 0; i < 3; i++) {
          const target = new Date(now);
          target.setDate(target.getDate() + i);
          const targetIsoKey = `${target.getFullYear()}-${String(
            target.getMonth() + 1,
          ).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;

          const targetNext = new Date(target);
          targetNext.setDate(targetNext.getDate() + 1);
          const targetNextIsoKey = `${targetNext.getFullYear()}-${String(
            targetNext.getMonth() + 1,
          ).padStart(2, '0')}-${String(targetNext.getDate()).padStart(2, '0')}`;

          const d1 = cache?.days[targetIsoKey];
          const d2 = cache?.days[targetNextIsoKey];

          if (d1 && d2) {
            const targetDD = `${String(target.getDate()).padStart(
              2,
              '0',
            )}-${String(target.getMonth() + 1).padStart(
              2,
              '0',
            )}-${target.getFullYear()}`;
            const dayEntries = computePrayerWidgetTimelineEntries(
              target,
              targetDD,
              toTimings(d1),
              toTimings(d2),
              undefined,
            );
            timeline = [...(timeline || []), ...dayEntries];
          }
        }

        if (timeline && timeline.length > 0) {
          const uniqueMap = new Map<number, (typeof timeline)[0]>();
          for (const entry of timeline) {
            uniqueMap.set(entry.atMs, entry);
          }
          const sortedAll = Array.from(uniqueMap.values()).sort(
            (a, b) => a.atMs - b.atMs,
          );

          const firstFutureIdx = sortedAll.findIndex(
            e => e.atMs > now.getTime(),
          );

          if (firstFutureIdx === -1) {
            // All entries are in the past, keep only the latest one
            timeline = [sortedAll[sortedAll.length - 1]];
          } else if (firstFutureIdx === 0) {
            // All entries are in the future
            timeline = sortedAll;
          } else {
            // Keep exactly one past entry (the currently active one) + all future entries
            timeline = sortedAll.slice(firstFutureIdx - 1);
          }
        } else {
          timeline = computePrayerWidgetTimelineEntries(
            now,
            dd,
            toTimings(day),
            toTimings(dayP1),
            undefined,
          );
        }

        const STALE_MS = 30 * 24 * 60 * 60 * 1000;
        const isStale = cache
          ? Date.now() - cache.meta.lastUpdatedAtMs > STALE_MS
          : true;

        return {
          ...snap,
          city: saved.city,
          isStale,
          staleLabel: isStale ? 'Times may be outdated' : undefined,
          timeline,
        };
      }

      // If cache exists but doesn't cover today (user hasn't opened app for many days),
      // keep rendering last known schedule with a subtle stale indicator.
      if (cache && Object.keys(cache.days).length > 0) {
        const lastKey = Object.keys(cache.days).sort().at(-1);
        const last = lastKey ? cache.days[lastKey] : undefined;
        if (last) {
          const dd =
            todayDateKey ||
            `${String(now.getDate()).padStart(2, '0')}-${String(
              now.getMonth() + 1,
            ).padStart(2, '0')}-${now.getFullYear()}`;
          const schedule = (
            ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const
          ).map(name => ({
            name,
            time12: last.wall[name],
            timeMillis: last.boundaryMs[name],
          }));
          const staleLabel = 'Times may be outdated';
          return {
            v: 2,
            computedAtMs: now.getTime(),
            dateKey: dd,
            city: saved.city,
            isStale: true,
            staleLabel,
            mode: 'between',
            title: 'Prayer times',
            subtitle: staleLabel,
            highlight: null,
            nextName: 'Fajr',
            countdownToNextMs: 0,
            countdownLabelMin: '—',
            schedule,
            timeline: undefined,
          };
        }
      }
    }

    // Fallback to the existing live-query timings if cache not available yet.
    if (!todayTimings || !tomorrowTimings) return null;
    if (nowBeforeFajr && waitingNightData) return null;
    const snap = computePrayerWidgetSnapshot(
      now,
      todayDateKey,
      todayTimings,
      tomorrowTimings,
      yesterdayTimings ?? undefined,
    );
    const timeline = computePrayerWidgetTimelineEntries(
      now,
      todayDateKey,
      todayTimings,
      tomorrowTimings,
      yesterdayTimings ?? undefined,
    );
    return { ...snap, timeline };
  }, [
    minuteTick,
    todayDateKey,
    todayTimings,
    tomorrowTimings,
    yesterdayTimings,
    nowBeforeFajr,
    waitingNightData,
    saved,
  ]);

  useEffect(() => {
    if (!snapshot) return;
    pushPrayerWidgetSnapshotToNative(JSON.stringify(snapshot));
  }, [snapshot]);

  return snapshot;
}
