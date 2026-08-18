import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeInDown,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { ArrowLeft, Languages, Settings } from 'lucide-react-native';
import { SazdaText } from '../../components/atoms/SazdaText/SazdaText';
import { BismillahReveal } from '../../components/atoms/BismillahReveal/BismillahReveal';
import { SurahOpeningHeader } from './components/SurahOpeningHeader';
import { SurahTransition } from './components/SurahTransition';
import { StickySurahBar } from './components/StickySurahBar';
import { hapticLight } from '../../utils/appHaptics';
import type { QuranStackParamList } from '../../navigation/types';
import { OFFLINE_QURAN_VERSION } from '../../services/offlineQuran/constants';
import { loadSurahReaderDataOfflineFirst } from '../../services/offlineQuran/reader';
import type { AyahReaderRow } from '../../services/quranApi';
import { getReaderPalette } from '../../services/quran/readerTheme';
import type { ReadingThemePalette } from '../../theme/readingThemes';
import {
  shouldShowBismillah,
  isActiveAyah,
  type ShareVerseInput,
} from '../../services/quran/readerLogic';
import {
  buildSection,
  nextSurahNumber,
  topVisibleSurah,
  type ReaderSection,
  type ReaderViewToken,
} from '../../services/quran/continuousReading';
import { useQuranProgressStore } from '../../store/quranProgressStore';
import { useQuranAudioStore, type QuranAudioQueueItem } from '../../store/quranAudioStore';
import { spacing } from '../../theme/spacing';
import { motionPresets, durationFor } from '../../theme/motionPresets';
import { useReduceMotion } from '../../hooks';
import { AyahBlock } from './components/AyahBlock';
import { ReaderSettingsModal } from './components/ReaderSettingsModal';
import { ShareVersePreview } from './components/ShareVersePreview';
import { ReaderAudioPlayerSheet } from './components/ReaderAudioPlayerSheet';

type Nav = NativeStackNavigationProp<QuranStackParamList, 'SurahReader'>;
type R = RouteProp<QuranStackParamList, 'SurahReader'>;

const VIEW_CFG = { itemVisiblePercentThreshold: 55, minimumViewTime: 180 } as const;
const MIN_SCALE = 0.85;
const MAX_SCALE = 1.6;
const SCALE_EPS = 0.01;

function createReaderStyles(p: ReadingThemePalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: p.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      gap: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: p.divider,
    },
    backHit: { width: 44, height: 44, justifyContent: 'center' },
    headerTitle: { flex: 1, minWidth: 0 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    langHit: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    settingsHit: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    loader: { marginTop: spacing.x3xl },
    errorBox: { padding: spacing.xl },
    listWrap: { flex: 1 },
    listContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      paddingTop: spacing.md,
    },
  });
}

