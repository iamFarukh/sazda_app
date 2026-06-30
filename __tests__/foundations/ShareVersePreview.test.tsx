import React from 'react';
import { Share } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import { ShareVersePreview } from '../../src/screens/quran/components/ShareVersePreview';
import { getReadingTheme } from '../../src/theme/readingThemes';

const verse = { arabic: 'ARABIC', translation: 'meaning', surahEnglishName: 'Al-Baqarah', surahNumber: 2, ayahNumber: 255 };

describe('ShareVersePreview', () => {
  it('renders when visible and null-safe when verse is null', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<ShareVersePreview palette={getReadingTheme('light')} visible verse={verse} onClose={jest.fn()} />); });
    expect(tree!.toJSON()).toBeTruthy();
    act(() => tree!.unmount());
    act(() => { tree = renderer.create(<ShareVersePreview palette={getReadingTheme('light')} visible={false} verse={null} onClose={jest.fn()} />); });
    act(() => tree!.unmount());
  });
  it('invokes Share.share with the built text', () => {
    const spy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as any);
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<ShareVersePreview palette={getReadingTheme('light')} visible verse={verse} onClose={jest.fn()} />); });
    const btn = tree!.root.findByProps({ testID: 'share-text-btn' });
    act(() => btn.props.onPress());
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].message).toContain('Al-Baqarah 2:255');
    act(() => tree!.unmount());
    spy.mockRestore();
  });
});
