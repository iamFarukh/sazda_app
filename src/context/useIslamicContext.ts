import { create } from 'zustand';
import { islamicThemeConfig, resolveIslamicMode, type AppMode, type ThemeModeConfig } from '../theme/islamicThemeConfig';

interface IslamicContextState {
  mode: AppMode;
  config: ThemeModeConfig;
  /**
   * Recalculates mode if the day has changed (e.g. app stayed open past midnight).
   * Usually invoked on app resume/focus.
   */
  revalidate: () => void;
}

/**
 * Lightweight store determining current Islamic Day Context.
 * Evaluated instantaneously without async operations to ensure 0ms render delay on Splash.
 */
export const useIslamicContext = create<IslamicContextState>((set) => {
  const mode = resolveIslamicMode(new Date());
  
  return {
    mode,
    config: islamicThemeConfig[mode],
    revalidate: () => {
      const currentMode = resolveIslamicMode(new Date());
      set((s) => {
        if (s.mode === currentMode) return s;
        return { mode: currentMode, config: islamicThemeConfig[currentMode] };
      });
    },
  };
});
