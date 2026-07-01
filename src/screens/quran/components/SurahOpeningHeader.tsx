import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fontFamilies, getFontConfig, typography } from '../../../theme/typography';
import { spacing } from '../../../theme/spacing';
import type { ReadingThemePalette } from '../../../theme/readingThemes';

type Props = {
  palette: ReadingThemePalette;
  arabicName: string;
  englishName: string;
  translation: string;
  ayahCount: number;
  /** alquran.cloud revelationType: 'Meccan' | 'Medinan'. */
  revelationType: string;
};

/** Returns a human "Revealed in …" line from the raw revelation type. */
export function revealedLabel(revelationType: string): string {
  return /mecc|makk/i.test(revelationType) ? 'Revealed in Makkah' : 'Revealed in Madinah';
}

/** Calm opening header at the top of a surah: Arabic name, English name, meta, gold ornament. */
export const SurahOpeningHeader = memo(function SurahOpeningHeader({
  palette: p,
  arabicName,
  englishName,
  translation,
  ayahCount,
  revelationType,
}: Props) {
  return (
    <View style={styles.wrap}>
      <Text allowFontScaling={false} style={[styles.arabic, { color: p.text }]}>
        {arabicName}
      </Text>
      <Text style={[styles.english, { color: p.text }]}>{englishName}</Text>
      <Text style={[styles.meta, { color: p.textMuted }]}>{translation}</Text>
      <View style={styles.ornamentRow}>
        <View style={[styles.rule, { backgroundColor: p.accent }]} />
        <Text style={[styles.diamond, { color: p.accent }]}>✦</Text>
        <View style={[styles.rule, { backgroundColor: p.accent }]} />
      </View>
      <Text style={[styles.meta, { color: p.textMuted }]}>
        {revealedLabel(revelationType)} • {ayahCount} ayahs
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  arabic: {
    ...getFontConfig(fontFamilies.arabic, '700'),
    fontSize: 30,
    lineHeight: 46,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  english: {
    ...typography.headlineMedium,
    textAlign: 'center',
  },
  meta: {
    ...typography.caption,
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  ornamentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  rule: {
    width: 40,
    height: StyleSheet.hairlineWidth * 2,
    opacity: 0.5,
    borderRadius: 1,
  },
  diamond: {
    fontSize: 12,
  },
});
