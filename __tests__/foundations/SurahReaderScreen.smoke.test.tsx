import React from 'react';
import renderer, { act } from 'react-test-renderer';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: { surahNumber: 2, ayahNumber: 1 } }),
}));
jest.mock('@react-navigation/bottom-tabs', () => ({ useBottomTabBarHeight: () => 64 }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
// Mock the audio store so the (untransformed) react-native-sound import chain is not pulled in.
jest.mock('../../src/store/quranAudioStore', () => {
  const state = {
    currentSurahNumber: null,
    currentAyahNumber: null,
    audioUrl: null,
    isPlaying: false,
    isLoading: false,
    playAyah: jest.fn(async () => {}),
  };
  const useQuranAudioStore = (selector?: (s: typeof state) => unknown) =>
    selector ? selector(state) : state;
  useQuranAudioStore.getState = () => state;
  return { useQuranAudioStore };
});

// Distinct data for surah 2 and 3 so append logic can be exercised.
jest.mock('../../src/services/offlineQuran/reader', () => {
  const surahs: Record<number, unknown> = {
    2: {
      surah: { number: 2, name: 'البقرة', englishName: 'Al-Baqarah', englishNameTranslation: 'The Cow', numberOfAyahs: 2, revelationType: 'Medinan' },
      ayahs: [
        { numberInSurah: 1, arabic: 'B1', translation: 't1', audioUrl: 'file://b1' },
        { numberInSurah: 2, arabic: 'B2', translation: 't2', audioUrl: 'file://b2' },
      ],
    },
    3: {
      surah: { number: 3, name: 'آل عمران', englishName: 'Aal-E-Imran', englishNameTranslation: 'The Family of Imran', numberOfAyahs: 2, revelationType: 'Medinan' },
      ayahs: [
        { numberInSurah: 1, arabic: 'I1', translation: 't1', audioUrl: 'file://i1' },
        { numberInSurah: 2, arabic: 'I2', translation: 't2', audioUrl: 'file://i2' },
      ],
    },
  };
  return { loadSurahReaderDataOfflineFirst: jest.fn(async (n: number) => surahs[n] ?? surahs[2]) };
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SurahReaderScreen } from '../../src/screens/quran/SurahReaderScreen';

describe('SurahReaderScreen (continuous smoke)', () => {
  it('mounts a SectionList reader without crashing', () => {
    const qc = new QueryClient();
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <QueryClientProvider client={qc}><SurahReaderScreen /></QueryClientProvider>,
      );
    });
    expect(tree!.toJSON()).toBeTruthy();
    act(() => tree!.unmount());
  });

  it('appends the next surah when the end is reached', async () => {
    const qc = new QueryClient();
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <QueryClientProvider client={qc}><SurahReaderScreen /></QueryClientProvider>,
      );
    });
    // Flush the seed query + prefetch.
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    // Find the SectionList and fire onEndReached.
    const list = tree!.root.findByType(require('react-native').SectionList);
    await act(async () => { list.props.onEndReached?.(); await Promise.resolve(); await Promise.resolve(); });
    // Two sections now present => next surah appended.
    const updated = tree!.root.findByType(require('react-native').SectionList);
    expect(updated.props.sections.length).toBeGreaterThanOrEqual(2);
    act(() => tree!.unmount());
  });
});
