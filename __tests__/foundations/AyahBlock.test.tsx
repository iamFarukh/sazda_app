import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { AyahBlock } from '../../src/screens/quran/components/AyahBlock';
import { getReadingTheme } from '../../src/theme/readingThemes';

const liveScale = { value: 1 } as any;
const base = {
  item: { numberInSurah: 5, arabic: 'ARABIC', translation: 'meaning', audioUrl: 'file://x' },
  palette: getReadingTheme('light'), showTranslation: true, bookmarked: false, liveScale,
  audio: { isActive: false, isPlaying: false, isLoading: false, hasAudio: true },
  onPlay: jest.fn(), onTafsir: jest.fn(), onToggleBookmark: jest.fn(), onShare: jest.fn(),
};

describe('AyahBlock', () => {
  it('renders idle, active (breathing), and translation-hidden states', () => {
    const variants = [
      base,
      { ...base, audio: { ...base.audio, isActive: true, isPlaying: true } },
      { ...base, showTranslation: false },
      { ...base, item: { ...base.item, audioUrl: null, translation: undefined } },
    ];
    for (const props of variants) {
      let tree: renderer.ReactTestRenderer;
      act(() => { tree = renderer.create(<AyahBlock {...props} />); });
      expect(tree!.toJSON()).toBeTruthy();
      act(() => tree!.unmount());
    }
  });
});
