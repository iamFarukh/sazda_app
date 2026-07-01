import { memo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { BreathingView } from '../../../components/atoms/BreathingView/BreathingView';
import { AyahActionBar } from './AyahActionBar';
import { typography } from '../../../theme/typography';
import { spacing } from '../../../theme/spacing';
import { radius } from '../../../theme/radius';
import { hapticLight } from '../../../utils/appHaptics';
import type { AyahReaderRow } from '../../../services/quranApi';
import type { ReadingThemePalette } from '../../../theme/readingThemes';

const BASE_ARABIC = typography.quranVerse.fontSize; // 26
const BASE_TRANS = 15;
/** Traditional end-of-ayah ornament (U+06DD). */
const END_OF_AYAH = '۝';

type AudioState = { isActive: boolean; isPlaying: boolean; isLoading: boolean; hasAudio: boolean };

type Props = {
  item: AyahReaderRow;
  palette: ReadingThemePalette;
  showTranslation: boolean;
  bookmarked: boolean;
  liveScale: SharedValue<number>;
  audio: AudioState;
  onPlay: () => void;
  onTafsir: () => void;
  onToggleBookmark: () => void;
  onShare: () => void;
};

/**
 * A single ayah as a calm rounded card: soft gold number medallion, Uthmani verse with a
 * gold end-of-ayah ornament, translation, and a tap-to-reveal action bar. The active
 * (currently-playing) ayah breathes gently on a gold-tinted card.
 */
export const AyahBlock = memo(function AyahBlock({
  item, palette: p, showTranslation, bookmarked, liveScale, audio,
  onPlay, onTafsir, onToggleBookmark, onShare,
}: Props) {
  const [barOpen, setBarOpen] = useState(false);

  const arabicStyle = useAnimatedStyle(() => {
    const fs = BASE_ARABIC * liveScale.value;
    return { fontSize: fs, lineHeight: fs * 1.9 };
  }, [liveScale]);

  const transStyle = useAnimatedStyle(() => {
    const fs = BASE_TRANS * liveScale.value;
    return { fontSize: fs, lineHeight: fs * 1.55 };
  }, [liveScale]);

  const cardStyle = [
    styles.card,
    {
      backgroundColor: audio.isActive ? p.ayahHighlight : p.surface,
      borderColor: audio.isActive ? p.accent : p.divider,
    },
  ];

  const content = (
    <Pressable
      onPress={() => { hapticLight(); setBarOpen(o => !o); }}
      style={styles.inner}
      accessibilityRole="button" accessibilityLabel={`Ayah ${item.numberInSurah}`}>
      <View style={styles.headerRow}>
        <View style={[styles.marker, { backgroundColor: p.ayahHighlight, borderColor: p.accent }]}>
          <Text style={[styles.markerText, { color: p.accent }]}>{item.numberInSurah}</Text>
        </View>
      </View>
      <Animated.Text style={[styles.arabic, { color: p.text }, arabicStyle]} allowFontScaling={false}>
        {item.arabic}
        {'  '}
        <Text style={{ color: p.accent }}>{END_OF_AYAH}</Text>
      </Animated.Text>
      {showTranslation && item.translation ? (
        <Animated.Text style={[styles.translation, { color: p.textMuted }, transStyle]}>
          {item.translation}
        </Animated.Text>
      ) : null}
      {barOpen ? (
        <AyahActionBar palette={p} bookmarked={bookmarked} audio={audio}
          onPlay={onPlay} onTafsir={onTafsir} onToggleBookmark={onToggleBookmark} onShare={onShare} />
      ) : null}
    </Pressable>
  );

  if (audio.isActive) {
    return (
      <BreathingView style={cardStyle} minOpacity={0.94}>
        {content}
      </BreathingView>
    );
  }
  return <View style={cardStyle}>{content}</View>;
});

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginVertical: spacing.xs,
  },
  inner: { padding: spacing.lg, gap: spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  marker: {
    minWidth: 30, height: 30, borderRadius: radius.full, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xs,
  },
  markerText: { ...typography.label, letterSpacing: 0 },
  arabic: { ...typography.quranVerse, textAlign: 'right', writingDirection: 'rtl' },
  translation: { ...typography.bodyMedium },
});
