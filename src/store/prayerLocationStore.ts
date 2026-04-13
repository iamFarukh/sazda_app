import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '../services/storage';

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


export const usePrayerLocationStore = create<State>()(
  persist(
    set => ({
      saved: null,
      setSaved: v => set({ saved: v }),
      clear: () => set({ saved: null }),
    }),
    {
      name: 'sazda-prayer-location',
      storage: zustandStorage,
      partialize: s => ({ saved: s.saved }),
    },
  ),
);
