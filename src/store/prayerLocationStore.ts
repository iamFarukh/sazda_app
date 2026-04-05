import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkv } from '../services/storage';

export type SavedPrayerLocation = {
  latitude: number;
  longitude: number;
  city: string;
  updatedAt: number;
};

type State = {
  saved: SavedPrayerLocation | null;
  setSaved: (v: SavedPrayerLocation) => void;
  clear: () => void;
};

const mmkvStorage = createJSONStorage(() => ({
  getItem: (name: string) => mmkv.getString(name) ?? null,
  setItem: (name: string, value: string) => mmkv.set(name, value),
  removeItem: (name: string) => mmkv.remove(name),
}));

export const usePrayerLocationStore = create<State>()(
  persist(
    set => ({
      saved: null,
      setSaved: v => set({ saved: v }),
      clear: () => set({ saved: null }),
    }),
    {
      name: 'sazda-prayer-location',
      storage: mmkvStorage,
      partialize: s => ({ saved: s.saved }),
    },
  ),
);
