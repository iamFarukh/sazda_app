import { resolveAmbientEnabled } from '../../src/hooks/useAmbientEnabled';
import { useMotionPrefStore } from '../../src/store/motionPrefStore';

describe('ambient motion preference', () => {
  it('resolver: ambient only when user opts in AND OS reduce-motion is off', () => {
    expect(resolveAmbientEnabled(true, false)).toBe(true);
    expect(resolveAmbientEnabled(true, true)).toBe(false);
    expect(resolveAmbientEnabled(false, false)).toBe(false);
    expect(resolveAmbientEnabled(false, true)).toBe(false);
  });

  it('store defaults ambient on and can toggle', () => {
    expect(useMotionPrefStore.getState().ambientEnabled).toBe(true);
    useMotionPrefStore.getState().setAmbientEnabled(false);
    expect(useMotionPrefStore.getState().ambientEnabled).toBe(false);
    useMotionPrefStore.getState().setAmbientEnabled(true);
  });
});
