import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkv } from '../services/storage';

type State = {
  /** Gentle nudge if not all five prayers marked prayed (fires once in evening window). */
  streakReminderEnabled: boolean;
  /** Daily Quran reading nudge — system default sound only. */
  quranReminderEnabled: boolean;
  quranReminderHour: number;
  quranReminderMinute: number;
  /** Master for Ramadan seasonal triggers (requires local Ramadan window). */
  ramadanNotificationsEnabled: boolean;
  /** Minutes before Fajr to remind (Suhoor). */
  suhoorOffsetMinutes: number;
  /** Minutes before Maghrib to remind (Iftar prep). */
  iftarOffsetMinutes: number;
  /** Last ten nights gentle reminder (approx. last third of Ramadan). */
  lastTenNightsReminderEnabled: boolean;

  setStreakReminderEnabled: (v: boolean) => void;
  setQuranReminderEnabled: (v: boolean) => void;
  setQuranReminderTime: (hour: number, minute: number) => void;
  setRamadanNotificationsEnabled: (v: boolean) => void;
  setSuhoorOffsetMinutes: (v: number) => void;
  setIftarOffsetMinutes: (v: number) => void;
  setLastTenNightsReminderEnabled: (v: boolean) => void;
};

const mmkvStorage = createJSONStorage(() => ({
  getItem: (name: string) => mmkv.getString(name) ?? null,
  setItem: (name: string, value: string) => mmkv.set(name, value),
  removeItem: (name: string) => mmkv.remove(name),
}));

export const useGeneralNotificationSettingsStore = create<State>()(
  persist(
    set => ({
      streakReminderEnabled: true,
      quranReminderEnabled: false,
      quranReminderHour: 20,
      quranReminderMinute: 0,
      ramadanNotificationsEnabled: false,
      suhoorOffsetMinutes: 45,
      iftarOffsetMinutes: 15,
      lastTenNightsReminderEnabled: true,

      setStreakReminderEnabled: v => set({ streakReminderEnabled: v }),
      setQuranReminderEnabled: v => set({ quranReminderEnabled: v }),
      setQuranReminderTime: (hour, minute) =>
        set({
          quranReminderHour: Math.max(0, Math.min(23, Math.floor(hour))),
          quranReminderMinute: Math.max(0, Math.min(59, Math.floor(minute))),
        }),
      setRamadanNotificationsEnabled: v => set({ ramadanNotificationsEnabled: v }),
      setSuhoorOffsetMinutes: v => set({ suhoorOffsetMinutes: Math.max(5, Math.min(120, Math.round(v))) }),
      setIftarOffsetMinutes: v => set({ iftarOffsetMinutes: Math.max(5, Math.min(90, Math.round(v))) }),
      setLastTenNightsReminderEnabled: v => set({ lastTenNightsReminderEnabled: v }),
    }),
    {
      name: 'sazda-general-notification-settings-v1',
      storage: mmkvStorage,
    },
  ),
);
