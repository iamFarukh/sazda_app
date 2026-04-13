import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import dayjs from 'dayjs';
import { zustandStorage } from '../services/storage';
import { schedulePrayerCloudSync } from '../services/prayerTrackerCloudSync';

/** Five fard prayers tracked daily (Sunrise/Sunset excluded). */
export const FIVE_DAILY_PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;
export type FiveDailyPrayer = (typeof FIVE_DAILY_PRAYERS)[number];

export type PrayerMark = 'prayed' | 'missed';

/** Per-day log: unset = not marked yet */
export type DayPrayerLog = Partial<Record<FiveDailyPrayer, PrayerMark>>;

type PrayerTrackerState = {
  /** Local calendar date `YYYY-MM-DD` → marks */
  byDay: Record<string, DayPrayerLog>;
  markPrayer: (dateKey: string, prayer: FiveDailyPrayer, status: PrayerMark | 'clear') => void;
  resetDay: (dateKey: string) => void;
  mergeFromRemote: (remoteByDay: Record<string, DayPrayerLog>) => void;
  pruneOldEntries: () => void;
};


export const usePrayerTrackerStore = create<PrayerTrackerState>()(
  persist(
    set => ({
      byDay: {},

      markPrayer: (dateKey, prayer, status) => {
        set(state => {
          const next = { ...state.byDay };
          const prev = next[dateKey] ? { ...next[dateKey] } : {};
          if (status === 'clear') {
            delete prev[prayer];
          } else {
            prev[prayer] = status;
          }
          if (Object.keys(prev).length === 0) {
            delete next[dateKey];
          } else {
            next[dateKey] = prev;
          }
          return { byDay: next };
        });
        schedulePrayerCloudSync();
      },

      resetDay: dateKey => {
        set(state => {
          const next = { ...state.byDay };
          delete next[dateKey];
          return { byDay: next };
        });
        schedulePrayerCloudSync();
      },

      mergeFromRemote: (remoteByDay) =>
        set(state => {
          // simple merge strategy: remote overwrites local for missing or existing
          const merged = { ...state.byDay, ...remoteByDay };
          return { byDay: merged };
        }),

      pruneOldEntries: () =>
        set(state => {
          const next = { ...state.byDay };
          const cutoffFormat = dayjs().subtract(365, 'day').format('YYYY-MM-DD');
          let changed = false;
          for (const dateKey of Object.keys(next)) {
            if (dateKey < cutoffFormat) {
              delete next[dateKey];
              changed = true;
            }
          }
          if (changed) {
            return { byDay: next };
          }
          return state;
        }),
    }),
    {
      name: 'sazda-prayer-tracker',
      storage: zustandStorage,
      partialize: s => ({ byDay: s.byDay }),
      onRehydrateStorage: () => (state) => {
        // Runs after store hydrates from MMKV
        requestAnimationFrame(() => {
          state?.pruneOldEntries();
        });
      },
    },
  ),
);
