import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkv } from '../services/storage';
import type { FiveDailyPrayer } from './prayerTrackerStore';

export const LEAD_OPTIONS = [0, 5, 10, 15] as const;
export type LeadMinutes = (typeof LEAD_OPTIONS)[number];

type ByPrayer = Record<FiveDailyPrayer, boolean>;

const defaultByPrayer: ByPrayer = {
  Fajr: true,
  Dhuhr: true,
  Asr: true,
  Maghrib: true,
  Isha: true,
};

type PrayerReminderState = {
  masterEnabled: boolean;
  leadMinutes: LeadMinutes;
  byPrayer: ByPrayer;
  setMasterEnabled: (v: boolean) => void;
  setLeadMinutes: (v: LeadMinutes) => void;
  setPrayerEnabled: (p: FiveDailyPrayer, v: boolean) => void;
};

const mmkvStorage = createJSONStorage(() => ({
  getItem: (name: string) => mmkv.getString(name) ?? null,
  setItem: (name: string, value: string) => mmkv.set(name, value),
  removeItem: (name: string) => mmkv.remove(name),
}));

export const usePrayerReminderStore = create<PrayerReminderState>()(
  persist(
    set => ({
      masterEnabled: false,
      leadMinutes: 5,
      byPrayer: { ...defaultByPrayer },

      setMasterEnabled: v => set({ masterEnabled: v }),
      setLeadMinutes: v => set({ leadMinutes: v }),
      setPrayerEnabled: (p, v) =>
        set(s => ({ byPrayer: { ...s.byPrayer, [p]: v } })),
    }),
    {
      name: 'sazda-prayer-reminders',
      storage: mmkvStorage,
      partialize: s => ({
        masterEnabled: s.masterEnabled,
        leadMinutes: s.leadMinutes,
        byPrayer: s.byPrayer,
      }),
    },
  ),
);
