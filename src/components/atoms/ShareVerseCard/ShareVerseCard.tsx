import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { typography } from '../../../theme/typography';
import { spacing } from '../../../theme/spacing';
import { radius } from '../../../theme/radius';
import type { ReadingThemePalette } from '../../../theme/readingThemes';

type Props = {
  palette: ReadingThemePalette;
  arabic: string;
  translation?: string;
  surahEnglishName: string;
  surahNumber: number;
  ayahNumber: number;
};

/**
 * Sazda-styled verse card used in the share preview. Text share goes out via RN's built-in
 * Share. FOLLOW-UP (deferred): image-capture share needs `react-native-view-shot` + a native
 * rebuild — capture this view by ref and share the PNG. Not in this plan.
 */
export const ShareVerseCard = memo(function ShareVerseCard({
  palette: p, arabic, translation, surahEnglishName, surahNumber, ayahNumber,
}: Props) {
  return (
    <View style={[styles.card, { backgroundColor: p.surface, borderColor: p.divider }]}>
      <Text allowFontScaling={false} style={[styles.arabic, { color: p.text }]} accessibilityLabel="Verse Arabic">
        {arabic}
      </Text>
      {translation ? (
        <Text style={[styles.translation, { color: p.textMuted }]}>{translation}</Text>
      ) : null}
      <Text style={[styles.reference, { color: p.accent }]}>
        Surah {surahEnglishName} • {surahNumber}:{ayahNumber}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, padding: spacing.xl, gap: spacing.md },
  arabic: { ...typography.quranVerse, textAlign: 'right', writingDirection: 'rtl' },
  translation: { ...typography.bodyMedium, lineHeight: 24 },
  reference: { ...typography.label, textAlign: 'right' },
});
