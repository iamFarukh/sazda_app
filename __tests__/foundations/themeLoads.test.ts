import { motionDurations, motionEasing, springs } from '../../src/theme/motion';

describe('theme motion tokens load under jest', () => {
  it('exposes durations, easing functions, and spring presets', () => {
    expect(motionDurations.base).toBeGreaterThan(0);
    expect(typeof motionEasing.standardOut).toBe('function');
    expect(typeof motionEasing.inOutSine).toBe('function');
    expect(springs.press.stiffness).toBeGreaterThan(0);
  });
});
