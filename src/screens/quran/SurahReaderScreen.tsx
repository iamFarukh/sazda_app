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
  Volume2,
} from 'lucide-react-native';
import { QuranAudioBar } from '../../components/molecules/QuranAudioBar/QuranAudioBar';
import { SazdaText } from '../../components/atoms/SazdaText/SazdaText';
import type { QuranStackParamList } from '../../navigation/types';
import { OFFLINE_QURAN_VERSION } from '../../services/offlineQuran/constants';
import { loadSurahReaderDataOfflineFirst } from '../../services/offlineQuran/reader';
import type { AyahReaderRow } from '../../services/quranApi';
import { getSurahReaderColors, type SurahReaderColors } from '../../services/quran/surahReaderAppearance';
import type { MushafTheme } from '../../services/mushaf/mushafTheme';
import { useQuranProgressStore } from '../../store/quranProgressStore';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';

type Nav = NativeStackNavigationProp<QuranStackParamList, 'SurahReader'>;
type R = RouteProp<QuranStackParamList, 'SurahReader'>;

const VIEW_CFG = { itemVisiblePercentThreshold: 55, minimumViewTime: 180 } as const;

function createReaderStyles(c: SurahReaderColors, fontScale: number) {
  const arabic = 22 * fontScale;
  const trans = 15 * fontScale;
  const badgeNum = Math.max(10, Math.round(11 * fontScale));

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
    ayahNum: { fontWeight: '800', fontSize: badgeNum },
    ayahBody: { flex: 1, minWidth: 0 },
    ayahText: {
      fontSize: arabic,
      lineHeight: arabic * 1.45,
    },
    translation: {
      marginTop: spacing.sm,
      lineHeight: trans * 1.45,
      fontSize: trans,
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
  onPlay,
  onOpenTafsir,
  onToggleBookmark,
}: AyahRowProps) {
  return (
    <View style={styles.ayahRow}>
      <View style={styles.ayahBadge}>
        <SazdaText variant="caption" color={c.onPrimary} style={styles.ayahNum}>
          {item.numberInSurah}
        </SazdaText>
      </View>
      <View style={styles.ayahBody}>
        <SazdaText variant="verse" color={c.primary} align="right" rtl style={styles.ayahText}>
          {item.arabic}
        </SazdaText>
        {showTranslation && item.translation ? (
          <SazdaText variant="bodyMedium" color={c.onSurfaceVariant} style={styles.translation}>
            {item.translation}
          </SazdaText>
        ) : null}
      </View>
      <View style={styles.actions}>
        <Pressable
          onPress={() => onPlay(item)}
          disabled={!item.audioUrl}
          style={[styles.iconHit, !item.audioUrl && styles.iconDisabled]}
          accessibilityLabel="Play recitation">
          <Volume2
            size={iconSize}
            color={item.audioUrl ? c.primaryContainer : c.outlineVariant}
            strokeWidth={2}
          />
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
  const listRef = useRef<FlatList<AyahReaderRow>>(null);
  const scrolledRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const scheduleRef = useRef<(ayah: number) => void>(() => {});

  const surahReaderTheme = useQuranProgressStore(s => s.surahReaderTheme ?? 'light');
  const surahReaderFontScale = useQuranProgressStore(s => s.surahReaderFontScale ?? 1);
  const setSurahReaderTheme = useQuranProgressStore(s => s.setSurahReaderTheme);
  const setSurahReaderFontScale = useQuranProgressStore(s => s.setSurahReaderFontScale);

  const readerColors = useMemo(() => getSurahReaderColors(surahReaderTheme), [surahReaderTheme]);
  const styles = useMemo(
    () => createReaderStyles(readerColors, surahReaderFontScale),
    [readerColors, surahReaderFontScale],
  );
  const iconSize = Math.min(22, Math.round(20 * Math.min(surahReaderFontScale, 1.12)));

  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [audioLabel, setAudioLabel] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const setLastRead = useQuranProgressStore(s => s.setLastRead);
  const recordAyahEngagement = useQuranProgressStore(s => s.recordAyahEngagement);
  const touchRecentSurah = useQuranProgressStore(s => s.touchRecentSurah);
  const isBookmarked = useQuranProgressStore(s => s.isBookmarked);
  const addBookmark = useQuranProgressStore(s => s.addBookmark);
  const removeBookmark = useQuranProgressStore(s => s.removeBookmark);
  const showTranslation = useQuranProgressStore(s => s.showTranslation);
  const setShowTranslation = useQuranProgressStore(s => s.setShowTranslation);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['quran', 'reader', surahNumber, OFFLINE_QURAN_VERSION],
    queryFn: () => loadSurahReaderDataOfflineFirst(surahNumber),
    staleTime: 1000 * 60 * 60 * 6,
  });

  useEffect(() => {
    touchRecentSurah(surahNumber);
  }, [surahNumber, touchRecentSurah]);

  useEffect(() => {
    setLastRead(surahNumber, ayahNumber);
  }, [surahNumber, ayahNumber, setLastRead]);

  useEffect(() => {
    scrolledRef.current = false;
  }, [surahNumber, ayahNumber]);

  const scheduleLastRead = useCallback(
    (ayah: number) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setLastRead(surahNumber, ayah);
        recordAyahEngagement(surahNumber, ayah);
      }, 420);
    },
    [recordAyahEngagement, setLastRead, surahNumber],
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

  const playAyah = useCallback(
    (item: AyahReaderRow) => {
      if (!item.audioUrl) return;
      setAudioUri(item.audioUrl);
      setAudioLabel(`${data?.surah.englishName ?? 'Surah'} · Ayah ${item.numberInSurah}`);
    },
    [data?.surah.englishName],
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
      iconSize,
      isBookmarked,
      navigation,
      playAyah,
      readerColors,
      removeBookmark,
      showTranslation,
      styles,
      surahNumber,
    ],
  );

  const audioChrome = useMemo(
    () => ({
      surface: readerColors.surface,
      primary: readerColors.primary,
      darkReader: surahReaderTheme === 'dark',
    }),
    [readerColors.primary, readerColors.surface, surahReaderTheme],
  );

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
        <View style={styles.listWrap}>
          <FlatList
            ref={listRef}
            data={data!.ayahs}
            keyExtractor={a => String(a.numberInSurah)}
            renderItem={renderAyah}
            extraData={{
              showTranslation,
              surahReaderFontScale,
              surahReaderTheme,
            }}
            contentContainerStyle={styles.listContent}
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
          />
          <QuranAudioBar uri={audioUri} title={audioLabel} chrome={audioChrome} />
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
