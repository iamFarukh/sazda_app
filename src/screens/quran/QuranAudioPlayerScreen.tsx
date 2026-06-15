import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Pause, Play, SkipBack, SkipForward, Repeat } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { QuranStackParamList } from '../../navigation/types';
import { useThemePalette } from '../../theme/useThemePalette';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { useQuranAudioStore } from '../../store/quranAudioStore';

type Nav = NativeStackNavigationProp<QuranStackParamList, 'QuranAudioPlayer'>;

function fmt(sec: number) {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export function QuranAudioPlayerScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { colors: c } = useThemePalette();

  const surah = useQuranAudioStore(s => s.currentSurahEnglishName);
  const ayah = useQuranAudioStore(s => s.currentAyahNumber);
  const arabic = useQuranAudioStore(s => s.currentArabic);
  const translation = useQuranAudioStore(s => s.currentTranslation);
  const isPlaying = useQuranAudioStore(s => s.isPlaying);
  const isLoading = useQuranAudioStore(s => s.isLoading);
  const progress = useQuranAudioStore(s => s.progressSec);
  const duration = useQuranAudioStore(s => s.durationSec);
  const error = useQuranAudioStore(s => s.error);
  const toggle = useQuranAudioStore(s => s.togglePlayPause);
  const next = useQuranAudioStore(s => s.next);
  const prev = useQuranAudioStore(s => s.prev);
  const auto = useQuranAudioStore(s => s.autoPlayNext);
  const setAuto = useQuranAudioStore(s => s.setAutoPlayNext);

  const pct = useMemo(() => {
    if (!duration || duration <= 0) return 0;
    return Math.max(0, Math.min(1, progress / duration));
  }, [duration, progress]);

  return (
    <View style={[styles.root, { backgroundColor: c.surface }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={[styles.hBtn, { backgroundColor: c.surfaceContainerLowest }]}
          accessibilityLabel="Back"
        >
          <ArrowLeft size={22} color={c.primary} strokeWidth={2.5} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: c.primary }]} numberOfLines={1}>
            {surah ? `Surah ${surah}` : 'Quran Audio'}
          </Text>
          <Text style={[styles.headerSub, { color: c.onSurfaceVariant }]} numberOfLines={1}>
            Mishary Rashid Alafasy {ayah ? `• Ayah ${ayah}` : ''}
          </Text>
        </View>
        <View style={styles.hBtn} />
      </View>

      <View style={styles.body}>
        <Text style={[styles.arabic, { color: c.primary }]}>{arabic ?? ''}</Text>
        {translation ? (
          <Text style={[styles.translation, { color: c.onSurfaceVariant }]}>
            “{translation}”
          </Text>
        ) : null}
        {error ? <Text style={[styles.err, { color: c.error }]}>{error}</Text> : null}
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={[styles.progressTrack, { backgroundColor: c.surfaceContainerHigh }]}>
          <View style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: c.primaryContainer }]} />
        </View>
        <View style={styles.timeRow}>
          <Text style={[styles.time, { color: c.primary }]}>{fmt(progress)}</Text>
          <Text style={[styles.time, { color: c.onSurfaceVariant }]}>{fmt(duration)}</Text>
        </View>

        <View style={styles.controls}>
          <Pressable
            onPress={() => setAuto(!auto)}
            style={[styles.smallBtn, { backgroundColor: c.surfaceContainerLow }]}
            accessibilityLabel={auto ? 'Disable autoplay' : 'Enable autoplay'}
          >
            <Repeat size={20} color={auto ? c.primary : c.outline} strokeWidth={2.2} />
          </Pressable>
          <Pressable
            onPress={() => void prev()}
            style={[styles.smallBtn, { backgroundColor: c.surfaceContainerLow }]}
            accessibilityLabel="Previous ayah"
          >
            <SkipBack size={22} color={c.primary} strokeWidth={2.2} />
          </Pressable>
          <Pressable
            onPress={() => toggle()}
            disabled={isLoading}
            style={[
              styles.bigBtn,
              { backgroundColor: c.primaryContainer, opacity: isLoading ? 0.6 : 1 },
            ]}
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause size={32} color={c.surface} strokeWidth={2.2} />
            ) : (
              <Play size={32} color={c.surface} strokeWidth={2.2} />
            )}
          </Pressable>
          <Pressable
            onPress={() => void next()}
            style={[styles.smallBtn, { backgroundColor: c.surfaceContainerLow }]}
            accessibilityLabel="Next ayah"
          >
            <SkipForward size={22} color={c.primary} strokeWidth={2.2} />
          </Pressable>
          <View style={styles.smallBtn} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  hBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, minWidth: 0, alignItems: 'center' },
  headerTitle: { fontWeight: '800', fontSize: 16 },
  headerSub: { marginTop: 2, fontWeight: '700', fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' },
  body: { flex: 1, paddingHorizontal: spacing.xl, justifyContent: 'center', alignItems: 'center' },
  arabic: { fontSize: 42, lineHeight: 42 * 1.6, textAlign: 'center' },
  translation: { marginTop: spacing.xl, fontSize: 18, lineHeight: 26, textAlign: 'center', fontStyle: 'italic' },
  err: { marginTop: spacing.lg, fontWeight: '700' },
  footer: { paddingHorizontal: spacing.xl },
  progressTrack: { height: 6, borderRadius: radius.full, overflow: 'hidden' },
  progressFill: { height: '100%' },
  timeRow: { marginTop: spacing.sm, flexDirection: 'row', justifyContent: 'space-between' },
  time: { fontWeight: '800', fontSize: 12 },
  controls: { marginTop: spacing.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  smallBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigBtn: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
});

