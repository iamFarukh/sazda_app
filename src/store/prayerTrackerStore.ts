import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkv } from '../services/storage';

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
};

const mmkvStorage = createJSONStorage(() => ({
  getItem: (name: string) => mmkv.getString(name) ?? null,
  setItem: (name: string, value: string) => mmkv.set(name, value),
  removeItem: (name: string) => mmkv.remove(name),
}));

export const usePrayerTrackerStore = create<PrayerTrackerState>()(
  persist(
    set => ({
      byDay: {},

      markPrayer: (dateKey, prayer, status) =>
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
        }),

      resetDay: dateKey =>
        set(state => {
          const next = { ...state.byDay };
          delete next[dateKey];
          return { byDay: next };
        }),
    }),
    {
      name: 'sazda-prayer-tracker',
      storage: mmkvStorage,
      partialize: s => ({ byDay: s.byDay }),
    },
  ),
);
