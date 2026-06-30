import { getAmbientGradient, goldSheen } from '../../src/theme/gradients';

describe('gradient tokens', () => {
  it('ambient gradient has >=2 stops for both schemes', () => {
    for (const scheme of ['light', 'dark'] as const) {
      const g = getAmbientGradient(scheme);
      expect(g.colors.length).toBeGreaterThanOrEqual(2);
      g.colors.forEach(c => expect(typeof c).toBe('string'));
      if (g.locations) {
        expect(g.locations.length).toBe(g.colors.length);
      }
    }
  });

  it('gold sheen is a valid stop set', () => {
    expect(goldSheen.colors.length).toBeGreaterThanOrEqual(2);
  });
});
