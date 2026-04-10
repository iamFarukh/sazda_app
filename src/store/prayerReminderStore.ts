import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkv } from '../services/storage';
import { FIVE_DAILY_PRAYERS, type FiveDailyPrayer } from './prayerTrackerStore';

/** Minutes after Adhan notification before gentle follow-up (system sound only). */
export const REMINDER_DELAY_OPTIONS = [5, 10, 15] as const;
export type ReminderDelayMinutes = (typeof REMINDER_DELAY_OPTIONS)[number];

type ByPrayer = Record<FiveDailyPrayer, boolean>;

const defaultByPrayer: ByPrayer = {
  Fajr: true,
  Dhuhr: true,
  Asr: true,
  Maghrib: true,
  Isha: true,
};

/** Per-prayer: send default-sound follow-up if prayer not marked completed. */
const defaultFollowUpByPrayer: ByPrayer = {
  Fajr: true,
  Dhuhr: true,
  Asr: true,
  Maghrib: true,
  Isha: true,
};

type PrayerReminderState = {
  masterEnabled: boolean;
  reminderDelayMinutes: ReminderDelayMinutes;
  /** Which prayers receive Adhan + optional follow-up chain. */
  byPrayer: ByPrayer;
  /** Per-prayer follow-up (system sound) after Adhan if not marked prayed. */
  followUpByPrayer: ByPrayer;
  setMasterEnabled: (v: boolean) => void;
  setReminderDelayMinutes: (v: ReminderDelayMinutes) => void;
  setPrayerEnabled: (p: FiveDailyPrayer, v: boolean) => void;
  setFollowUpEnabled: (p: FiveDailyPrayer, v: boolean) => void;
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
      reminderDelayMinutes: 10,
      byPrayer: { ...defaultByPrayer },
      followUpByPrayer: { ...defaultFollowUpByPrayer },

      setMasterEnabled: v => set({ masterEnabled: v }),
      setReminderDelayMinutes: v => set({ reminderDelayMinutes: v }),
      setPrayerEnabled: (p, v) =>
        set(s => ({ byPrayer: { ...s.byPrayer, [p]: v } })),
      setFollowUpEnabled: (p, v) =>
        set(s => ({ followUpByPrayer: { ...s.followUpByPrayer, [p]: v } })),
    }),
    {
      name: 'sazda-prayer-reminders',
      storage: mmkvStorage,
      partialize: s => ({
        masterEnabled: s.masterEnabled,
        reminderDelayMinutes: s.reminderDelayMinutes,
        byPrayer: s.byPrayer,
        followUpByPrayer: s.followUpByPrayer,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<PrayerReminderState> & { leadMinutes?: number } | undefined;
        if (!p) return current;
        let reminderDelayMinutes: ReminderDelayMinutes = current.reminderDelayMinutes;
        if (p.reminderDelayMinutes != null) {
          reminderDelayMinutes = p.reminderDelayMinutes;
        } else if (typeof p.leadMinutes === 'number') {
          const m = p.leadMinutes;
          reminderDelayMinutes =
            m >= 15 ? 15 : m >= 10 ? 10 : 5;
        }
        return {
          ...current,
          ...p,
          reminderDelayMinutes,
          followUpByPrayer: p.followUpByPrayer ?? { ...defaultFollowUpByPrayer },
        };
      },
    },
  ),
);

/** @deprecated legacy export */
export const LEAD_OPTIONS = [0, 5, 10, 15] as const;
export type LeadMinutes = (typeof LEAD_OPTIONS)[number];