export function SurahReaderScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const { surahNumber, ayahNumber = 1 } = route.params;
  const tabBarHeight = useBottomTabBarHeight();
  const listRef = useRef<SectionList<AyahReaderRow, ReaderSection>>(null);
  const [containerH, setContainerH] = useState(0);
  const scrolledRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const scheduleRef = useRef<(ayah: number) => void>(() => {});
  const toastTextRef = useRef<string | null>(null);
  const [toastText, setToastText] = useState<string | null>(null);
  const toastOpacity = useSharedValue(0);
  const baseScale = useSharedValue(1);
  const pinchScale = useSharedValue(1);
  const liveScale = useSharedValue(1);
  const lastApplied = useSharedValue(1);
  const hitMinThisGesture = useSharedValue(false);
  const hitMaxThisGesture = useSharedValue(false);

  // Continuous-reading section state.
  const [sections, setSections] = useState<ReaderSection[]>([]);
  const sectionsRef = useRef<ReaderSection[]>([]);
  sectionsRef.current = sections;
  const loadedRef = useRef<Set<number>>(new Set());
  const appendingRef = useRef(false);
  const [currentSurahName, setCurrentSurahName] = useState<string | null>(null);

  const surahReaderTheme = useQuranProgressStore(s => s.surahReaderTheme ?? 'light');
  const surahReaderFontScale = useQuranProgressStore(s => s.surahReaderFontScale ?? 1);
  const setSurahReaderTheme = useQuranProgressStore(s => s.setSurahReaderTheme);
  const setSurahReaderFontScale = useQuranProgressStore(s => s.setSurahReaderFontScale);

  const palette = useMemo(() => getReaderPalette(surahReaderTheme), [surahReaderTheme]);
  const styles = useMemo(() => createReaderStyles(palette), [palette]);
  const reduceMotion = useReduceMotion();
  const scheme = surahReaderTheme === 'dark' ? 'dark' : 'light';

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [verseToShare, setVerseToShare] = useState<ShareVerseInput | null>(null);

  const isBookmarked = useQuranProgressStore(s => s.isBookmarked);
  const addBookmark = useQuranProgressStore(s => s.addBookmark);
  const removeBookmark = useQuranProgressStore(s => s.removeBookmark);
  const showTranslation = useQuranProgressStore(s => s.showTranslation);
  const setShowTranslation = useQuranProgressStore(s => s.setShowTranslation);

  // IMPORTANT: Avoid returning a new object from zustand selector (React/Fabric can loop).
  const audioCurrentSurahNumber = useQuranAudioStore(s => s.currentSurahNumber);
  const audioCurrentAyahNumber = useQuranAudioStore(s => s.currentAyahNumber);
  const audioIsPlaying = useQuranAudioStore(s => s.isPlaying);
  const audioIsLoading = useQuranAudioStore(s => s.isLoading);
  const audioUrlActive = useQuranAudioStore(s => s.audioUrl);
  const playAyahGlobal = useQuranAudioStore(s => s.playAyah);
  const queryClient = useQueryClient();

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['quran', 'reader', surahNumber, OFFLINE_QURAN_VERSION],
    queryFn: () => loadSurahReaderDataOfflineFirst(surahNumber),
    staleTime: 1000 * 60 * 60 * 6,
  });

  /** Warm the React Query cache for a surah so appending it later is instant (no spinner). */
  const prefetchSurah = useCallback(
    (n: number | null) => {
      if (!n) return;
      void queryClient.prefetchQuery({
        queryKey: ['quran', 'reader', n, OFFLINE_QURAN_VERSION],
        queryFn: () => loadSurahReaderDataOfflineFirst(n),
        staleTime: 1000 * 60 * 60 * 6,
      });
    },
    [queryClient],
  );

  // Seed the first section when the opened surah's data resolves; prefetch the next surah.
  useEffect(() => {
    if (!data?.surah) return;
    const seed = buildSection(data);
    loadedRef.current = new Set([data.surah.number]);
    setSections([seed]);
    setCurrentSurahName(data.surah.englishName);
    prefetchSurah(nextSurahNumber(data.surah.number));
  }, [data, prefetchSurah]);

  /** Append the next surah as a new section when the reader nears the end. Silent, guarded. */
  const appendNext = useCallback(async () => {
    if (appendingRef.current) return;
    const loaded = loadedRef.current;
    if (loaded.size === 0) return;
    const maxLoaded = Math.max(...loaded);
    const nextN = nextSurahNumber(maxLoaded);
    if (!nextN || loaded.has(nextN)) return;
    appendingRef.current = true;
    try {
      const nextData = await queryClient.fetchQuery({
        queryKey: ['quran', 'reader', nextN, OFFLINE_QURAN_VERSION],
        queryFn: () => loadSurahReaderDataOfflineFirst(nextN),
        staleTime: 1000 * 60 * 60 * 6,
      });
      if (nextData?.surah && !loadedRef.current.has(nextN)) {
        loadedRef.current = new Set([...loadedRef.current, nextN]);
        setSections(prev => [...prev, buildSection(nextData)]);
        prefetchSurah(nextSurahNumber(nextN));
      }
    } catch {
      // Silent: reaching the end without a next surah shouldn't interrupt reading.
    } finally {
      appendingRef.current = false;
    }
  }, [prefetchSurah, queryClient]);

  useEffect(() => {
    useQuranProgressStore.getState().touchRecentSurah(surahNumber);
  }, [surahNumber]);

  useEffect(() => {
    useQuranProgressStore.getState().setLastRead(surahNumber, ayahNumber);
  }, [surahNumber, ayahNumber]);

  useEffect(() => {
    scrolledRef.current = false;
  }, [surahNumber, ayahNumber]);

  const scheduleLastRead = useCallback(
    (ayah: number) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const st = useQuranProgressStore.getState();
        st.setLastRead(surahNumber, ayah);
        st.recordAyahEngagement(surahNumber, ayah);
      }, 420);
    },
    [surahNumber],
  );

  scheduleRef.current = scheduleLastRead;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ReaderViewToken[] }) => {
      const top = topVisibleSurah(viewableItems);
      if (!top) return;
      setCurrentSurahName(
        sectionsRef.current.find(s => s.surah.number === top.surahNumber)?.surah.englishName ??
          null,
      );
      scheduleRef.current(top.ayahNumber);
    },
  ).current;

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    // Keep UI-thread baseScale in sync with persisted value (only changes at gesture end or via settings buttons)
    baseScale.value = surahReaderFontScale;
    pinchScale.value = 1;
    liveScale.value = surahReaderFontScale;
    lastApplied.value = surahReaderFontScale;
  }, [baseScale, lastApplied, liveScale, pinchScale, surahReaderFontScale]);

  const toastAnimStyle = useAnimatedStyle(() => {
    return { opacity: toastOpacity.value };
  }, [toastOpacity]);

  const flashLimitToast = useCallback((text: string) => {
    // Ensure we only set state when the message changes
    if (toastTextRef.current === text && toastText) return;
    hapticLight();
    toastTextRef.current = text;
    setToastText(text);
    toastOpacity.value = 1;
    toastOpacity.value = withTiming(0, { duration: 220 }, finished => {
      if (finished) runOnJS(setToastText)(null);
    });
  }, [toastOpacity, toastText]);

  const clamp = (v: number, min: number, max: number) => {
    'worklet';
    return Math.min(max, Math.max(min, v));
  };

  const pinch = useMemo(() => {
    return Gesture.Pinch()
      .onBegin(() => {
        hitMinThisGesture.value = false;
        hitMaxThisGesture.value = false;
        pinchScale.value = 1;
      })
      .onUpdate(e => {
        // UI-thread only: update liveScale; ignore micro-jitter
        const raw = baseScale.value * e.scale;
        const next = clamp(raw, MIN_SCALE, MAX_SCALE);
        if (Math.abs(next - lastApplied.value) < SCALE_EPS) return;
        lastApplied.value = next;
        pinchScale.value = e.scale;
        liveScale.value = next;

        if (next <= MIN_SCALE + 1e-4 && !hitMinThisGesture.value) {
          hitMinThisGesture.value = true;
          runOnJS(flashLimitToast)('Min zoom');
        } else if (next >= MAX_SCALE - 1e-4 && !hitMaxThisGesture.value) {
          hitMaxThisGesture.value = true;
          runOnJS(flashLimitToast)('Max zoom');
        }
      })
      .onEnd(e => {
        const raw = baseScale.value * e.scale;
        const next = clamp(raw, MIN_SCALE, MAX_SCALE);
        baseScale.value = next;
        pinchScale.value = 1;
        liveScale.value = next;
        lastApplied.value = next;
        runOnJS(setSurahReaderFontScale)(next);
      });
  }, [
    baseScale,
    flashLimitToast,
    hitMaxThisGesture,
    hitMinThisGesture,
    lastApplied,
    liveScale,
    pinchScale,
    setSurahReaderFontScale,
  ]);

  const playAyah = useCallback(
    (item: AyahReaderRow, section: ReaderSection) => {
      if (!item.audioUrl) return;
      const sNum = section.surah.number;
      const name = section.surah.englishName;
      const queue: QuranAudioQueueItem[] = section.data
        .filter(a => !!a.audioUrl)
        .map(a => ({
          surahNumber: sNum,
          surahEnglishName: name,
          ayahNumber: a.numberInSurah,
          arabic: a.arabic,
          translation: a.translation,
          audioUrl: a.audioUrl!,
        }));
      const qItem: QuranAudioQueueItem = {
        surahNumber: sNum,
        surahEnglishName: name,
        ayahNumber: item.numberInSurah,
        arabic: item.arabic,
        translation: item.translation,
        audioUrl: item.audioUrl,
      };
      void playAyahGlobal(qItem, queue);
    },
    [playAyahGlobal],
  );

  /** Scroll to the opened ayah in the first section once content is laid out. */
  const tryInitialScroll = useCallback(() => {
    if (scrolledRef.current) return;
    const first = sectionsRef.current[0];
    if (!first) return;
    const idx = first.data.findIndex(a => a.numberInSurah === ayahNumber);
    if (idx < 0) return;
    scrolledRef.current = true;
    try {
      listRef.current?.scrollToLocation({
        sectionIndex: 0,
        itemIndex: idx,
        viewPosition: 0.15,
        animated: false,
      });
    } catch {
      scrolledRef.current = false;
    }
  }, [ayahNumber]);

  // Keep the currently-playing ayah in view (works across appended surahs).
  useEffect(() => {
    if (audioCurrentSurahNumber == null || audioCurrentAyahNumber == null) return;
    const secIdx = sectionsRef.current.findIndex(
      s => s.surah.number === audioCurrentSurahNumber,
    );
    if (secIdx < 0) return;
    const itemIdx = sectionsRef.current[secIdx].data.findIndex(
      a => a.numberInSurah === audioCurrentAyahNumber,
    );
    if (itemIdx < 0) return;
    try {
      listRef.current?.scrollToLocation({
        sectionIndex: secIdx,
        itemIndex: itemIdx,
        viewPosition: 0.3,
        animated: true,
      });
    } catch {
      /* transient scroll target; ignore */
    }
  }, [audioCurrentSurahNumber, audioCurrentAyahNumber]);

  const renderItem = useCallback(
    ({ item, section }: { item: AyahReaderRow; section: ReaderSection }) => {
      const sNum = section.surah.number;
      const active = isActiveAyah(
        sNum,
        item.numberInSurah,
        audioCurrentSurahNumber,
        audioCurrentAyahNumber,
      );
      return (
        <AyahBlock
          item={item}
          palette={palette}
          showTranslation={showTranslation}
          bookmarked={isBookmarked(sNum, item.numberInSurah)}
          liveScale={liveScale}
          audio={{
            isActive: active,
            isPlaying: active && audioIsPlaying,
            isLoading: active && audioIsLoading,
            hasAudio: !!item.audioUrl,
          }}
          onPlay={() => playAyah(item, section)}
          onTafsir={() =>
            navigation.navigate('Tafsir', { surahNumber: sNum, ayahNumber: item.numberInSurah })
          }
          onToggleBookmark={() =>
            isBookmarked(sNum, item.numberInSurah)
              ? removeBookmark(sNum, item.numberInSurah)
              : addBookmark(sNum, item.numberInSurah)
          }
          onShare={() =>
            setVerseToShare({
              arabic: item.arabic,
              translation: item.translation,
              surahEnglishName: section.surah.englishName,
              surahNumber: sNum,
              ayahNumber: item.numberInSurah,
            })
          }
        />
      );
    },
    [
      addBookmark,
      audioCurrentAyahNumber,
      audioCurrentSurahNumber,
      audioIsLoading,
      audioIsPlaying,
      isBookmarked,
      liveScale,
      navigation,
      palette,
      playAyah,
      removeBookmark,
      showTranslation,
    ],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: ReaderSection }) => {
      const isFirst = section.surah.number === sectionsRef.current[0]?.surah.number;
      const header = (
        <>
          <SurahOpeningHeader
            palette={palette}
            arabicName={section.surah.name}
            englishName={section.surah.englishName}
            translation={section.surah.englishNameTranslation}
            ayahCount={section.surah.numberOfAyahs}
            revelationType={section.surah.revelationType}
          />
          {shouldShowBismillah(section.surah.number) ? (
            <BismillahReveal reduceMotion={reduceMotion} color={palette.accent} />
          ) : null}
        </>
      );
      if (isFirst) return <View>{header}</View>;
      return (
        <Animated.View
          entering={FadeInDown.duration(
            durationFor(motionPresets.enter.duration, reduceMotion),
          )}>
          {header}
        </Animated.View>
      );
    },
    [palette, reduceMotion],
  );

  const renderSectionFooter = useCallback(
    ({ section }: { section: ReaderSection }) => (
      <SurahTransition palette={palette} englishName={section.surah.englishName} />
    ),
    [palette],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'}
      />
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backHit} accessibilityLabel="Back">
          <ArrowLeft size={24} color={palette.text} strokeWidth={2} />
        </Pressable>
        <View style={styles.headerTitle}>
          {data ? (
            <>
              <SazdaText variant="headlineMedium" color={palette.text} numberOfLines={1}>
                {data.surah.englishName}
              </SazdaText>
              <SazdaText variant="caption" color={palette.textMuted} numberOfLines={1}>
                {data.surah.englishNameTranslation} • {data.surah.numberOfAyahs} ayahs
              </SazdaText>
            </>
          ) : (
            <SazdaText variant="headlineMedium" color={palette.text}>
              Surah {surahNumber}
            </SazdaText>
          )}
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => setShowTranslation(!showTranslation)}
            style={styles.langHit}
            accessibilityLabel={showTranslation ? 'Hide translation' : 'Show translation'}>
            <Languages
              size={22}
              color={showTranslation ? palette.accent : palette.textMuted}
              strokeWidth={2}
            />
          </Pressable>
          <Pressable
            onPress={() => setSettingsOpen(true)}
            style={styles.settingsHit}
            accessibilityLabel="Reader appearance">
            <Settings size={22} color={palette.text} strokeWidth={2} />
          </Pressable>
        </View>
      </View>

      {isPending ? (
        <ActivityIndicator style={styles.loader} color={palette.accent} size="large" />
      ) : isError ? (
        <Pressable onPress={() => refetch()} style={styles.errorBox}>
          <SazdaText variant="bodyMedium" color={palette.accent} align="center">
            Could not load this surah. Tap to retry.
          </SazdaText>
        </Pressable>
      ) : (
        <View
          style={styles.listWrap}
          onLayout={e => setContainerH(e.nativeEvent.layout.height)}
        >
          <GestureDetector gesture={pinch}>
            <Animated.View style={{ flex: 1 }}>
              <SectionList
                ref={listRef}
                sections={sections}
                keyExtractor={(a, i) => `${a.numberInSurah}-${i}`}
                renderItem={renderItem}
                renderSectionHeader={renderSectionHeader}
                renderSectionFooter={renderSectionFooter}
                stickySectionHeadersEnabled={false}
                extraData={{
                  showTranslation,
                  surahReaderTheme,
                  audioCurrentSurahNumber,
                  audioCurrentAyahNumber,
                  audioIsPlaying,
                }}
                showsVerticalScrollIndicator={false}
                initialNumToRender={12}
                maxToRenderPerBatch={14}
                windowSize={8}
                removeClippedSubviews
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={VIEW_CFG}
                onContentSizeChange={() => tryInitialScroll()}
                onEndReached={() => void appendNext()}
                onEndReachedThreshold={0.6}
                onScrollToIndexFailed={() => {
                  scrolledRef.current = false;
                  setTimeout(() => tryInitialScroll(), 300);
                }}
                // Reserve space for the in-screen mini player (when active).
                contentContainerStyle={[
                  styles.listContent,
                  audioUrlActive
                    ? { paddingBottom: tabBarHeight + 66 + spacing.lg }
                    : null,
                ]}
              />
            </Animated.View>
          </GestureDetector>
          <StickySurahBar
            palette={palette}
            englishName={currentSurahName}
            reduceMotion={reduceMotion}
          />
          <ReaderAudioPlayerSheet tabBarHeight={tabBarHeight} containerHeight={containerH} />
          {toastText ? (
            <Animated.View
              pointerEvents="none"
              style={[
                toastStyles.wrap,
                toastAnimStyle,
              ]}>
              <View style={[toastStyles.pill, { backgroundColor: palette.accent }]}>
                <Text style={toastStyles.text}>{toastText}</Text>
              </View>
            </Animated.View>
          ) : null}
        </View>
      )}

      <ReaderSettingsModal
        visible={settingsOpen}
        theme={surahReaderTheme}
        fontScale={surahReaderFontScale}
        onClose={() => setSettingsOpen(false)}
        onSetTheme={setSurahReaderTheme}
        onSetFontScale={setSurahReaderFontScale}
      />

      <ShareVersePreview
        palette={palette}
        visible={verseToShare !== null}
        verse={verseToShare}
        onClose={() => setVerseToShare(null)}
      />
    </SafeAreaView>
  );
}

const toastStyles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: spacing.md,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    opacity: 0.92,
  },
  text: {
    color: '#fff',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
