import { ringGeometry } from '../../src/components/atoms/ProgressRing/ringGeometry';

describe('ringGeometry', () => {
  it('full progress yields zero dash offset; zero progress yields full circumference', () => {
    const r = 20;
    const circ = 2 * Math.PI * r;
    expect(ringGeometry(1, r).dashOffset).toBeCloseTo(0, 5);
    expect(ringGeometry(0, r).dashOffset).toBeCloseTo(circ, 5);
    expect(ringGeometry(0, r).circumference).toBeCloseTo(circ, 5);
  });

  it('clamps out-of-range progress', () => {
    const r = 20;
    expect(ringGeometry(1.5, r).dashOffset).toBeCloseTo(0, 5);
    expect(ringGeometry(-1, r).dashOffset).toBeCloseTo(2 * Math.PI * r, 5);
  });
});
