import React from 'react';
import renderer, { act } from 'react-test-renderer';
import {
  SurahTransition,
  completionLine,
} from '../../src/screens/quran/components/SurahTransition';
import { getReadingTheme } from '../../src/theme/readingThemes';

describe('completionLine', () => {
  it('names the completed surah', () => {
    expect(completionLine('Al-Baqarah')).toBe("You've completed Surah Al-Baqarah");
  });
});

describe('SurahTransition', () => {
  it('renders across themes without crashing', () => {
    for (const t of ['light', 'sepia', 'dark'] as const) {
      let tree: renderer.ReactTestRenderer;
      act(() => {
        tree = renderer.create(
          <SurahTransition palette={getReadingTheme(t)} englishName="Al-Baqarah" />,
        );
      });
      expect(tree!.toJSON()).toBeTruthy();
      act(() => tree!.unmount());
    }
  });
});
