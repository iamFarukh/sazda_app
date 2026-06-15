import { memo, useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  ChevronDown,
  Headphones,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  X,
} from 'lucide-react-native';
import { spacing } from '../../../theme/spacing';
import { radius } from '../../../theme/radius';
import { useThemePalette } from '../../../theme/useThemePalette';
import { useQuranAudioStore } from '../../../store/quranAudioStore';

function fmt(sec: number) {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

type Props = {
  /** Height of the bottom tab bar (from @react-navigation/bottom-tabs) */
  tabBarHeight: number;
  /** Height of the reader content container (below header). */
  containerHeight: number;
};

/**
 * Reader-contained mini + expandable full player.
 * - NOT global overlay
 * - Sits above the tab bar within the screen layout
 * - Expands smoothly from the mini card
 */
export const ReaderAudioPlayerSheet = memo(function ReaderAudioPlayerSheet({
  tabBarHeight,
  containerHeight,
}: Props) {
  const { colors: c } = useThemePalette();
  const insets = useSafeAreaInsets();
  const H = Math.max(1, containerHeight);

  const audioUrl = useQuranAudioStore(s => s.audioUrl);
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

  // Expansion progress (UI thread)
  const expanded = useSharedValue(0);
  const setExpanded = (v: boolean) => {
    expanded.value = withTiming(v ? 1 : 0, { duration: v ? 260 : 220 });
  };

  // Reset to collapsed when audio stops.
  useEffect(() => {
    if (!audioUrl) {
      expanded.value = 0;
    }
  }, [audioUrl, expanded]);

  const MINI_H = 66;
  // Use a negative gap to let the mini player physically overlap into the empty floating space of the arched tab bar bounding box
  const MINI_GAP_ABOVE_TABS = -54;
  // Pull it down physically closer to the arched Sazda tabs, shrinking the large floating visual gap
  const bottomPad = Math.max(0, tabBarHeight - 12);

  const collapsedY = Math.max(
    0,
    H -
    (bottomPad + MINI_GAP_ABOVE_TABS + MINI_H),
  );

  const sheetStyle = useAnimatedStyle(() => {
    const ty = interpolate(expanded.value, [0, 1], [collapsedY, 0], Extrapolation.CLAMP);
    const br = interpolate(expanded.value, [0, 1], [radius.xl, 0], Extrapolation.CLAMP);
    return {
      transform: [{ translateY: ty }],
      borderRadius: br,
    };
  });

  const miniOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(expanded.value, [0, 0.35], [1, 0], Extrapolation.CLAMP),
    pointerEvents: expanded.value > 0.1 ? 'none' : 'auto',
  }));
  const fullOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(expanded.value, [0.25, 1], [0, 1], Extrapolation.CLAMP),
    pointerEvents: expanded.value > 0.5 ? 'auto' : 'none',
  }));

  const sheetAnimatedProps = useAnimatedProps(() => {
    return {
      pointerEvents: expanded.value > 0.1 ? 'auto' : 'box-none'
    } as any;
  });

  // Swipe-down to collapse (only when expanded)
  const pan = useMemo(() => {
    return Gesture.Pan()
      .enabled(true)
      .onEnd(e => {
        'worklet';
        if (expanded.value < 0.8) return;
        if (e.translationY > 70 || e.velocityY > 900) {
          expanded.value = withTiming(0, { duration: 220 });
        }
      });
  }, [expanded]);

  if (!audioUrl) return null;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <GestureDetector gesture={pan}>
        <Animated.View
          animatedProps={sheetAnimatedProps}
          style={[
            styles.sheet,
            sheetStyle,
            {
              backgroundColor: 'rgba(6,78,59,0.98)',
              borderColor: 'rgba(149,211,186,0.14)',
              bottom: 0,
            },
          ]}
        >
          {/* Mini */}
          <Animated.View pointerEvents="box-none" style={[styles.miniWrap, miniOpacity]}>
            <Pressable
              onPress={() => setExpanded(true)}
              style={[
                styles.mini,
                {
                  backgroundColor: 'transparent',
                  borderColor: 'transparent',
                },
              ]}
              accessibilityLabel="Open audio player"
            >
              <View style={styles.miniLeft}>
                <View style={[styles.thumb, { backgroundColor: 'rgba(255,255,255,0.10)' }]}>
                  <Headphones size={18} color="#fff" strokeWidth={2.2} />
                </View>
                <View style={styles.miniMeta}>
                  <Text style={[styles.miniTitle, { color: '#fff' }]} numberOfLines={1}>
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
                  <SkipBack size={20} color="#fff" strokeWidth={2.2} />
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
                  <SkipForward size={20} color="#fff" strokeWidth={2.2} />
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
                <View style={[styles.miniProgressFill, { width: `${pct * 100}%`, backgroundColor: '#fed65b' }]} />
              </View>
            </Pressable>
          </Animated.View>

          {/* Full */}
          <Animated.View style={[styles.full, fullOpacity]}>
            <View style={[styles.fullHeader, { paddingTop: spacing.md }]}>
              <Pressable
                onPress={() => setExpanded(false)}
                style={[styles.hBtn, { backgroundColor: 'rgba(255,255,255,0.08)' }]}
                accessibilityLabel="Collapse player"
              >
                <ChevronDown size={22} color="#fff" strokeWidth={2.5} />
              </Pressable>
              <View style={styles.headerCenter}>
                <Text style={[styles.headerTitle, { color: '#fff' }]} numberOfLines={1}>
                  {surah ? `Surah ${surah}` : 'Surah'}
                </Text>
                <Text style={[styles.headerSub, { color: 'rgba(128,190,166,0.95)' }]} numberOfLines={1}>
                  Mishary Rashid Alafasy {ayah ? `• Ayah ${ayah}` : ''}
                </Text>
              </View>
              <Pressable
                onPress={() => stop()}
                style={[styles.hBtn, { backgroundColor: 'rgba(255,255,255,0.08)' }]}
                accessibilityLabel="Stop audio"
              >
                <X size={20} color="#fff" strokeWidth={2.4} />
              </Pressable>
            </View>

            <View style={styles.fullBody}>
              <Text style={[styles.arabic, { color: '#fff' }]} numberOfLines={4}>
                {arabic ?? ''}
              </Text>
              {translation ? (
                <Text style={[styles.translation, { color: 'rgba(255,255,255,0.75)' }]} numberOfLines={3}>
                  “{translation}”
                </Text>
              ) : null}
            </View>

            <View style={[styles.fullFooter, { paddingBottom: bottomPad + spacing.lg }]}>
              <View style={[styles.track, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: '#fed65b' }]} />
              </View>
              <View style={styles.timeRow}>
                <Text style={[styles.time, { color: '#fff' }]}>{fmt(progress)}</Text>
                <Text style={[styles.time, { color: 'rgba(255,255,255,0.5)' }]}>{fmt(duration)}</Text>
              </View>

              <View style={styles.ctrlRow}>
                <Pressable
                  onPress={() => void prev()}
                  style={[styles.ctrlBtn, { backgroundColor: 'rgba(255,255,255,0.08)' }]}
                  accessibilityLabel="Previous ayah"
                >
                  <SkipBack size={22} color="#fff" strokeWidth={2.2} />
                </Pressable>
                <Pressable
                  onPress={() => toggle()}
                  disabled={isLoading}
                  style={[
                    styles.playBtn,
                    { backgroundColor: '#fed65b', opacity: isLoading ? 0.6 : 1 },
                  ]}
                  accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause size={32} color="#241a00" strokeWidth={2.2} />
                  ) : (
                    <Play size={32} color="#241a00" strokeWidth={2.2} />
                  )}
                </Pressable>
                <Pressable
                  onPress={() => void next()}
                  style={[styles.ctrlBtn, { backgroundColor: 'rgba(255,255,255,0.08)' }]}
                  accessibilityLabel="Next ayah"
                >
                  <SkipForward size={22} color="#fff" strokeWidth={2.2} />
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
});

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    // Must sit above the tab bar
    zIndex: 120,
    elevation: 120,
  },
  miniWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    paddingTop: 6,
    paddingHorizontal: spacing.md,
    zIndex: 2,
  },
  mini: {
    height: 66,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    overflow: 'hidden',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  miniLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingRight: 172 },
  thumb: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  miniMeta: { flex: 1, minWidth: 0 },
  miniTitle: { fontWeight: '800', fontSize: 13 },
  miniSub: { marginTop: 2, fontWeight: '700', fontSize: 10 },
  miniControls: { position: 'absolute', right: spacing.sm, top: 14, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  iconHit: { padding: spacing.xs },
  miniPlayBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  miniProgressBg: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 3 },
  miniProgressFill: { height: '100%' },

  full: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
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

