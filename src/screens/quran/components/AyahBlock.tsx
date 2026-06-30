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

/** Spacious ayah block with breathing active-highlight and an expandable action bar. */
export const AyahBlock = memo(function AyahBlock({
  item, palette: p, showTranslation, bookmarked, liveScale, audio,
  onPlay, onTafsir, onToggleBookmark, onShare,
}: Props) {
  const [barOpen, setBarOpen] = useState(false);

  const arabicStyle = useAnimatedStyle(() => {
    const fs = BASE_ARABIC * liveScale.value;
    return { fontSize: fs, lineHeight: fs * 2 };
  }, [liveScale]);

  const transStyle = useAnimatedStyle(() => {
    const fs = BASE_TRANS * liveScale.value;
    return { fontSize: fs, lineHeight: fs * 1.55 };
  }, [liveScale]);

  const content = (
    <Pressable
      onPress={() => { hapticLight(); setBarOpen(o => !o); }}
      style={[styles.block, { borderBottomColor: p.divider }]}
      accessibilityRole="button" accessibilityLabel={`Ayah ${item.numberInSurah}`}>
      <View style={styles.headerRow}>
        <View style={[styles.marker, { backgroundColor: p.ayahMarkerBg, borderColor: p.ayahMarkerBorder }]}>
          <Text style={[styles.markerText, { color: p.ayahMarkerText }]}>{item.numberInSurah}</Text>
        </View>
      </View>
      <Animated.Text style={[styles.arabic, { color: p.text }, arabicStyle]} allowFontScaling={false}>
        {item.arabic}
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
      <BreathingView style={[styles.activeWrap, { backgroundColor: p.ayahHighlight }]} minOpacity={0.92}>
        {content}
      </BreathingView>
    );
  }
  return content;
});

const styles = StyleSheet.create({
  block: { paddingVertical: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, gap: spacing.sm },
  activeWrap: { borderRadius: radius.md, paddingHorizontal: spacing.md, marginVertical: spacing.xs },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  marker: {
    minWidth: 30, height: 30, borderRadius: radius.full, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xs,
  },
  markerText: { ...typography.label, letterSpacing: 0 },
  arabic: { ...typography.quranVerse, textAlign: 'right', writingDirection: 'rtl' },
  translation: { ...typography.bodyMedium },
});
