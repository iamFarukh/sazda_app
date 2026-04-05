import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkv } from '../services/storage';

export type TasbeehPhaseId = 'subhan' | 'hamd' | 'takbir';

/** Counter goal: classic 33+33+34, single 100, or user-defined. */
export type TasbeehGoalMode = 'traditional33' | 'single100' | 'custom';

const TARGETS: Record<TasbeehPhaseId, number> = {
  subhan: 33,
  hamd: 33,
  takbir: 34,
};

const PHASE_ORDER: TasbeehPhaseId[] = ['subhan', 'hamd', 'takbir'];

export const TASBEEH_LABELS: Record<TasbeehPhaseId, string> = {
  subhan: 'Subḥān Allāh',
  hamd: 'Alḥamdulillāh',
  takbir: 'Allāhu akbar',
};

/** Short Latin titles (Stitch-style headers). */
export const TASBEEH_DISPLAY_TITLE: Record<TasbeehPhaseId, string> = {
  subhan: 'SubhanAllah',
  hamd: 'Alhamdulillah',
  takbir: 'Allahu Akbar',
};

export const TASBEEH_EN_SUBTITLE: Record<TasbeehPhaseId, string> = {
  subhan: 'Glory be to Allah',
  hamd: 'All praise is due to Allah',
  takbir: 'Allah is the Greatest',
};

function clampCustom(n: number): number {
  if (!Number.isFinite(n)) return 33;
  return Math.max(1, Math.min(9999, Math.round(n)));
}

type TasbeehState = {
  phaseIndex: number;
  /** Count for the active segment / goal. */
  currentCount: number;
  cycles: number;
  goalMode: TasbeehGoalMode;
  /** Used when `goalMode === 'custom'`. */
  customTarget: number;
  /** Light haptic on each tap (persisted). */
  hapticsEnabled: boolean;

  setHapticsEnabled: (v: boolean) => void;
  setGoalMode: (mode: Exclude<TasbeehGoalMode, 'custom'>) => void;
  /** Set custom target, switch to custom mode, reset current progress. */
  applyCustomGoal: (target: number) => void;

  getPhase: () => TasbeehPhaseId;
  getTarget: () => number;
  getLabel: () => string;
  tap: () => void;
  resetPhase: () => void;
  resetAll: () => void;
};

const mmkvStorage = createJSONStorage(() => ({
  getItem: (name: string) => mmkv.getString(name) ?? null,
  setItem: (name: string, value: string) => mmkv.set(name, value),
  removeItem: (name: string) => mmkv.remove(name),
}));

export const useTasbeehStore = create<TasbeehState>()(
  persist(
    (set, get) => ({
      phaseIndex: 0,
      currentCount: 0,
      cycles: 0,
      goalMode: 'traditional33',
      customTarget: 33,
      hapticsEnabled: true,

      setHapticsEnabled: v => set({ hapticsEnabled: v }),

      setGoalMode: mode =>
        set({
          goalMode: mode,
          phaseIndex: 0,
          currentCount: 0,
        }),

      applyCustomGoal: target =>
        set({
          customTarget: clampCustom(target),
          goalMode: 'custom',
          phaseIndex: 0,
          currentCount: 0,
        }),

      getPhase: () => PHASE_ORDER[get().phaseIndex] ?? 'subhan',

      getTarget: () => {
        const s = get();
        if (s.goalMode === 'traditional33') {
          const phase = PHASE_ORDER[s.phaseIndex] ?? 'subhan';
          return TARGETS[phase];
        }
        if (s.goalMode === 'single100') return 100;
        return clampCustom(s.customTarget);
      },

      getLabel: () => TASBEEH_LABELS[get().getPhase()],

      tap: () =>
        set(state => {
          const mode = state.goalMode;
          let target: number;
          if (mode === 'traditional33') {
            const phase = PHASE_ORDER[state.phaseIndex] ?? 'subhan';
            target = TARGETS[phase];
          } else if (mode === 'single100') {
            target = 100;
          } else {
            target = clampCustom(state.customTarget);
          }

          const next = state.currentCount + 1;
          if (next < target) {
            return { currentCount: next };
          }

          if (mode === 'traditional33') {
            const nextPhaseIndex = state.phaseIndex + 1;
            if (nextPhaseIndex >= PHASE_ORDER.length) {
              return {
                phaseIndex: 0,
                currentCount: 0,
                cycles: state.cycles + 1,
              };
            }
            return {
              phaseIndex: nextPhaseIndex,
              currentCount: 0,
            };
          }

          return {
            currentCount: 0,
            cycles: state.cycles + 1,
          };
        }),

      resetPhase: () => set({ currentCount: 0 }),

      resetAll: () =>
        set({
          phaseIndex: 0,
          currentCount: 0,
          cycles: 0,
        }),
    }),
    {
      name: 'sazda-tasbeeh',
      storage: mmkvStorage,
      partialize: s => ({
        phaseIndex: s.phaseIndex,
        currentCount: s.currentCount,
        cycles: s.cycles,
        hapticsEnabled: s.hapticsEnabled,
        goalMode: s.goalMode,
        customTarget: s.customTarget,
      }),
    },
  ),
);

export { TARGETS, PHASE_ORDER };
