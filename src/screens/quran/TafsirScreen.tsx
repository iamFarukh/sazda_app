import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { SazdaText } from '../../components/atoms/SazdaText/SazdaText';
import type { QuranStackParamList } from '../../navigation/types';
import { fetchAllSurahs, fetchAyahTafsir } from '../../services/quranApi';
import { radius } from '../../theme/radius';
import type { AppPalette } from '../../theme/useThemePalette';
import type { ResolvedScheme } from '../../theme/useThemePalette';
import { useThemePalette } from '../../theme/useThemePalette';
import { spacing } from '../../theme/spacing';

type Nav = NativeStackNavigationProp<QuranStackParamList, 'Tafsir'>;
type R = RouteProp<QuranStackParamList, 'Tafsir'>;

export function TafsirScreen() {
  const { colors: c, scheme } = useThemePalette();
  const styles = useMemo(() => createTafsirStyles(c, scheme), [c, scheme]);
  const readFg = scheme === 'dark' ? c.onPrimaryContainer : c.onPrimary;

  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const { surahNumber, ayahNumber } = route.params;

  const { data: surahList } = useQuery({
    queryKey: ['quran', 'surahs'],
    queryFn: fetchAllSurahs,
    staleTime: 1000 * 60 * 60 * 24,
  });
  const surahMeta = surahList?.find(s => s.number === surahNumber);

  const {
    data: tafsir,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['quran', 'tafsir', surahNumber, ayahNumber],
    queryFn: () => fetchAyahTafsir(surahNumber, ayahNumber),
  });

  const maxAyah = surahMeta?.numberOfAyahs ?? 999;
  const canPrev = ayahNumber > 1;
  const canNext = ayahNumber < maxAyah;

  const go = (a: number) => {
    navigation.replace('Tafsir', { surahNumber, ayahNumber: a });
  };

  const goPrev = () => {
    if (canPrev) go(ayahNumber - 1);
  };

  const goNext = () => {
    if (canNext) go(ayahNumber + 1);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.hit} accessibilityLabel="Back">
          <ArrowLeft size={24} color={c.primary} strokeWidth={2} />
        </Pressable>
        <View style={styles.headerMid}>
          <SazdaText variant="headlineMedium" color="primary" numberOfLines={1}>
            Tafsir
          </SazdaText>
          <SazdaText variant="caption" color="onSurfaceVariant" numberOfLines={1}>
            {surahMeta?.englishName ?? `Surah ${surahNumber}`} · Ayah {ayahNumber}
          </SazdaText>
        </View>
        <View style={styles.hit} />
      </View>

      {tafsir ? (
        <SazdaText variant="caption" color="secondary" style={styles.source}>
          {tafsir.editionName} ({tafsir.editionIdentifier})
        </SazdaText>
      ) : null}

      {isPending ? (
        <ActivityIndicator style={styles.loader} color={c.primary} size="large" />
      ) : isError ? (
        <Pressable onPress={() => refetch()} style={styles.error}>
          <SazdaText variant="bodyMedium" color="error" align="center">
            Could not load tafsir. Tap to retry.
          </SazdaText>
        </Pressable>
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}>
          <SazdaText variant="body" color="onSurface" align="right" rtl style={styles.tafsirText}>
            {tafsir?.text}
          </SazdaText>
          <SazdaText variant="caption" color="onSurfaceVariant" style={styles.note}>
            Classical Arabic tafsir from api.alquran.cloud. English summaries may be added later.
          </SazdaText>
        </ScrollView>
      )}

      <View style={styles.footer}>
        <Pressable
          onPress={goPrev}
          disabled={!canPrev}
          style={[styles.navBtn, !canPrev && styles.navDisabled]}>
          <ChevronLeft size={22} color={c.primary} strokeWidth={2} />
          <SazdaText variant="bodyMedium" color="primary">
            Previous
          </SazdaText>
        </Pressable>
        <Pressable onPress={() => navigation.navigate('SurahReader', { surahNumber, ayahNumber })} style={styles.readBtn}>
          <SazdaText variant="bodyMedium" color={readFg} style={styles.readBtnText}>
            Open reader
          </SazdaText>
        </Pressable>
        <Pressable
          onPress={goNext}
          disabled={!canNext}
          style={[styles.navBtn, !canNext && styles.navDisabled]}>
          <SazdaText variant="bodyMedium" color="primary">
            Next
          </SazdaText>
          <ChevronRight size={22} color={c.primary} strokeWidth={2} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function createTafsirStyles(c: AppPalette, scheme: ResolvedScheme) {
  const heroFill = scheme === 'dark' ? c.primaryContainer : c.primary;

  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: scheme === 'dark' ? 'rgba(142,207,178,0.12)' : 'rgba(0,53,39,0.08)',
  },
  hit: { width: 44, height: 44, justifyContent: 'center' },
  headerMid: { flex: 1, minWidth: 0 },
  source: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, fontWeight: '600' },
  loader: { marginTop: spacing.x3xl },
  error: { padding: spacing.xl },
  body: { padding: spacing.lg, paddingBottom: spacing.xl },
  tafsirText: {
    fontSize: 18,
    lineHeight: 32,
    marginBottom: spacing.lg,
  },
  note: { fontStyle: 'italic', opacity: 0.85 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: scheme === 'dark' ? 'rgba(142,207,178,0.12)' : 'rgba(0,53,39,0.08)',
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: spacing.sm,
    opacity: 1,
  },
  navDisabled: { opacity: 0.35 },
  readBtn: {
    backgroundColor: heroFill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
  },
  readBtnText: { fontWeight: '700' },
});
}

