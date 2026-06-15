import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import {
  ArrowLeft,
  BookOpen,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Languages,
  Settings,
  Pause,
  Play,
} from 'lucide-react-native';
import { SazdaText } from '../../components/atoms/SazdaText/SazdaText';
import type { QuranStackParamList } from '../../navigation/types';
import { OFFLINE_QURAN_VERSION } from '../../services/offlineQuran/constants';
import { loadSurahReaderDataOfflineFirst } from '../../services/offlineQuran/reader';
import type { AyahReaderRow } from '../../services/quranApi';
import { getSurahReaderColors, type SurahReaderColors } from '../../services/quran/surahReaderAppearance';
import type { MushafTheme } from '../../services/mushaf/mushafTheme';
import { useQuranProgressStore } from '../../store/quranProgressStore';
import { useQuranAudioStore, type QuranAudioQueueItem } from '../../store/quranAudioStore';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { ReaderAudioPlayerSheet } from './components/ReaderAudioPlayerSheet';

type Nav = NativeStackNavigationProp<QuranStackParamList, 'SurahReader'>;
type R = RouteProp<QuranStackParamList, 'SurahReader'>;

const VIEW_CFG = { itemVisiblePercentThreshold: 55, minimumViewTime: 180 } as const;
const MIN_SCALE = 0.85;
const MAX_SCALE = 1.6;
const SCALE_EPS = 0.01;

function createReaderStyles(c: SurahReaderColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.surface },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      gap: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.headerBorder,
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
    ayahRow: {
      minHeight: 88,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.ayahSeparator,
    },
    ayahBadge: {
      minWidth: 28,
      height: 28,
      borderRadius: radius.full,
      backgroundColor: c.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
    ayahNum: { fontWeight: '800', fontSize: 11 },
    ayahBody: { flex: 1, minWidth: 0 },
    ayahText: {
      ...typography.verse,
      fontSize: 22,
      lineHeight: 22 * 1.45,
    },
    translation: {
      marginTop: spacing.sm,
      ...typography.bodyMedium,
      lineHeight: 15 * 1.45,
      fontSize: 15,
    },
    actions: {
      alignItems: 'center',
      gap: 4,
      paddingTop: 2,
    },
    iconHit: {
      padding: spacing.xs,
      minWidth: 36,
      minHeight: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconDisabled: { opacity: 0.35 },
  });
}

type ReaderStyles = ReturnType<typeof createReaderStyles>;

type AyahRowProps = {
  item: AyahReaderRow;
  showTranslation: boolean;
  bookmarked: boolean;
  colors: SurahReaderColors;
  styles: ReaderStyles;
  iconSize: number;
  liveScale: Animated.SharedValue<number>;
  audioState: { isActive: boolean; isPlaying: boolean; isLoading: boolean; hasAudio: boolean };
  onPlay: (item: AyahReaderRow) => void;
  onOpenTafsir: (ayah: number) => void;
  onToggleBookmark: () => void;
};

