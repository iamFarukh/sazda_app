import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '../services/storage';

type AppState = {
  hasSeenOnboarding: boolean;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
};


export const useAppStore = create<AppState>()(
  persist(
    set => ({
      hasSeenOnboarding: false,
      completeOnboarding: () => set({ hasSeenOnboarding: true }),
      resetOnboarding: () => set({ hasSeenOnboarding: false }),
    }),
    {
      name: 'sazda-app',
      storage: zustandStorage,
      partialize: s => ({ hasSeenOnboarding: s.hasSeenOnboarding }),
    },
  ),
);

