import React from 'react';
import renderer, { act } from 'react-test-renderer';
import {
  SurahOpeningHeader,
  revealedLabel,
} from '../../src/screens/quran/components/SurahOpeningHeader';
import { getReadingTheme } from '../../src/theme/readingThemes';

describe('revealedLabel', () => {
  it('maps revelation type to a human label', () => {
    expect(revealedLabel('Meccan')).toBe('Revealed in Makkah');
    expect(revealedLabel('Medinan')).toBe('Revealed in Madinah');
  });
});

describe('SurahOpeningHeader', () => {
  it('renders across themes without crashing', () => {
    for (const t of ['light', 'sepia', 'dark'] as const) {
      let tree: renderer.ReactTestRenderer;
      act(() => {
        tree = renderer.create(
          <SurahOpeningHeader
            palette={getReadingTheme(t)}
            arabicName="الفاتحة"
            englishName="Al-Faatiha"
            translation="The Opening"
            ayahCount={7}
            revelationType="Meccan"
          />,
        );
      });
      expect(tree!.toJSON()).toBeTruthy();
      act(() => tree!.unmount());
    }
  });
});
