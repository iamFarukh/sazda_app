import {
  motionPresets,
  durationFor,
} from '../../src/theme/motionPresets';

describe('motion presets', () => {
  it('exposes the semantic presets', () => {
    expect(motionPresets.enter.duration).toBeGreaterThan(0);
    expect(motionPresets.breathe.minOpacity).toBeLessThan(motionPresets.breathe.maxOpacity);
    expect(motionPresets.press.stiffness).toBeGreaterThan(0);
  });

  it('durationFor collapses to 0 when reduce-motion is on', () => {
    expect(durationFor(320, false)).toBe(320);
    expect(durationFor(320, true)).toBe(0);
  });
});
