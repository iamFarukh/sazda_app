import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '../services/storage';

type State = {
  /** User completed or dismissed the first-run prayer notification prompt. */
  hasSeenNotificationPrompt: boolean;
  completeNotificationPrompt: () => void;
  /** Set when user taps “Turn on notifications” — triggers one-time welcome ping (not persisted). */
  pendingWelcomeContextNotification: boolean;
  setPendingWelcomeContextNotification: (v: boolean) => void;
};


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
      storage: zustandStorage,
      partialize: s => ({ hasSeenNotificationPrompt: s.hasSeenNotificationPrompt }),
    },
  ),
);
