import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Pause, Play, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemePalette } from '../../theme/useThemePalette';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { useQuranAudioStore } from '../../store/quranAudioStore';
import { openQuranAudioPlayer } from '../../navigation/navigationRef';

export const QuranMiniPlayer = memo(function QuranMiniPlayer() {
  const { colors: c } = useThemePalette();
  const insets = useSafeAreaInsets();
  const audioUrl = useQuranAudioStore(s => s.audioUrl);
  const isPlaying = useQuranAudioStore(s => s.isPlaying);
  const isLoading = useQuranAudioStore(s => s.isLoading);
  const surahName = useQuranAudioStore(s => s.currentSurahEnglishName);
  const ayah = useQuranAudioStore(s => s.currentAyahNumber);
  const toggle = useQuranAudioStore(s => s.togglePlayPause);
  const stop = useQuranAudioStore(s => s.stop);
  const progress = useQuranAudioStore(s => s.progressSec);
  const duration = useQuranAudioStore(s => s.durationSec);

  const pct = useMemo(() => {
    if (!duration || duration <= 0) return 0;
    return Math.max(0, Math.min(1, progress / duration));
  }, [duration, progress]);

  if (!audioUrl) return null;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom, 8) + 82 }]}>
      <Pressable
        onPress={() => openQuranAudioPlayer()}
        style={[
          styles.card,
          {
            backgroundColor: c.primary,
            shadowColor: c.primary,
          },
        ]}
        accessibilityLabel="Open Quran audio player"
      >
        <View style={styles.left}>
          <Text style={[styles.title, { color: c.surface }]} numberOfLines={1}>
            {surahName ? `Surah ${surahName}` : 'Quran Audio'}
          </Text>
          <Text style={[styles.sub, { color: c.primaryFixedDim }]} numberOfLines={1}>
            {ayah ? `Ayah ${ayah}` : 'Ready'}
          </Text>
        </View>
        <View style={styles.controls}>
          <Pressable
            onPress={e => {
              e.stopPropagation();
              toggle();
            }}
            style={styles.iconHit}
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying && !isLoading ? (
              <Pause size={22} color={c.surface} strokeWidth={2.5} />
            ) : (
              <Play size={22} color={c.surface} strokeWidth={2.5} />
            )}
          </Pressable>
          <Pressable
            onPress={e => {
              e.stopPropagation();
              stop();
            }}
            style={styles.iconHit}
            accessibilityLabel="Close audio"
          >
            <X size={20} color={c.surface} strokeWidth={2.25} />
          </Pressable>
        </View>
        <View style={[styles.progressBg, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
          <View style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: c.secondaryContainer }]} />
        </View>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 80,
    elevation: 80,
  },
  card: {
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
    overflow: 'hidden',
  },
  left: { flex: 1, minWidth: 0 },
  title: { fontWeight: '800', fontSize: 14 },
  sub: { marginTop: 2, fontWeight: '700', fontSize: 11, opacity: 0.9 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconHit: { padding: spacing.xs },
  progressBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
  },
  progressFill: { height: '100%' },
});

