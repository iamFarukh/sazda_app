import { memo, useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { ChevronDown, Headphones, Pause, Play, Shuffle, SkipBack, SkipForward, Repeat, X } from 'lucide-react-native';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { useThemePalette } from '../../theme/useThemePalette';
import { useQuranAudioStore } from '../../store/quranAudioStore';

function fmt(sec: number) {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

/**
 * Single overlay that morphs Mini -> Full (YouTube Music feel).
 * - Animation runs on UI thread (Reanimated).
 * - State changes are minimal: only `uiExpanded` toggles on JS thread.
 */
export const QuranAudioPlayerOverlay = memo(function QuranAudioPlayerOverlay() {
  const { colors: c } = useThemePalette();
  const insets = useSafeAreaInsets();
  const { height: H } = useWindowDimensions();

  // Avoid object selectors (Fabric snapshot loops).
  const audioUrl = useQuranAudioStore(s => s.audioUrl);
  const uiExpanded = useQuranAudioStore(s => s.uiExpanded);
  const setUiExpanded = useQuranAudioStore(s => s.setUiExpanded);
  const surah = useQuranAudioStore(s => s.currentSurahEnglishName);
  const ayah = useQuranAudioStore(s => s.currentAyahNumber);
  const arabic = useQuranAudioStore(s => s.currentArabic);
  const translation = useQuranAudioStore(s => s.currentTranslation);
  const isPlaying = useQuranAudioStore(s => s.isPlaying);
  const isLoading = useQuranAudioStore(s => s.isLoading);
  const progress = useQuranAudioStore(s => s.progressSec);
  const duration = useQuranAudioStore(s => s.durationSec);
  const toggle = useQuranAudioStore(s => s.togglePlayPause);
  const stop = useQuranAudioStore(s => s.stop);
  const next = useQuranAudioStore(s => s.next);
  const prev = useQuranAudioStore(s => s.prev);

  const pct = useMemo(() => {
    if (!duration || duration <= 0) return 0;
    return Math.max(0, Math.min(1, progress / duration));
  }, [duration, progress]);

  // UI-thread progress for expand/collapse.
  // NOTE: Must be created unconditionally (no early returns before hooks).
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withTiming(uiExpanded ? 1 : 0, { duration: uiExpanded ? 260 : 220 });
  }, [t, uiExpanded]);

  // Layout tuned to match Stitch mock screens.
  const MINI_H = 62;
  const MINI_TOP_PAD = 10;
  const MINI_GAP_ABOVE_DOCK = 10;
  const FULL_TOP = Math.max(insets.top, 10);
  // Reserve space for the bottom tab dock so it stays visible (mini + full).
  // This app uses a tall custom dock; keep a safe constant + inset.
  const DOCK_H = 86 + Math.max(insets.bottom, 8);
  const availableH = Math.max(1, H - DOCK_H);
  const collapsedY =
    availableH - (MINI_TOP_PAD + MINI_H + MINI_GAP_ABOVE_DOCK);

  const sheetStyle = useAnimatedStyle(() => {
    const ty = interpolate(t.value, [0, 1], [collapsedY, 0], Extrapolation.CLAMP);
    const br = interpolate(t.value, [0, 1], [radius.xl, 0], Extrapolation.CLAMP);
    const insetX = interpolate(t.value, [0, 1], [spacing.md, 0], Extrapolation.CLAMP);
    return {
      transform: [{ translateY: ty }],
      borderRadius: br,
      left: insetX,
      right: insetX,
    };
  });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 1], [0, 0.55], Extrapolation.CLAMP),
  }));

  const miniOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.35], [1, 0], Extrapolation.CLAMP),
  }));

  const fullOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0.25, 1], [0, 1], Extrapolation.CLAMP),
  }));

  // If nothing active, render nothing (AFTER hooks).
  if (!audioUrl) return null;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {/* Backdrop */}
      <Animated.View
        pointerEvents={uiExpanded ? 'auto' : 'none'}
        style={[styles.backdrop, backdropStyle]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setUiExpanded(false)} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.sheet,
          sheetStyle,
          {
            backgroundColor: c.surface,
            borderColor: c.outlineVariant,
            bottom: DOCK_H,
          },
        ]}
      >
        {/* Mini */}
        <Animated.View style={[styles.miniRow, miniOpacity]}>
          <Pressable
            onPress={() => setUiExpanded(true)}
            style={[
              styles.miniTap,
              {
                backgroundColor: 'rgba(6,78,59,0.95)',
                borderColor: 'rgba(149,211,186,0.14)',
              },
            ]}
            accessibilityLabel="Open audio player"
          >
            <View style={styles.miniLeft}>
              <View style={[styles.thumb, { backgroundColor: 'rgba(255,255,255,0.10)' }]}>
                <Headphones size={18} color="#ffffff" strokeWidth={2.2} />
              </View>
              <View style={styles.miniMeta}>
                <Text style={[styles.miniTitle, { color: '#ffffff' }]} numberOfLines={1}>
                  Mishary Rashid Alafasy
                </Text>
                <Text style={[styles.miniSub, { color: 'rgba(128,190,166,0.95)' }]} numberOfLines={1}>
                  {surah ? `${surah} •` : ''} {ayah ? `Ayah ${ayah}` : ''}
                </Text>
              </View>
            </View>
            <View style={styles.miniControls}>
              <Pressable
                onPress={e => {
                  e.stopPropagation();
                  void prev();
                }}
                style={styles.iconHit}
                accessibilityLabel="Previous ayah"
              >
                <SkipBack size={20} color="#ffffff" strokeWidth={2.2} />
              </Pressable>
              <Pressable
                onPress={e => {
                  e.stopPropagation();
                  toggle();
                }}
                style={[styles.miniPlayBtn, { backgroundColor: '#fed65b' }]}
                accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying && !isLoading ? (
                  <Pause size={18} color="#241a00" strokeWidth={2.5} />
                ) : (
                  <Play size={18} color="#241a00" strokeWidth={2.5} />
                )}
              </Pressable>
              <Pressable
                onPress={e => {
                  e.stopPropagation();
                  void next();
                }}
                style={styles.iconHit}
                accessibilityLabel="Next ayah"
              >
                <SkipForward size={20} color="#ffffff" strokeWidth={2.2} />
              </Pressable>
              <Pressable
                onPress={e => {
                  e.stopPropagation();
                  stop();
                }}
                style={styles.iconHit}
                accessibilityLabel="Close audio"
              >
                <X size={18} color="rgba(255,255,255,0.55)" strokeWidth={2.2} />
              </Pressable>
            </View>
            <View style={[styles.miniProgressBg, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
              <View
                style={[
                  styles.miniProgressFill,
                  { width: `${pct * 100}%`, backgroundColor: '#fed65b' },
                ]}
              />
            </View>
          </Pressable>
        </Animated.View>

        {/* Full */}
        <Animated.View style={[styles.full, fullOpacity]}>
          <View pointerEvents="none" style={styles.fullBg}>
            <View style={[styles.star, { backgroundColor: 'rgba(6,78,59,0.06)' }]} />
          </View>
          <View style={[styles.fullHeader, { paddingTop: FULL_TOP + spacing.md }]}>
            <Pressable
              onPress={() => setUiExpanded(false)}
              style={[styles.hBtn, { backgroundColor: c.surfaceContainerLowest }]}
              accessibilityLabel="Collapse player"
            >
              <ChevronDown size={22} color={c.primary} strokeWidth={2.5} />
            </Pressable>
            <View style={styles.headerCenter}>
              <Text style={[styles.headerTitle, { color: c.primary }]} numberOfLines={1}>
                {surah ? `Surah ${surah}` : 'Surah'}
              </Text>
              <Text style={[styles.headerSub, { color: c.onSurfaceVariant }]} numberOfLines={1}>
                Mishary Rashid Alafasy {ayah ? `• Ayah ${ayah}` : ''}
              </Text>
            </View>
            <Pressable
              onPress={() => stop()}
              style={[styles.hBtn, { backgroundColor: c.surfaceContainerLowest }]}
              accessibilityLabel="Stop audio"
            >
              <X size={20} color={c.primary} strokeWidth={2.4} />
            </Pressable>
          </View>

          <View style={styles.fullBody}>
            <Text style={[styles.arabic, { color: c.primary }]} numberOfLines={4}>
              {arabic ?? ''}
            </Text>
            {translation ? (
              <Text style={[styles.translation, { color: c.onSurfaceVariant }]} numberOfLines={3}>
                “{translation}”
              </Text>
            ) : null}
          </View>

          <View style={[styles.fullFooter, { paddingBottom: insets.bottom + spacing.xl }]}>
            <View style={[styles.track, { backgroundColor: c.surfaceContainerHighest }]}>
              <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: c.primary }]} />
            </View>
            <View style={styles.timeRow}>
              <Text style={[styles.time, { color: c.primary }]}>{fmt(progress)}</Text>
              <Text style={[styles.time, { color: c.onSurfaceVariant }]}>{fmt(duration)}</Text>
            </View>

            <View style={styles.ctrlRow}>
              <Pressable
                onPress={() => {}}
                style={styles.ctrlGhost}
                accessibilityLabel="Shuffle (coming soon)"
              >
                <Shuffle size={22} color={c.onSurfaceVariant} strokeWidth={2.1} />
              </Pressable>
              <Pressable
                onPress={() => toggle()}
                disabled={isLoading}
                style={[
                  styles.playBtn,
                  { backgroundColor: c.primary, opacity: isLoading ? 0.6 : 1 },
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
                onPress={() => {}}
                style={styles.ctrlGhost}
                accessibilityLabel="Repeat (coming soon)"
              >
                <Repeat size={22} color={c.onSurfaceVariant} strokeWidth={2.1} />
              </Pressable>
            </View>

            <View style={styles.ctrlRow2}>
              <Pressable
                onPress={() => void prev()}
                style={[styles.ctrlBtn, { backgroundColor: 'rgba(0,0,0,0.03)' }]}
                accessibilityLabel="Previous ayah"
              >
                <SkipBack size={22} color={c.primary} strokeWidth={2.2} />
              </Pressable>
              <Pressable
                onPress={() => void next()}
                style={[styles.ctrlBtn, { backgroundColor: 'rgba(0,0,0,0.03)' }]}
                accessibilityLabel="Next ayah"
              >
                <SkipForward size={22} color={c.primary} strokeWidth={2.2} />
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  sheet: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    zIndex: 90,
    elevation: 90,
  },
  miniRow: { paddingTop: 10 },
  miniTap: {
    height: 62,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  miniLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingRight: 164 },
  thumb: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  miniMeta: { flex: 1, minWidth: 0 },
  miniTitle: { fontWeight: '800', fontSize: 13 },
  miniSub: { marginTop: 2, fontWeight: '700', fontSize: 10 },
  miniControls: { position: 'absolute', right: spacing.sm, top: 10, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  iconHit: { padding: spacing.xs },
  miniPlayBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  miniProgressBg: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 3 },
  miniProgressFill: { height: '100%' },
  full: { flex: 1 },
  fullBg: { ...StyleSheet.absoluteFillObject },
  star: {
    position: 'absolute',
    alignSelf: 'center',
    top: 170,
    width: 260,
    height: 260,
    borderRadius: 130,
    transform: [{ rotate: '45deg' }],
  },
  fullHeader: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  hBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, minWidth: 0, alignItems: 'center' },
  headerTitle: { fontWeight: '900', fontSize: 16 },
  headerSub: { marginTop: 2, fontWeight: '700', fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' },
  fullBody: { flex: 1, paddingHorizontal: spacing.xl, justifyContent: 'center', alignItems: 'center' },
  arabic: { fontSize: 40, lineHeight: 40 * 1.6, textAlign: 'center' },
  translation: { marginTop: spacing.xl, fontSize: 18, lineHeight: 26, textAlign: 'center', fontStyle: 'italic' },
  fullFooter: { paddingHorizontal: spacing.xl },
  track: { height: 6, borderRadius: radius.full, overflow: 'hidden' },
  fill: { height: '100%' },
  timeRow: { marginTop: spacing.sm, flexDirection: 'row', justifyContent: 'space-between' },
  time: { fontWeight: '800', fontSize: 12 },
  ctrlRow: { marginTop: spacing.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ctrlRow2: { marginTop: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xl },
  ctrlGhost: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  ctrlBtn: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  playBtn: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
});

