import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '../services/storage';

type State = {
  /** One-time contextual welcome ping after notifications are first enabled. */
  hasSentWelcomeContextNotification: boolean;
  markWelcomeContextSent: () => void;
};


export const useWelcomeNotificationStore = create<State>()(
  persist(
    set => ({
      hasSentWelcomeContextNotification: false,
      markWelcomeContextSent: () => set({ hasSentWelcomeContextNotification: true }),
    }),
    {
      name: 'sazda-welcome-notification',
      storage: zustandStorage,
      partialize: s => ({ hasSentWelcomeContextNotification: s.hasSentWelcomeContextNotification }),
    },
  ),
);