const SurahReaderAyahRow = memo(function SurahReaderAyahRow({
  item,
  showTranslation,
  bookmarked,
  colors: c,
  styles,
  iconSize,
  liveScale,
  audioState,
  onPlay,
  onOpenTafsir,
  onToggleBookmark,
}: AyahRowProps) {
  const arabicStyle = useAnimatedStyle(() => {
    const s = liveScale.value;
    const fs = 22 * s;
    return { fontSize: fs, lineHeight: fs * 1.45 };
  }, [liveScale]);

  const transStyle = useAnimatedStyle(() => {
    const s = liveScale.value;
    const fs = 15 * s;
    return { fontSize: fs, lineHeight: fs * 1.45 };
  }, [liveScale]);

  return (
    <View style={styles.ayahRow}>
      <View style={styles.ayahBadge}>
        <SazdaText variant="caption" color={c.onPrimary} style={styles.ayahNum}>
          {item.numberInSurah}
        </SazdaText>
      </View>
      <View style={styles.ayahBody}>
        <Animated.Text
          style={[styles.ayahText, { color: c.primary, textAlign: 'right' }, { writingDirection: 'rtl' as const }, arabicStyle]}>
          {item.arabic}
        </Animated.Text>
        {showTranslation && item.translation ? (
          <Animated.Text style={[styles.translation, { color: c.onSurfaceVariant }, transStyle]}>
            {item.translation}
          </Animated.Text>
        ) : null}
      </View>
      <View style={styles.actions}>
        <Pressable
          onPress={() => onPlay(item)}
          disabled={!audioState.hasAudio}
          style={[styles.iconHit, !item.audioUrl && styles.iconDisabled]}
          accessibilityLabel="Play recitation">
          {audioState.isLoading && audioState.isActive ? (
            <ActivityIndicator size="small" color={c.primaryContainer} />
          ) : audioState.isActive && audioState.isPlaying ? (
            <Pause size={iconSize} color={c.primaryContainer} strokeWidth={2.3} />
          ) : (
            <Play
              size={iconSize}
              color={audioState.hasAudio ? c.primaryContainer : c.outlineVariant}
              strokeWidth={2.3}
            />
          )}
        </Pressable>
        <Pressable
          onPress={() => onOpenTafsir(item.numberInSurah)}
          style={styles.iconHit}
          accessibilityLabel="Tafsir">
          <BookOpen size={iconSize} color={c.secondary} strokeWidth={2} />
        </Pressable>
        <Pressable
          onPress={onToggleBookmark}
          style={styles.iconHit}
          accessibilityLabel={bookmarked ? 'Remove bookmark' : 'Add bookmark'}>
          <Bookmark
            size={iconSize}
            color={bookmarked ? c.secondary : c.outline}
            fill={bookmarked ? c.secondary : undefined}
          />
        </Pressable>
      </View>
    </View>
  );
});

