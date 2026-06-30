import { progressFromWindow } from '../../src/components/atoms/ProgressRing/ProgressRing';

describe('progressFromWindow', () => {
  it('maps now within [start,end] to 0..1 and clamps', () => {
    expect(progressFromWindow(0, 0, 100)).toBeCloseTo(0, 5);
    expect(progressFromWindow(50, 0, 100)).toBeCloseTo(0.5, 5);
    expect(progressFromWindow(100, 0, 100)).toBeCloseTo(1, 5);
    expect(progressFromWindow(150, 0, 100)).toBeCloseTo(1, 5);
    expect(progressFromWindow(-10, 0, 100)).toBeCloseTo(0, 5);
  });
  it('returns 0 for a non-positive window', () => {
    expect(progressFromWindow(10, 100, 100)).toBe(0);
    expect(progressFromWindow(10, 100, 50)).toBe(0);
  });
});
