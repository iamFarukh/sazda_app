import { memo, useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
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
  liveScale: SharedValue<number>;
  showTranslation: boolean;
};

type LineProps = {
  line: { arabic: string; translation?: string | null; ref: { surah: number; ayah: number } };
  idx: number;
  palette: MushafThemePalette;
  liveScale: SharedValue<number>;
  showTranslation: boolean;
};

const MushafLine = memo(function MushafLine({ line, idx, palette, liveScale, showTranslation }: LineProps) {
  const arabicStyle = useAnimatedStyle(() => {
    const s = liveScale.value;
    const fs = 22 * s;
    return { fontSize: fs, lineHeight: fs * 1.75 };
  }, [liveScale]);

  const transStyle = useAnimatedStyle(() => {
    const s = liveScale.value;
    const fs = 14 * s;
    return { fontSize: fs, lineHeight: fs * 1.45 };
  }, [liveScale]);

  return (
    <View key={`${line.ref.surah}-${line.ref.ayah}-${idx}`} style={styles.ayahBlock}>
      <View style={styles.arabicRow}>
        <Animated.Text style={[styles.arabic, { color: palette.text }, arabicStyle]}>
          {line.arabic}
        </Animated.Text>
        <View style={[styles.marker, { borderColor: palette.ayahMarkerBorder, backgroundColor: palette.ayahMarkerBg }]}>
          <Text style={[styles.markerText, { color: palette.ayahMarkerText }]}>
            {toArabicIndicDigits(line.ref.ayah)}
          </Text>
        </View>
      </View>
      {showTranslation && line.translation ? (
        <Animated.Text style={[styles.translation, { color: palette.textMuted }, transStyle]}>
          {line.translation}
        </Animated.Text>
      ) : null}
    </View>
  );
});

export const MushafPageSlide = memo(function MushafPageSlide({
  page,
  width,
  height,
  paddingTop,
  paddingBottom,
  palette,
  liveScale,
  showTranslation,
}: Props) {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['mushaf', 'page', page],
    queryFn: () => loadMushafPagePayload(page),
    staleTime: 1000 * 60 * 60 * 24,
  });

  const body = useMemo(() => {
    if (!data?.ayahs.length) return null;
    return data.ayahs.map((line, idx) => (
      <MushafLine
        key={`${line.ref.surah}-${line.ref.ayah}-${idx}`}
        line={line}
        idx={idx}
        palette={palette}
        liveScale={liveScale}
        showTranslation={showTranslation}
      />
    ));
  }, [data, liveScale, palette, showTranslation]);

  return (
    <View style={[styles.pageRoot, { width, height, backgroundColor: palette.background }]}>
      {isPending ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={palette.accent} />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Pressable onPress={() => refetch()}>
            <Text style={{ color: palette.text }}>Could not load page. Tap to retry.</Text>
          </Pressable>
        </View>
      ) : !body ? (
        <View style={styles.centered}>
          <Pressable onPress={() => refetch()}>
            <Text style={{ color: palette.text }}>Page is empty. Tap to retry.</Text>
          </Pressable>
        </View>
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
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
