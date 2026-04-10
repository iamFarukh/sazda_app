import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowRight,
  BookOpen,
  Bookmark,
  CloudDownload,
  Lightbulb,
  BookText,
  Search,
} from 'lucide-react-native';
import { TabLandingHeader } from '../../components/organisms/TabLandingHeader';
import { TextInput } from '../../components/atoms/TextInput/TextInput';
import { SazdaText } from '../../components/atoms/SazdaText/SazdaText';
import { fetchAllSurahs, type QuranApiSurah } from '../../services/quranApi';
import type { QuranStackParamList } from '../../navigation/types';
import { useQuranProgressStore } from '../../store/quranProgressStore';
import {
  scheduleOfflineQuranBootstrapIfNeeded,
  useOfflineQuranDownloadStore,
} from '../../store/offlineQuranDownloadStore';
import { useMushafReaderStore } from '../../store/mushafReaderStore';
import { radius } from '../../theme/radius';
import type { AppPalette } from '../../theme/useThemePalette';
import type { ResolvedScheme } from '../../theme/useThemePalette';
import { useThemePalette } from '../../theme/useThemePalette';
import { spacing } from '../../theme/spacing';

const POPULAR_NUMBERS = [1, 2, 18, 36] as const;

type Nav = NativeStackNavigationProp<QuranStackParamList, 'QuranHome'>;

