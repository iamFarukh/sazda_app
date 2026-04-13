import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '../services/storage';

export type ThemePreference = 'light' | 'dark' | 'system';

type ThemeState = {
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
};


export const useThemeStore = create<ThemeState>()(
  persist(
    set => ({
      preference: 'light',
      setPreference: p => set({ preference: p }),
    }),
    {
      name: 'sazda-theme',
      storage: zustandStorage,
    },
  ),
);
