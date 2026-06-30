import * as theme from '../../src/theme';

describe('theme barrel', () => {
  it('re-exports the new foundation tokens', () => {
    expect(theme.getReadingTheme).toBeDefined();
    expect(theme.getAmbientGradient).toBeDefined();
    expect(theme.motionPresets).toBeDefined();
    expect(theme.durationFor).toBeDefined();
  });
});
