import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { typography } from '../../../theme/typography';
import { spacing } from '../../../theme/spacing';
import type { ReadingThemePalette } from '../../../theme/readingThemes';

type Props = {
  palette: ReadingThemePalette;
  englishName: string;
};

/** Pure copy helper (unit-tested): the surah-completion sentence. */
export function completionLine(englishName: string): string {
  return `You've completed Surah ${englishName}`;
}

/**
 * Calm completion block shown at the end of each surah in the continuous reader:
 * a soft gold ornament divider, the completion line, and a blessing.
 */
export const SurahTransition = memo(function SurahTransition({ palette: p, englishName }: Props) {
  return (
    <View style={styles.wrap} accessibilityRole="summary">
      <View style={styles.ornamentRow}>
        <View style={[styles.rule, { backgroundColor: p.accent }]} />
        <Text style={[styles.diamond, { color: p.accent }]}>✦</Text>
        <View style={[styles.rule, { backgroundColor: p.accent }]} />
      </View>
      <Text style={[styles.done, { color: p.text }]}>✓ {completionLine(englishName)}</Text>
      <Text style={[styles.blessing, { color: p.textMuted }]}>
        🤲 May Allah accept your recitation
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.xs,
  },
  ornamentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  rule: { width: 48, height: StyleSheet.hairlineWidth * 2, opacity: 0.5, borderRadius: 1 },
  diamond: { fontSize: 12 },
  done: { ...typography.bodyMedium, textAlign: 'center', fontWeight: '700' },
  blessing: { ...typography.caption, textAlign: 'center', letterSpacing: 0.4 },
});
