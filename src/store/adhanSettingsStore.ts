import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkv } from '../services/storage';
import { FIVE_DAILY_PRAYERS, type FiveDailyPrayer } from './prayerTrackerStore';

export type AdhanVolumeMode = 'LOUD' | 'SOFT' | 'SILENT';

export interface CustomSound {
  id: string; // Internal ID (e.g., 'custom_1234')
  name: string; // User-facing name
  uri: string; // Device file path
}

interface PrayerAdhanSettings {
  volumeMode: AdhanVolumeMode;
  soundId: string; // 'default' | 'makkah' | 'fajar' | 'soft' | 'adan_tune' | custom id
}

type ByPrayerAdhan = Record<FiveDailyPrayer, PrayerAdhanSettings>;

const defaultByPrayerAdhan: ByPrayerAdhan = {
  Fajr: { volumeMode: 'LOUD', soundId: 'fajar' },
  Dhuhr: { volumeMode: 'LOUD', soundId: 'makkah' },
  Asr: { volumeMode: 'LOUD', soundId: 'soft' },
  Maghrib: { volumeMode: 'LOUD', soundId: 'adan_tune' },
  Isha: { volumeMode: 'LOUD', soundId: 'adan_tune' },
};

interface AdhanSettingsState {
  masterEnabled: boolean;
  preReminderEnabled: boolean;
  vibrationEnabled: boolean;

  byPrayer: ByPrayerAdhan;
  customSounds: CustomSound[];

  setMasterEnabled: (enabled: boolean) => void;
  setPreReminderEnabled: (enabled: boolean) => void;
  setVibrationEnabled: (enabled: boolean) => void;

  setPrayerVolumeMode: (prayer: FiveDailyPrayer, mode: AdhanVolumeMode) => void;
  setPrayerSoundId: (prayer: FiveDailyPrayer, soundId: string) => void;
  
  addCustomSound: (sound: CustomSound) => void;
  removeCustomSound: (id: string) => void;
}

const mmkvStorage = createJSONStorage(() => ({
  getItem: (name: string) => mmkv.getString(name) ?? null,
  setItem: (name: string, value: string) => mmkv.set(name, value),
  removeItem: (name: string) => mmkv.remove(name),
}));

export const useAdhanSettingsStore = create<AdhanSettingsState>()(
  persist(
    (set) => ({
      masterEnabled: true,
      preReminderEnabled: true,
      vibrationEnabled: true,

      byPrayer: { ...defaultByPrayerAdhan },
      customSounds: [],

      setMasterEnabled: (v) => set({ masterEnabled: v }),
      setPreReminderEnabled: (v) => set({ preReminderEnabled: v }),
      setVibrationEnabled: (v) => set({ vibrationEnabled: v }),

      setPrayerVolumeMode: (p, mode) => 
        set((s) => ({ byPrayer: { ...s.byPrayer, [p]: { ...s.byPrayer[p], volumeMode: mode } } })),
      setPrayerSoundId: (p, soundId) => 
        set((s) => ({ byPrayer: { ...s.byPrayer, [p]: { ...s.byPrayer[p], soundId } } })),
        
      addCustomSound: (sound) =>
        set((s) => ({ customSounds: [...s.customSounds, sound] })),
      removeCustomSound: (id) =>
        set((s) => {
          // If a removed sound is used by a prayer, reset it to default
          let newByPrayer = { ...s.byPrayer };
          FIVE_DAILY_PRAYERS.forEach(p => {
            if (newByPrayer[p].soundId === id) {
              newByPrayer[p] = { ...newByPrayer[p], soundId: 'default' };
            }
          });
          return {
            customSounds: s.customSounds.filter((cs) => cs.id !== id),
            byPrayer: newByPrayer,
          };
        }),
    }),
    {
      name: 'sazda-adhan-settings',
      storage: mmkvStorage,
      merge: (persisted, current) => {
        const base = { ...current, ...(persisted as Partial<AdhanSettingsState>) };
        const byPrayer = { ...base.byPrayer };
        FIVE_DAILY_PRAYERS.forEach((p) => {
          const row = byPrayer[p];
          if (row?.soundId === 'madinah') {
            byPrayer[p] = { ...row, soundId: 'adan_tune' };
          }
        });
        return { ...base, byPrayer };
      },
    }
  )
);
