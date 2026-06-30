import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '../services/storage';

type MotionPrefState = {
  /** User opt-in for ambient motion/Lottie. Default on; OS reduce-motion still overrides. */
  ambientEnabled: boolean;
  setAmbientEnabled: (v: boolean) => void;
};

export const useMotionPrefStore = create<MotionPrefState>()(
  persist(
    set => ({
      ambientEnabled: true,
      setAmbientEnabled: v => set({ ambientEnabled: v }),
    }),
    {
      name: 'motion-pref-v1',
      storage: zustandStorage,
    },
  ),
);
