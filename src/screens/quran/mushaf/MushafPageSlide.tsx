import { memo, useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { loadMushafPagePayload } from '../../../services/mushaf/mushafPageContent';
import type { MushafThemePalette } from '../../../services/mushaf/mushafTheme';
import { toArabicIndicDigits } from '../../../services/mushaf/arabicNumerals';
import { spacing } from '../../../theme/spacing';

type Props = {
  page: number;
  width: number;
  height: number;
  /** Safe area + reserved space so text never sits under notch or tab bar / FABs. */
  paddingTop: number;
  paddingBottom: number;
  palette: MushafThemePalette;
  fontScale: number;
  showTranslation: boolean;
};

export const MushafPageSlide = memo(function MushafPageSlide({
  page,
  width,
  height,
  paddingTop,
  paddingBottom,
  palette,
  fontScale,
  showTranslation,
}: Props) {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['mushaf', 'page', page],
    queryFn: () => loadMushafPagePayload(page),
    staleTime: 1000 * 60 * 60 * 24,
  });

  const baseArabic = 22 * fontScale;
  const baseTrans = 14 * fontScale;

  const body = useMemo(() => {
    if (!data?.ayahs.length) return null;
    return data.ayahs.map((line, idx) => (
      <View
        key={`${line.ref.surah}-${line.ref.ayah}-${idx}`}
        style={styles.ayahBlock}>
        <View style={styles.arabicRow}>
          <Text
            style={[
              styles.arabic,
              {
                color: palette.text,
                fontSize: baseArabic,
                lineHeight: baseArabic * 1.75,
              },
            ]}>
            {line.arabic}
          </Text>
          <View style={[styles.marker, { borderColor: palette.ayahMarkerBorder, backgroundColor: palette.ayahMarkerBg }]}>
            <Text style={[styles.markerText, { color: palette.ayahMarkerText }]}>
              {toArabicIndicDigits(line.ref.ayah)}
            </Text>
          </View>
        </View>
        {showTranslation && line.translation ? (
          <Text
            style={[
              styles.translation,
              {
                color: palette.textMuted,
                fontSize: baseTrans,
                lineHeight: baseTrans * 1.45,
              },
            ]}>
            {line.translation}
          </Text>
        ) : null}
      </View>
    ));
  }, [data, palette, baseArabic, baseTrans, showTranslation]);

  return (
    <View style={[styles.pageRoot, { width, height, backgroundColor: palette.background }]}>
      {isPending ? (
        <ActivityIndicator size="large" color={palette.accent} />
      ) : isError ? (
        <Pressable onPress={() => refetch()}>
          <Text style={{ color: palette.text }}>Could not load page. Tap to retry.</Text>
        </Pressable>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop,
              paddingBottom,
              paddingHorizontal: spacing.lg,
            },
          ]}
          showsVerticalScrollIndicator
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          bounces>
          {body}
        </ScrollView>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  pageRoot: {
    overflow: 'hidden',
  },
  scroll: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
  },
  ayahBlock: {
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  arabicRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  arabic: {
    textAlign: 'center',
    flexShrink: 1,
  },
  marker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerText: {
    fontSize: 11,
    fontWeight: '700',
  },
  translation: {
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
});
