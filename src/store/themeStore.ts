import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkv } from '../services/storage';

export type ThemePreference = 'light' | 'dark' | 'system';

type ThemeState = {
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
};

const mmkvStorage = createJSONStorage(() => ({
  getItem: (name: string) => mmkv.getString(name) ?? null,
  setItem: (name: string, value: string) => mmkv.set(name, value),
  removeItem: (name: string) => mmkv.remove(name),
}));

export const useThemeStore = create<ThemeState>()(
  persist(
    set => ({
      preference: 'light',
      setPreference: p => set({ preference: p }),
    }),
    {
      name: 'sazda-theme',
      storage: mmkvStorage,
    },
  ),
);