export function QuranHomeScreen() {
  const { colors: c, scheme } = useThemePalette();
  const styles = useMemo(() => createQuranHomeStyles(c, scheme), [c, scheme]);

  const navigation = useNavigation<Nav>();
  const [query, setQuery] = useState('');
  const lastRead = useQuranProgressStore(s => s.lastRead);
  const recentSurahs = useQuranProgressStore(s => s.recentSurahs);

  const odBootstrap = useOfflineQuranDownloadStore(s => s.bootstrap);
  const odJob = useOfflineQuranDownloadStore(s => s.job);
  const odProgress = useOfflineQuranDownloadStore(s => s.progress01);
  const odStatus = useOfflineQuranDownloadStore(s => s.statusLine);
  const odCompleted = useOfflineQuranDownloadStore(s => s.surahsCompleted);
  const mushafLastPage = useMushafReaderStore(s => s.lastReadPage);

  useFocusEffect(
    useCallback(() => {
      void odBootstrap();
      scheduleOfflineQuranBootstrapIfNeeded();
    }, [odBootstrap]),
  );

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

  const filteredPopular = useMemo(() => {
    if (!surahs) return [];
    const q = query.trim().toLowerCase();
    const list = POPULAR_NUMBERS.map(n => surahByNumber.get(n)).filter(Boolean) as QuranApiSurah[];
    if (!q) return list;
    return list.filter(
      s =>
        s.englishName.toLowerCase().includes(q) ||
        s.englishNameTranslation.toLowerCase().includes(q) ||
        String(s.number).includes(q) ||
        s.name.includes(q),
    );
  }, [surahs, surahByNumber, query]);

  const openReader = (surahNumber: number, ayahNumber?: number) => {
    navigation.navigate('SurahReader', { surahNumber, ayahNumber });
  };

  const openList = () => {
    navigation.navigate('SurahList', { initialQuery: query.trim() || undefined });
  };

  const lastReadMeta = lastRead ? surahByNumber.get(lastRead.surahNumber) : undefined;

  const showOfflinePrep =
    (odJob === 'running' || odJob === 'paused') && odCompleted < 114 && odProgress < 0.999;
  const offlinePct = Math.round(Math.min(100, Math.max(0, odProgress * 100)));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <TabLandingHeader denseBottom />

        <View style={styles.searchWrap}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search Surah, Juz, or Ayah..."
            returnKeyType="search"
            onSubmitEditing={openList}
            density="compact"
            left={<Search size={20} color={c.outline} strokeWidth={2} />}
          />
        </View>

        {showOfflinePrep ? (
          <View style={styles.offlineBanner} accessibilityRole="progressbar">
            <View style={styles.offlineBannerTop}>
              <CloudDownload size={20} color={c.primary} strokeWidth={2} />
              <SazdaText variant="bodyMedium" color="primary" style={styles.offlineBannerText}>
                Preparing Quran for offline use… {offlinePct}%
              </SazdaText>
            </View>
            {odStatus ? (
              <SazdaText variant="caption" color="onSurfaceVariant" numberOfLines={1}>
                {odStatus}
              </SazdaText>
            ) : null}
            <View style={styles.offlineTrack}>
              <View style={[styles.offlineFill, { width: `${offlinePct}%` }]} />
            </View>
          </View>
        ) : null}

        {isPending ? (
          <ActivityIndicator style={styles.loader} color={c.primary} />
        ) : isError ? (
          <Pressable onPress={() => refetch()} style={styles.errorBox}>
            <SazdaText variant="bodyMedium" color="error" align="center">
              Couldn&apos;t load Quran catalog. Tap to retry.
            </SazdaText>
          </Pressable>
        ) : null}

        {/* Last read */}
        <View style={styles.heroWrap}>
          <View style={styles.heroGlow} pointerEvents="none" />
          <View style={styles.heroCard}>
            <View style={styles.heroKicker}>
              <Bookmark size={18} color={c.secondaryContainer} />
              <SazdaText variant="label" color="onPrimary" style={styles.heroKickerText}>
                Last Read
              </SazdaText>
            </View>
            <SazdaText variant="headlineLarge" color="onPrimary" style={styles.heroTitle}>
              {lastReadMeta?.englishName ?? 'Start reading'}
            </SazdaText>
            <SazdaText variant="bodyMedium" color="onPrimary" style={styles.heroSub}>
              {lastRead
                ? `Ayah ${lastRead.ayahNumber} • Juz ${juzHint(lastRead.surahNumber, lastRead.ayahNumber)}`
                : 'Open any surah — we’ll remember where you pause.'}
            </SazdaText>
            <Pressable
              onPress={() =>
                openReader(lastRead?.surahNumber ?? 1, lastRead?.ayahNumber ?? 1)
              }
              style={({ pressed }) => [styles.cta, pressed && styles.pressed]}>
              <SazdaText variant="bodyMedium" color="onSecondaryContainer" style={styles.ctaText}>
                {lastRead ? 'Continue reading' : 'Open Quran'}
              </SazdaText>
              <ArrowRight size={20} color={c.onSecondaryContainer} strokeWidth={2.5} />
            </Pressable>
          </View>
        </View>

        {/* Recently opened */}
        <View style={styles.block}>
          <View style={styles.blockHead}>
            <SazdaText variant="headlineMedium" color="primary">
              Recently Opened
            </SazdaText>
            <Pressable onPress={openList}>
              <SazdaText variant="bodyMedium" color="secondary" style={styles.link}>
                View History
              </SazdaText>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
            {recentSurahs.map(entry => {
              const num = entry.surahNumber;
              const s = surahByNumber.get(num);
              if (!s) return null;
              const progress =
                lastRead?.surahNumber === num ? Math.min(1, lastRead.ayahNumber / s.numberOfAyahs) : 0.35;
              return (
                <Pressable
                  key={num}
                  onPress={() => openReader(num, 1)}
                  style={({ pressed }) => [styles.recentCard, pressed && styles.pressed]}>
                  <View style={styles.recentNum}>
                    <SazdaText variant="caption" color="primary" style={styles.recentNumText}>
                      {String(s.number).padStart(3, '0')}
                    </SazdaText>
                  </View>
                  <SazdaText variant="titleSm" color="onSurface" numberOfLines={1}>
                    {s.englishName}
                  </SazdaText>
                  <SazdaText variant="caption" color="onSurfaceVariant" style={styles.recentVerses}>
                    {s.numberOfAyahs} Verses
                  </SazdaText>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Popular */}
        <View style={styles.block}>
          <SazdaText variant="headlineMedium" color="primary" style={styles.popularTitle}>
            Popular Surahs
          </SazdaText>
          <View style={styles.popularList}>
            {filteredPopular.map(s => (
              <Pressable
                key={s.number}
                onPress={() => openReader(s.number, 1)}
                style={({ pressed }) => [styles.popularRow, pressed && styles.pressed]}>
                <View style={styles.popularLeft}>
                  <View style={styles.geoWrap}>
                    <SazdaText variant="caption" color="outlineVariant" style={styles.geoGhost}>
                      ◎
                    </SazdaText>
                    <SazdaText variant="caption" color="primary" style={styles.geoNum}>
                      {s.number}
                    </SazdaText>
                  </View>
                  <View style={styles.popularText}>
                    <SazdaText variant="titleSm" color="onSurface">
                      {s.englishName}
                    </SazdaText>
                    <SazdaText variant="caption" color="onSurfaceVariant" style={styles.popularSub}>
                      {s.englishNameTranslation.toUpperCase()} • {s.numberOfAyahs} Verses
                    </SazdaText>
                  </View>
                </View>
                <SazdaText variant="headlineMedium" color="primary" style={styles.arSide} rtl numberOfLines={1}>
                  {shortArabicTitle(s.name)}
                </SazdaText>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable onPress={openList} style={styles.viewAll}>
          <SazdaText variant="titleSm" color="secondary">
            View all 114 surahs
          </SazdaText>
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate('MushafReader', {})}
          style={({ pressed }) => [styles.mushafHero, pressed && styles.pressed]}>
          <View style={styles.mushafHeroGlow} pointerEvents="none" />
          <View style={styles.mushafHeroRow}>
            <View style={styles.mushafIconWrap}>
              <BookText size={26} color={c.onPrimaryContainer} strokeWidth={2.2} />
            </View>
            <View style={styles.mushafHeroText}>
              <SazdaText variant="titleSm" color="onPrimaryContainer" style={styles.mushafHeroTitle}>
                Mushaf Mode
              </SazdaText>
              <SazdaText variant="caption" color="onPrimaryContainer" style={styles.mushafHeroSub}>
                Page-by-page reading · 604 pages
                {mushafLastPage ? ` · Last page ${mushafLastPage}` : ''}
              </SazdaText>
            </View>
            <ArrowRight size={22} color={c.secondary} strokeWidth={2.5} />
          </View>
        </Pressable>

        {/* Bento */}
        <View style={styles.bentoRow}>
          <Pressable
            onPress={() => navigation.navigate('SurahList', { initialTab: 'juz' })}
            style={({ pressed }) => [styles.bentoGold, pressed && styles.pressed]}>
            <BookOpen size={32} color={c.secondary} strokeWidth={2} />
            <View>
              <SazdaText variant="headlineMedium" color="onSurface">
                Juz
              </SazdaText>
              <SazdaText variant="caption" color="onSurfaceVariant">
                30 Sections
              </SazdaText>
            </View>
          </Pressable>
          <Pressable
            onPress={() =>
              navigation.navigate('Tafsir', {
                surahNumber: lastRead?.surahNumber ?? 1,
                ayahNumber: lastRead?.ayahNumber ?? 1,
              })
            }
            style={({ pressed }) => [styles.bentoNeutral, pressed && styles.pressed]}>
            <Lightbulb size={32} color={c.primary} strokeWidth={2} />
            <View>
              <SazdaText variant="headlineMedium" color="onSurface">
                Tafsir
              </SazdaText>
              <SazdaText variant="caption" color="onSurfaceVariant">
                Explanations
              </SazdaText>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Rough juz label for hero (full accuracy needs ayah→juz map). */
function juzHint(surah: number, ayah: number): number {
  if (surah < 2) return 1;
  if (surah < 18) return Math.min(15, 2 + Math.floor(surah / 3));
  if (surah === 18) return ayah < 75 ? 15 : 16;
  return Math.min(30, 16 + Math.floor(surah / 8));
}

function shortArabicTitle(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : fullName;
}

function createQuranHomeStyles(c: AppPalette, scheme: ResolvedScheme) {
  const heroFill = scheme === 'dark' ? c.primaryContainer : c.primary;
  const heroOn = scheme === 'dark' ? c.onPrimaryContainer : c.onPrimary;
  const bentoGoldBg = scheme === 'dark' ? 'rgba(212,175,55,0.2)' : 'rgba(254, 214, 91, 0.35)';
  const bentoGoldBorder = scheme === 'dark' ? 'rgba(212,175,55,0.32)' : 'rgba(254, 214, 91, 0.45)';
  const recentBorder = scheme === 'dark' ? 'rgba(142,207,178,0.2)' : 'rgba(191, 201, 195, 0.35)';

  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.surface },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.x3xl + spacing.xl,
    gap: spacing.lg,
  },
  searchWrap: {
    marginTop: -spacing.xxs,
  },
  offlineBanner: {
    backgroundColor: scheme === 'dark' ? 'rgba(142,207,178,0.12)' : 'rgba(142, 207, 178, 0.28)',
    borderRadius: radius.md + 6,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,53,39,0.12)',
  },
  offlineBannerTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  offlineBannerText: { flex: 1, fontWeight: '600' },
  offlineTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,53,39,0.12)',
    overflow: 'hidden',
  },
  offlineFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: c.primary,
  },
  loader: { marginVertical: spacing.lg },
  errorBox: { padding: spacing.lg },
  heroWrap: { position: 'relative' },
  heroGlow: {
    position: 'absolute',
    left: -2,
    right: -2,
    top: 6,
    bottom: -6,
    backgroundColor: c.secondaryContainer,
    opacity: 0.14,
    borderRadius: radius.xl,
  },
  heroCard: {
    backgroundColor: heroFill,
    borderRadius: radius.xl,
    padding: spacing.xl,
    overflow: 'hidden',
    shadowColor: 'rgba(0, 53, 39, 0.35)',
    shadowOpacity: 1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  heroKicker: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  heroKickerText: { opacity: 0.9, letterSpacing: 2 },
  heroTitle: { color: heroOn, marginBottom: 4 },
  heroSub: { color: heroOn, opacity: 0.88, marginBottom: spacing.lg },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.sm,
    backgroundColor: c.secondaryContainer,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    shadowColor: 'rgba(0,0,0,0.15)',
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  ctaText: { fontWeight: '700' },
  pressed: { opacity: 0.9 },
  block: { gap: spacing.md },
  blockHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  link: { fontWeight: '600' },
  hScroll: { gap: spacing.md, paddingVertical: 4 },
  recentCard: {
    width: 160,
    backgroundColor: c.surfaceContainerLowest,
    borderRadius: radius.md + 8,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: recentBorder,
    shadowColor: 'rgba(6, 78, 59, 0.06)',
    shadowOpacity: 1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  recentNum: {
    width: 40,
    height: 40,
    borderRadius: radius.sm + 4,
    backgroundColor: c.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  recentNumText: { fontWeight: '800' },
  recentVerses: { marginTop: 4, marginBottom: spacing.sm, fontSize: 11 },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: c.surfaceContainer,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: c.primary,
    borderRadius: 2,
  },
  popularTitle: { marginBottom: spacing.sm },
  popularList: { gap: spacing.md },
  popularRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: c.surfaceContainerLow,
    borderRadius: radius.md + 8,
    gap: spacing.md,
  },
  popularLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, flex: 1, minWidth: 0 },
  geoWrap: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  geoGhost: { position: 'absolute', opacity: 0.25, fontSize: 36 },
  geoNum: { fontWeight: '800', zIndex: 1 },
  popularText: { flex: 1, minWidth: 0 },
  popularSub: { fontSize: 11, letterSpacing: 0.5, marginTop: 2 },
  arSide: { fontSize: 22, maxWidth: '38%' },
  bentoRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  bentoGold: {
    flex: 1,
    aspectRatio: 1,
    maxHeight: 180,
    borderRadius: radius.xl,
    backgroundColor: bentoGoldBg,
    borderWidth: 1,
    borderColor: bentoGoldBorder,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  bentoNeutral: {
    flex: 1,
    aspectRatio: 1,
    maxHeight: 180,
    borderRadius: radius.xl,
    backgroundColor: c.surfaceContainerHighest,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  viewAll: {
    alignSelf: 'center',
    paddingVertical: spacing.xs,
  },
  mushafHero: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: c.primaryContainer,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: scheme === 'dark' ? 'rgba(11,81,63,0.5)' : 'rgba(6,78,59,0.2)',
    shadowColor: 'rgba(6, 78, 59, 0.2)',
    shadowOpacity: 1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  mushafHeroGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: c.secondary,
    opacity: 0.08,
  },
  mushafHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  mushafIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md + 4,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mushafHeroText: { flex: 1, minWidth: 0 },
  mushafHeroTitle: { fontWeight: '800', letterSpacing: 0.2 },
  mushafHeroSub: { marginTop: 4, opacity: 0.92, lineHeight: 18 },
});
}

