import { memo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { BookOpen, Pause, Play, Share2 } from 'lucide-react-native';
import { PressableScale } from '../../../components/atoms/PressableScale/PressableScale';
import { AnimatedBookmark } from '../../../components/atoms/AnimatedBookmark/AnimatedBookmark';
import { spacing } from '../../../theme/spacing';
import { radius } from '../../../theme/radius';
import { hapticSelection } from '../../../utils/appHaptics';
import type { ReadingThemePalette } from '../../../theme/readingThemes';

type AudioState = { isActive: boolean; isPlaying: boolean; isLoading: boolean; hasAudio: boolean };

type Props = {
  palette: ReadingThemePalette;
  bookmarked: boolean;
  audio: AudioState;
  iconSize?: number;
  onPlay: () => void;
  onTafsir: () => void;
  onToggleBookmark: () => void;
  onShare: () => void;
};

/** Per-ayah action bar revealed on tap: Play · Tafsir · Bookmark · Share. */
export const AyahActionBar = memo(function AyahActionBar({
  palette: p, bookmarked, audio, iconSize = 20, onPlay, onTafsir, onToggleBookmark, onShare,
}: Props) {
  const tap = (fn: () => void) => () => { hapticSelection(); fn(); };
  return (
    <View style={[styles.bar, { backgroundColor: p.ayahHighlight, borderColor: p.divider }]} accessibilityRole="toolbar">
      <PressableScale onPress={tap(onPlay)} disabled={!audio.hasAudio} style={styles.btn} accessibilityLabel="Play recitation">
        {audio.isActive && audio.isLoading ? (
          <ActivityIndicator size="small" color={p.accent} />
        ) : audio.isActive && audio.isPlaying ? (
          <Pause size={iconSize} color={p.accent} strokeWidth={2.3} />
        ) : (
          <Play size={iconSize} color={audio.hasAudio ? p.accent : p.textMuted} strokeWidth={2.3} />
        )}
      </PressableScale>
      <PressableScale onPress={tap(onTafsir)} style={styles.btn} accessibilityLabel="Tafsir">
        <BookOpen size={iconSize} color={p.text} strokeWidth={2} />
      </PressableScale>
      <PressableScale onPress={tap(onToggleBookmark)} style={styles.btn} accessibilityLabel="Bookmark">
        <AnimatedBookmark filled={bookmarked} onPress={tap(onToggleBookmark)} size={iconSize} color={p.textMuted} fillColor={p.accent} />
      </PressableScale>
      <PressableScale onPress={tap(onShare)} style={styles.btn} accessibilityLabel="Share verse">
        <Share2 size={iconSize} color={p.text} strokeWidth={2} />
      </PressableScale>
    </View>
  );
});

const styles = StyleSheet.create({
  bar: {
    marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth, alignSelf: 'flex-start',
  },
  btn: { minWidth: 40, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
});
