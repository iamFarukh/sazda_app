import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkv } from '../services/storage';

type State = {
  /** User completed or dismissed the first-run prayer notification prompt. */
  hasSeenNotificationPrompt: boolean;
  completeNotificationPrompt: () => void;
  /** Set when user taps “Turn on notifications” — triggers one-time welcome ping (not persisted). */
  pendingWelcomeContextNotification: boolean;
  setPendingWelcomeContextNotification: (v: boolean) => void;
};

const mmkvStorage = createJSONStorage(() => ({
  getItem: (name: string) => mmkv.getString(name) ?? null,
  setItem: (name: string, value: string) => mmkv.set(name, value),
  removeItem: (name: string) => mmkv.remove(name),
}));

export const useNotificationOnboardingStore = create<State>()(
  persist(
    set => ({
      hasSeenNotificationPrompt: false,
      completeNotificationPrompt: () => set({ hasSeenNotificationPrompt: true }),
      pendingWelcomeContextNotification: false,
      setPendingWelcomeContextNotification: v => set({ pendingWelcomeContextNotification: v }),
    }),
    {
      name: 'sazda-notification-onboarding',
      storage: mmkvStorage,
      partialize: s => ({ hasSeenNotificationPrompt: s.hasSeenNotificationPrompt }),
    },
  ),
);
