import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkv } from '../services/storage';

type State = {
  /** One-time contextual welcome ping after notifications are first enabled. */
  hasSentWelcomeContextNotification: boolean;
  markWelcomeContextSent: () => void;
};

const mmkvStorage = createJSONStorage(() => ({
  getItem: (name: string) => mmkv.getString(name) ?? null,
  setItem: (name: string, value: string) => mmkv.set(name, value),
  removeItem: (name: string) => mmkv.remove(name),
}));

export const useWelcomeNotificationStore = create<State>()(
  persist(
    set => ({
      hasSentWelcomeContextNotification: false,
      markWelcomeContextSent: () => set({ hasSentWelcomeContextNotification: true }),
    }),
    {
      name: 'sazda-welcome-notification',
      storage: mmkvStorage,
      partialize: s => ({ hasSentWelcomeContextNotification: s.hasSentWelcomeContextNotification }),
    },
  ),
);
