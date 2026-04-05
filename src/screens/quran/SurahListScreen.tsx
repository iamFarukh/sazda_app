import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { ArrowLeft, Bookmark, Search } from 'lucide-react-native';
import { TextInput } from '../../components/atoms/TextInput/TextInput';
import { SazdaText } from '../../components/atoms/SazdaText/SazdaText';
import { JUZ_START } from '../../data/juzBoundaries';
import type { QuranStackParamList } from '../../navigation/types';
import { fetchAllSurahs, type QuranApiSurah } from '../../services/quranApi';
import { useQuranProgressStore } from '../../store/quranProgressStore';
import { radius } from '../../theme/radius';
import type { AppPalette } from '../../theme/useThemePalette';
import type { ResolvedScheme } from '../../theme/useThemePalette';
import { useThemePalette } from '../../theme/useThemePalette';
import { spacing } from '../../theme/spacing';

type Nav = NativeStackNavigationProp<QuranStackParamList, 'SurahList'>;
type R = RouteProp<QuranStackParamList, 'SurahList'>;

type TabKey = 'surah' | 'juz' | 'bookmarks';

export function SurahListScreen() {
  const { colors: c, scheme } = useThemePalette();
  const styles = useMemo(() => createSurahListStyles(c, scheme), [c, scheme]);

  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const initialTab = route.params?.initialTab ?? 'surah';
  const initialQuery = route.params?.initialQuery ?? '';

  const [tab, setTab] = useState<TabKey>(initialTab);
  const [query, setQuery] = useState(initialQuery);

  const bookmarks = useQuranProgressStore(s => s.bookmarks);
  const lastRead = useQuranProgressStore(s => s.lastRead);

  useEffect(() => {
    if (route.params?.initialTab) setTab(route.params.initialTab);
    if (route.params?.initialQuery != null) setQuery(route.params.initialQuery);
  }, [route.params?.initialTab, route.params?.initialQuery]);

  const { data: surahs, isPending, isError, refetch } = useQuery({
    queryKey: ['quran', 'surahs'],
    queryFn: fetchAllSurahs,
    staleTime: 1000 * 60 * 60 * 24,
  });

  const surahByNumber = useMemo(() => {
    const m = new Map<number, QuranApiSurah>();
    surahs?.forEach(s => m.set(s.number, s));
    return m;
  }, [surahs]);

  const filteredSurahs = useMemo(() => {
    if (!surahs) return [];
    const q = query.trim().toLowerCase();
    if (!q) return surahs;
    return surahs.filter(
      s =>
        s.englishName.toLowerCase().includes(q) ||
        s.englishNameTranslation.toLowerCase().includes(q) ||
        String(s.number).includes(q) ||
        s.name.includes(q),
    );
  }, [surahs, query]);

  const openReader = (surahNumber: number, ayahNumber = 1) => {
    navigation.navigate('SurahReader', { surahNumber, ayahNumber });
  };

  const renderSurahRow = ({ item: s }: { item: QuranApiSurah }) => {
    const bookmarked = bookmarks.some(b => b.surahNumber === s.number);
    return (
      <Pressable
        onPress={() => openReader(s.number, 1)}
        style={({ pressed }) => [styles.surahCard, pressed && styles.pressed]}>
        <View style={styles.diamondWrap}>
          <View style={styles.diamond} />
          <SazdaText variant="titleSm" color="primary" style={styles.diamondNum}>
            {s.number}
          </SazdaText>
        </View>
        <View style={styles.surahMid}>
          <View style={styles.titleRow}>
            <SazdaText variant="headlineMedium" color="primary" style={styles.surahEn}>
              {s.englishName}
            </SazdaText>
            {bookmarked ? <Bookmark size={16} color={c.secondary} fill={c.secondary} /> : null}
          </View>
          <SazdaText variant="caption" color="onSurfaceVariant" style={styles.surahSub}>
            {s.englishNameTranslation.toUpperCase()} • {s.numberOfAyahs} Verses
          </SazdaText>
        </View>
        <SazdaText variant="headlineMedium" color="secondary" style={styles.surahAr} rtl numberOfLines={1}>
          {shortArabic(s.name)}
        </SazdaText>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBlock}>
        <View style={styles.heroTitleRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backHit} accessibilityLabel="Go back">
            <ArrowLeft size={22} color={c.primary} strokeWidth={2} />
          </Pressable>
          <View style={styles.heroTitleTexts}>
            <SazdaText variant="headlineLarge" color="primary" style={styles.heroLine1}>
              Explore the
            </SazdaText>
            <SazdaText variant="headlineLarge" color="secondary" style={styles.heroLine2}>
              Holy Quran
            </SazdaText>
          </View>
        </View>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search Surah, Juz..."
          left={<Search size={18} color="rgba(0,53,39,0.35)" strokeWidth={2} />}
          containerStyle={styles.search}
        />
      </View>

      <View style={styles.tabs}>
        {(['surah', 'juz', 'bookmarks'] as const).map(t => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && styles.tabOn]}>
            <SazdaText
              variant="caption"
              color={tab === t ? 'onPrimary' : 'onSurfaceVariant'}
              style={styles.tabText}>
              {t === 'surah' ? 'Surah' : t === 'juz' ? 'Juz' : 'Bookmarks'}
            </SazdaText>
          </Pressable>
        ))}
      </View>

      {tab === 'surah' && (
        <>
          {isPending ? (
            <ActivityIndicator style={styles.loader} color={c.primary} />
          ) : isError ? (
            <Pressable onPress={() => refetch()} style={styles.errorBox}>
              <SazdaText variant="bodyMedium" color="error" align="center">
                Failed to load. Tap to retry.
              </SazdaText>
            </Pressable>
          ) : (
            <FlatList
              data={filteredSurahs}
              keyExtractor={s => String(s.number)}
              renderItem={renderSurahRow}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListFooterComponent={
                lastRead ? (
                  <View style={styles.resumeBanner}>
                    <SazdaText variant="headlineMedium" color="onPrimary">
                      Continue Reading
                    </SazdaText>
                    <SazdaText variant="bodyMedium" color="onPrimary" style={styles.resumeSub}>
                      You were reading{' '}
                      {surahByNumber.get(lastRead.surahNumber)?.englishName ?? 'Surah'}{' '}, Verse{' '}
                      {lastRead.ayahNumber}
                    </SazdaText>
                    <Pressable
                      onPress={() => openReader(lastRead.surahNumber, lastRead.ayahNumber)}
                      style={styles.resumeBtn}>
                      <SazdaText variant="bodyMedium" color="primary" style={styles.resumeBtnText}>
                        Resume Now
                      </SazdaText>
                    </Pressable>
                  </View>
                ) : null
              }
            />
          )}
        </>
      )}

      {tab === 'juz' && (
        <ScrollView contentContainerStyle={styles.juzGrid} showsVerticalScrollIndicator={false}>
          <View style={styles.juzWrap}>
            {JUZ_START.map(j => (
              <Pressable
                key={j.juz}
                onPress={() => openReader(j.surah, j.ayah)}
                style={({ pressed }) => [styles.juzCell, pressed && styles.pressed]}>
                <SazdaText variant="headlineMedium" color="primary">
                  {j.juz}
                </SazdaText>
                <SazdaText variant="caption" color="onSurfaceVariant">
                  Juz
                </SazdaText>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}

      {tab === 'bookmarks' && (
        <ScrollView contentContainerStyle={styles.bookmarksContent}>
          {bookmarks.length === 0 ? (
            <SazdaText variant="bodyMedium" color="onSurfaceVariant" align="center" style={styles.empty}>
              No bookmarks yet. Open a surah and tap the bookmark icon on a verse.
            </SazdaText>
          ) : (
            bookmarks.map(b => {
              const s = surahByNumber.get(b.surahNumber);
              return (
                <Pressable
                  key={`${b.surahNumber}-${b.ayahNumber}`}
                  onPress={() => openReader(b.surahNumber, b.ayahNumber)}
                  style={({ pressed }) => [styles.surahCard, pressed && styles.pressed]}>
                  <View style={styles.surahMid}>
                    <SazdaText variant="headlineMedium" color="primary">
                      {s?.englishName ?? `Surah ${b.surahNumber}`}
                    </SazdaText>
                    <SazdaText variant="caption" color="onSurfaceVariant">
                      Ayah {b.ayahNumber}
                    </SazdaText>
                  </View>
                  <Bookmark size={22} color={c.secondary} fill={c.secondary} />
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function shortArabic(fullName: string) {
  const p = fullName.trim().split(/\s+/);
  return p.length > 1 ? p[p.length - 1] : fullName;
}

function createSurahListStyles(c: AppPalette, _scheme: ResolvedScheme) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.surface },
  headerBlock: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    gap: spacing.sm + 2,
    marginBottom: spacing.sm,
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  heroTitleTexts: {
    flex: 1,
    minWidth: 0,
    paddingTop: 2,
  },
  backHit: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  heroLine1: {
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.4,
    fontWeight: '800',
  },
  heroLine2: {
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.4,
    fontWeight: '800',
    marginTop: -2,
  },
  search: {
    minHeight: 44,
    borderRadius: radius.md + 4,
    paddingVertical: 2,
  },
  tabs: {
    flexDirection: 'row',
    gap: 4,
    marginHorizontal: spacing.lg,
    padding: 3,
    borderRadius: radius.md + 4,
    backgroundColor: c.surfaceContainerLow,
    marginBottom: spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.md - 2,
    alignItems: 'center',
  },
  tabOn: {
    backgroundColor: c.primaryContainer,
    shadowColor: 'rgba(0,0,0,0.1)',
    shadowOpacity: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  tabText: { fontWeight: '700', fontSize: 12 },
  loader: { marginTop: spacing.xl },
  errorBox: { padding: spacing.xl },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.x3xl, gap: spacing.md },
  surahCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: c.surfaceContainerLowest,
    borderRadius: radius.md,
    gap: spacing.lg,
    shadowColor: 'rgba(6, 78, 59, 0.06)',
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  diamondWrap: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diamond: {
    position: 'absolute',
    width: 36,
    height: 36,
    backgroundColor: c.surfaceContainerHighest,
    borderRadius: 8,
    transform: [{ rotate: '45deg' }],
  },
  diamondNum: { fontWeight: '800', zIndex: 1 },
  surahMid: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  surahEn: { fontSize: 18 },
  surahSub: { fontSize: 11, letterSpacing: 1, marginTop: 4, opacity: 0.75 },
  surahAr: { fontSize: 22, maxWidth: '30%' },
  pressed: { opacity: 0.92 },
  resumeBanner: {
    marginTop: spacing.xl,
    backgroundColor: c.primaryContainer,
    borderRadius: radius.xl,
    padding: spacing.xl,
    overflow: 'hidden',
  },
  resumeSub: { marginTop: spacing.sm, marginBottom: spacing.lg, opacity: 0.95 },
  resumeBtn: {
    alignSelf: 'flex-start',
    backgroundColor: c.secondary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
  },
  resumeBtnText: { fontWeight: '700' },
  juzGrid: { paddingHorizontal: spacing.lg, paddingBottom: spacing.x3xl },
  juzWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  juzCell: {
    width: '30%',
    minWidth: 100,
    flexGrow: 1,
    aspectRatio: 1,
    maxWidth: '47%',
    backgroundColor: c.surfaceContainerLow,
    borderRadius: radius.md + 8,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  bookmarksContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.x3xl, gap: spacing.md },
  empty: { marginTop: spacing.xl, paddingHorizontal: spacing.lg },
});
}

