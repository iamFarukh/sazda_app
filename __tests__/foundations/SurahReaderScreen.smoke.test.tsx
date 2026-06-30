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

jest.mock('../../src/services/offlineQuran/reader', () => ({
  loadSurahReaderDataOfflineFirst: jest.fn(async () => ({
    surah: { number: 2, name: 'البقرة', englishName: 'Al-Baqarah', englishNameTranslation: 'The Cow', numberOfAyahs: 2, revelationType: 'Medinan' },
    ayahs: [
      { numberInSurah: 1, arabic: 'A1', translation: 't1', audioUrl: 'file://a1' },
      { numberInSurah: 2, arabic: 'A2', translation: 't2', audioUrl: 'file://a2' },
    ],
  })),
}));

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SurahReaderScreen } from '../../src/screens/quran/SurahReaderScreen';

describe('SurahReaderScreen (smoke)', () => {
  it('mounts without crashing', () => {
    const qc = new QueryClient();
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<QueryClientProvider client={qc}><SurahReaderScreen /></QueryClientProvider>);
    });
    expect(tree!.toJSON()).toBeTruthy();
    act(() => tree!.unmount());
  });
});