export function SurahReaderScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const { surahNumber, ayahNumber = 1 } = route.params;
  const tabBarHeight = useBottomTabBarHeight();
  const listRef = useRef<FlatList<AyahReaderRow>>(null);
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

  const surahReaderTheme = useQuranProgressStore(s => s.surahReaderTheme ?? 'light');
  const surahReaderFontScale = useQuranProgressStore(s => s.surahReaderFontScale ?? 1);
  const setSurahReaderTheme = useQuranProgressStore(s => s.setSurahReaderTheme);
  const setSurahReaderFontScale = useQuranProgressStore(s => s.setSurahReaderFontScale);

  const readerColors = useMemo(() => getSurahReaderColors(surahReaderTheme), [surahReaderTheme]);
  const styles = useMemo(
    () => createReaderStyles(readerColors),
    [readerColors],
  );
  const iconSize = Math.min(22, Math.round(20 * Math.min(surahReaderFontScale, 1.12)));

  const [settingsOpen, setSettingsOpen] = useState(false);

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

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['quran', 'reader', surahNumber, OFFLINE_QURAN_VERSION],
    queryFn: () => loadSurahReaderDataOfflineFirst(surahNumber),
    staleTime: 1000 * 60 * 60 * 6,
  });

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
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems.find(v => v.isViewable);
      const item = first?.item as AyahReaderRow | undefined;
      if (item?.numberInSurah) {
        scheduleRef.current(item.numberInSurah);
      }
    },
  ).current;

  const scrollToAyah = useCallback(
    (index: number) => {
      if (index < 0 || !data?.ayahs.length) return;
      requestAnimationFrame(() => {
        listRef.current?.scrollToIndex({
          index,
          animated: false,
          viewPosition: 0.15,
        });
      });
    },
    [data?.ayahs.length],
  );

  const tryInitialScroll = useCallback(() => {
    if (!data?.ayahs.length || scrolledRef.current) return;
    const idx = data.ayahs.findIndex(a => a.numberInSurah === ayahNumber);
    if (idx >= 0) {
      scrolledRef.current = true;
      scrollToAyah(idx);
    }
  }, [data?.ayahs, ayahNumber, scrollToAyah]);

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
    (item: AyahReaderRow) => {
      if (!item.audioUrl || !data?.surah) return;
      const queue: QuranAudioQueueItem[] = data.ayahs
        .filter(a => !!a.audioUrl)
        .map(a => ({
          surahNumber,
          surahEnglishName: data.surah.englishName,
          ayahNumber: a.numberInSurah,
          arabic: a.arabic,
          translation: a.translation,
          audioUrl: a.audioUrl!,
        }));
      const qItem: QuranAudioQueueItem = {
        surahNumber,
        surahEnglishName: data.surah.englishName,
        ayahNumber: item.numberInSurah,
        arabic: item.arabic,
        translation: item.translation,
        audioUrl: item.audioUrl,
      };
      void playAyahGlobal(qItem, queue);
    },
    [data?.ayahs, data?.surah, playAyahGlobal, surahNumber],
  );

  const renderAyah = useCallback(
    ({ item }: { item: AyahReaderRow }) => (
      <SurahReaderAyahRow
        item={item}
        showTranslation={showTranslation}
        bookmarked={isBookmarked(surahNumber, item.numberInSurah)}
        colors={readerColors}
        styles={styles}
        iconSize={iconSize}
        liveScale={liveScale}
        audioState={{
          isActive:
            audioCurrentSurahNumber === surahNumber &&
            audioCurrentAyahNumber === item.numberInSurah,
          isPlaying: audioIsPlaying,
          isLoading: audioIsLoading,
          hasAudio: !!item.audioUrl,
        }}
        onPlay={playAyah}
        onOpenTafsir={ayah =>
          navigation.navigate('Tafsir', { surahNumber, ayahNumber: ayah })
        }
        onToggleBookmark={() =>
          isBookmarked(surahNumber, item.numberInSurah)
            ? removeBookmark(surahNumber, item.numberInSurah)
            : addBookmark(surahNumber, item.numberInSurah)
        }
      />
    ),
    [
      addBookmark,
      audioCurrentAyahNumber,
      audioCurrentSurahNumber,
      audioIsLoading,
      audioIsPlaying,
      iconSize,
      isBookmarked,
      liveScale,
      navigation,
      playAyah,
      readerColors,
      removeBookmark,
      showTranslation,
      styles,
      surahNumber,
    ],
  );

  // Scroll sync to active ayah during playback.
  useEffect(() => {
    if (!data?.ayahs.length) return;
    if (audioCurrentSurahNumber !== surahNumber) return;
    const ayahNum = audioCurrentAyahNumber;
    if (!ayahNum) return;
    const idx = data.ayahs.findIndex(a => a.numberInSurah === ayahNum);
    if (idx < 0) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.2 });
    });
  }, [audioCurrentAyahNumber, audioCurrentSurahNumber, data?.ayahs, surahNumber]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={surahReaderTheme === 'dark' ? 'light-content' : 'dark-content'}
      />
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backHit} accessibilityLabel="Back">
          <ArrowLeft size={24} color={readerColors.primary} strokeWidth={2} />
        </Pressable>
        <View style={styles.headerTitle}>
          {data ? (
            <>
              <SazdaText variant="headlineMedium" color={readerColors.primary} numberOfLines={1}>
                {data.surah.englishName}
              </SazdaText>
              <SazdaText variant="caption" color={readerColors.onSurfaceVariant} numberOfLines={1}>
                {data.surah.englishNameTranslation} • {data.surah.numberOfAyahs} ayahs
              </SazdaText>
            </>
          ) : (
            <SazdaText variant="headlineMedium" color={readerColors.primary}>
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
              color={showTranslation ? readerColors.primary : readerColors.outline}
              strokeWidth={2}
            />
          </Pressable>
          <Pressable
            onPress={() => setSettingsOpen(true)}
            style={styles.settingsHit}
            accessibilityLabel="Reader appearance">
            <Settings size={22} color={readerColors.primary} strokeWidth={2} />
          </Pressable>
        </View>
      </View>

      {isPending ? (
        <ActivityIndicator style={styles.loader} color={readerColors.primary} size="large" />
      ) : isError ? (
        <Pressable onPress={() => refetch()} style={styles.errorBox}>
          <SazdaText variant="bodyMedium" color={readerColors.error} align="center">
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
              <FlatList
                ref={listRef}
                data={data!.ayahs}
                keyExtractor={a => String(a.numberInSurah)}
                renderItem={renderAyah}
                extraData={{
                  showTranslation,
                  surahReaderTheme,
                }}
                contentContainerStyle={[
                  styles.listContent,
                  audioUrlActive
                    ? { paddingBottom: tabBarHeight + 66 + spacing.lg }
                    : null,
                ]}
                showsVerticalScrollIndicator={false}
                initialNumToRender={12}
                maxToRenderPerBatch={14}
                windowSize={8}
                removeClippedSubviews
                onContentSizeChange={() => tryInitialScroll()}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={VIEW_CFG}
                onScrollToIndexFailed={info => {
                  scrolledRef.current = false;
                  setTimeout(() => {
                    listRef.current?.scrollToIndex({
                      index: info.index,
                      animated: false,
                      viewPosition: 0.15,
                    });
                  }, 300);
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
          <ReaderAudioPlayerSheet tabBarHeight={tabBarHeight} containerHeight={containerH} />
          {toastText ? (
            <Animated.View
              pointerEvents="none"
              style={[
                toastStyles.wrap,
                toastAnimStyle,
              ]}>
              <View style={[toastStyles.pill, { backgroundColor: readerColors.primary }]}>
                <Text style={toastStyles.text}>{toastText}</Text>
              </View>
            </Animated.View>
          ) : null}
        </View>
      )}

      <Modal visible={settingsOpen} transparent animationType="fade" onRequestClose={() => setSettingsOpen(false)}>
        <Pressable style={modalStyles.backdrop} onPress={() => setSettingsOpen(false)}>
          <Pressable
            style={[modalStyles.card, { backgroundColor: readerColors.surface }]}
            onPress={e => e.stopPropagation()}>
            <Text style={[modalStyles.title, { color: readerColors.primary }]}>Reader appearance</Text>
            <Text style={[modalStyles.sub, { color: readerColors.onSurfaceVariant }]}>Theme</Text>
            <View style={modalStyles.themeRow}>
              {(['light', 'sepia', 'dark'] as MushafTheme[]).map(t => (
                <Pressable
                  key={t}
                  onPress={() => setSurahReaderTheme(t)}
                  style={[
                    modalStyles.themeChip,
                    surahReaderTheme === t && {
                      borderColor: readerColors.primaryContainer,
                      borderWidth: 2,
                    },
                    { backgroundColor: readerColors.surface },
                  ]}>
                  <Text style={{ color: readerColors.primary }}>{t[0].toUpperCase() + t.slice(1)}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[modalStyles.sub, { color: readerColors.onSurfaceVariant }]}>Text size</Text>
            <View style={modalStyles.sizeRow}>
              <Pressable
                onPress={() => setSurahReaderFontScale(surahReaderFontScale - 0.06)}
                style={modalStyles.sizeBtn}>
                <ChevronDown size={22} color={readerColors.primary} />
              </Pressable>
              <Text style={{ color: readerColors.primary }}>{Math.round(surahReaderFontScale * 100)}%</Text>
              <Pressable
                onPress={() => setSurahReaderFontScale(surahReaderFontScale + 0.06)}
                style={modalStyles.sizeBtn}>
                <ChevronUp size={22} color={readerColors.primary} />
              </Pressable>
            </View>
            <Pressable style={modalStyles.close} onPress={() => setSettingsOpen(false)}>
              <Text style={{ color: readerColors.primaryContainer, fontWeight: '700' }}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    borderRadius: radius.md,
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  sub: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  themeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  themeChip: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  sizeBtn: {
    padding: spacing.sm,
  },
  close: {
    alignSelf: 'flex-end',
    paddingVertical: spacing.sm,
  },
});

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
