import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { ShareVerseCard } from '../../src/components/atoms/ShareVerseCard/ShareVerseCard';
import { getReadingTheme } from '../../src/theme/readingThemes';

describe('ShareVerseCard', () => {
  it('renders with and without a translation', () => {
    for (const translation of ['In the name of God', undefined]) {
      let tree: renderer.ReactTestRenderer;
      act(() => {
        tree = renderer.create(
          <ShareVerseCard palette={getReadingTheme('light')} arabic="ARABIC"
            translation={translation} surahEnglishName="Al-Baqarah" surahNumber={2} ayahNumber={255} />,
        );
      });
      expect(tree!.toJSON()).toBeTruthy();
      act(() => tree!.unmount());
    }
  });
});
