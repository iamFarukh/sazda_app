import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { AyahActionBar } from '../../src/screens/quran/components/AyahActionBar';
import { getReadingTheme } from '../../src/theme/readingThemes';

const base = {
  palette: getReadingTheme('light'), bookmarked: false,
  audio: { isActive: false, isPlaying: false, isLoading: false, hasAudio: true },
  onPlay: jest.fn(), onTafsir: jest.fn(), onToggleBookmark: jest.fn(), onShare: jest.fn(),
};

describe('AyahActionBar', () => {
  it('renders in idle, playing, loading, and no-audio states', () => {
    const variants = [
      base,
      { ...base, audio: { ...base.audio, isActive: true, isPlaying: true } },
      { ...base, audio: { ...base.audio, isActive: true, isLoading: true } },
      { ...base, audio: { ...base.audio, hasAudio: false } },
    ];
    for (const props of variants) {
      let tree: renderer.ReactTestRenderer;
      act(() => { tree = renderer.create(<AyahActionBar {...props} />); });
      expect(tree!.toJSON()).toBeTruthy();
      act(() => tree!.unmount());
    }
  });
});
