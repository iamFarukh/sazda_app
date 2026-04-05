import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
  type ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { ArrowLeft, BookOpen, Bookmark, Languages, Volume2 } from 'lucide-react-native';
import { QuranAudioBar } from '../../components/molecules/QuranAudioBar/QuranAudioBar';
import { SazdaText } from '../../components/atoms/SazdaText/SazdaText';
import type { QuranStackParamList } from '../../navigation/types';
import { OFFLINE_QURAN_VERSION } from '../../services/offlineQuran/constants';
import { loadSurahReaderDataOfflineFirst } from '../../services/offlineQuran/reader';
import type { AyahReaderRow } from '../../services/quranApi';
import { useQuranProgressStore } from '../../store/quranProgressStore';
import { radius } from '../../theme/radius';
import type { AppPalette } from '../../theme/useThemePalette';
import type { ResolvedScheme } from '../../theme/useThemePalette';
import { useThemePalette } from '../../theme/useThemePalette';
import { spacing } from '../../theme/spacing';

type Nav = NativeStackNavigationProp<QuranStackParamList, 'SurahReader'>;
type R = RouteProp<QuranStackParamList, 'SurahReader'>;

const VIEW_CFG = { itemVisiblePercentThreshold: 55, minimumViewTime: 180 } as const;

function createReaderStyles(c: AppPalette, _scheme: ResolvedScheme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.surface },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      gap: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: 'rgba(0,53,39,0.08)',
    },
    backHit: { width: 44, height: 44, justifyContent: 'center' },
    headerTitle: { flex: 1, minWidth: 0 },
    langHit: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
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
      borderBottomColor: 'rgba(191, 201, 195, 0.35)',
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
      fontSize: 22,
      lineHeight: 36,
    },
    translation: {
      marginTop: spacing.sm,
      lineHeight: 24,
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
  colors: AppPalette;
  styles: ReaderStyles;
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
  onPlay,
  onOpenTafsir,
  onToggleBookmark,
}: AyahRowProps) {
  return (
    <View style={styles.ayahRow}>
      <View style={styles.ayahBadge}>
        <SazdaText variant="caption" color="onPrimary" style={styles.ayahNum}>
          {item.numberInSurah}
        </SazdaText>
      </View>
      <View style={styles.ayahBody}>
        <SazdaText variant="verse" color="primary" align="right" rtl style={styles.ayahText}>
          {item.arabic}
        </SazdaText>
        {showTranslation && item.translation ? (
          <SazdaText variant="bodyMedium" color="onSurfaceVariant" style={styles.translation}>
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
            size={20}
            color={item.audioUrl ? c.primaryContainer : c.outlineVariant}
            strokeWidth={2}
          />
        </Pressable>
        <Pressable
          onPress={() => onOpenTafsir(item.numberInSurah)}
          style={styles.iconHit}
          accessibilityLabel="Tafsir">
          <BookOpen size={20} color={c.secondary} strokeWidth={2} />
        </Pressable>
        <Pressable
          onPress={onToggleBookmark}
          style={styles.iconHit}
          accessibilityLabel={bookmarked ? 'Remove bookmark' : 'Add bookmark'}>
          <Bookmark
            size={20}
            color={bookmarked ? c.secondary : c.outline}
            fill={bookmarked ? c.secondary : undefined}
          />
        </Pressable>
      </View>
    </View>
  );
});

export function SurahReaderScreen() {
  const { colors: c, scheme } = useThemePalette();
  const styles = useMemo(() => createReaderStyles(c, scheme), [c, scheme]);

  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const { surahNumber, ayahNumber = 1 } = route.params;
  const listRef = useRef<FlatList<AyahReaderRow>>(null);
  const scrolledRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const scheduleRef = useRef<(ayah: number) => void>(() => {});

  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [audioLabel, setAudioLabel] = useState('');

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
        colors={c}
        styles={styles}
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
      c,
      isBookmarked,
      navigation,
      playAyah,
      removeBookmark,
      showTranslation,
      styles,
      surahNumber,
    ],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backHit} accessibilityLabel="Back">
          <ArrowLeft size={24} color={c.primary} strokeWidth={2} />
        </Pressable>
        <View style={styles.headerTitle}>
          {data ? (
            <>
              <SazdaText variant="headlineMedium" color="primary" numberOfLines={1}>
                {data.surah.englishName}
              </SazdaText>
              <SazdaText variant="caption" color="onSurfaceVariant" numberOfLines={1}>
                {data.surah.englishNameTranslation} • {data.surah.numberOfAyahs} ayahs
              </SazdaText>
            </>
          ) : (
            <SazdaText variant="headlineMedium" color="primary">
              Surah {surahNumber}
            </SazdaText>
          )}
        </View>
        <Pressable
          onPress={() => setShowTranslation(!showTranslation)}
          style={styles.langHit}
          accessibilityLabel={showTranslation ? 'Hide translation' : 'Show translation'}>
          <Languages
            size={22}
            color={showTranslation ? c.primary : c.outline}
            strokeWidth={2}
          />
        </Pressable>
      </View>

      {isPending ? (
        <ActivityIndicator style={styles.loader} color={c.primary} size="large" />
      ) : isError ? (
        <Pressable onPress={() => refetch()} style={styles.errorBox}>
          <SazdaText variant="bodyMedium" color="error" align="center">
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
            extraData={showTranslation}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
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
          <QuranAudioBar uri={audioUri} title={audioLabel} />
        </View>
      )}
    </SafeAreaView>
  );
}
