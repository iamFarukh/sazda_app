import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { StickySurahBar } from '../../src/screens/quran/components/StickySurahBar';
import { getReadingTheme } from '../../src/theme/readingThemes';

describe('StickySurahBar', () => {
  it('renders the current surah name across themes and re-renders on change', () => {
    for (const t of ['light', 'sepia', 'dark'] as const) {
      let tree: renderer.ReactTestRenderer;
      act(() => {
        tree = renderer.create(
          <StickySurahBar palette={getReadingTheme(t)} englishName="Al-Baqarah" reduceMotion />,
        );
      });
      expect(tree!.toJSON()).toBeTruthy();
      act(() => {
        tree!.update(
          <StickySurahBar palette={getReadingTheme(t)} englishName="Aal-E-Imran" reduceMotion />,
        );
      });
      expect(tree!.toJSON()).toBeTruthy();
      act(() => tree!.unmount());
    }
  });

  it('renders nothing when there is no current surah', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <StickySurahBar palette={getReadingTheme('light')} englishName={null} reduceMotion />,
      );
    });
    expect(tree!.toJSON()).toBeNull();
    act(() => tree!.unmount());
  });
});
