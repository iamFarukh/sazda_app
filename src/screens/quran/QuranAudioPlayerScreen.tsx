import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, Pause, Play, Repeat, SkipBack, SkipForward } from 'lucide-react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { QuranStackParamList } from '../../navigation/types';
import { SazdaText } from '../../components/atoms/SazdaText/SazdaText';
import { PressableScale } from '../../components/atoms/PressableScale/PressableScale';
import { Skeleton } from '../../components/atoms/Skeleton/Skeleton';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import type { AppPalette, ResolvedScheme } from '../../theme/useThemePalette';
import { useThemePalette } from '../../theme/useThemePalette';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { elevation } from '../../theme/elevation';
import { motionDurations, motionEasing } from '../../theme/motion';
import { hapticLight, hapticMedium, hapticSelection } from '../../utils/appHaptics';
import { useQuranAudioStore } from '../../store/quranAudioStore';

type Nav = NativeStackNavigationProp<QuranStackParamList, 'QuranAudioPlayer'>;

const RECITER = 'Mishary Rashid Alafasy';

function fmt(sec: number) {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export function QuranAudioPlayerScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { colors: c, scheme } = useThemePalette();
  const reduceMotion = useReduceMotion();
  const styles = useMemo(() => createPlayerStyles(c, scheme), [c, scheme]);
  const playFg = scheme === 'dark' ? c.onPrimaryContainer : c.onPrimary;

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

  // Smoothly ease the progress fill toward each engine tick instead of jumping.
  const [trackWidth, setTrackWidth] = useState(0);
  const fillWidth = useSharedValue(0);
  useEffect(() => {
    const target = trackWidth * pct;
    fillWidth.value = reduceMotion
      ? target
      : withTiming(target, {
          duration: motionDurations.base,
          easing: motionEasing.standardOut,
        });
  }, [trackWidth, pct, reduceMotion, fillWidth]);
  const fillStyle = useAnimatedStyle(() => ({ width: fillWidth.value }));

  const enter = (delayMs: number) =>
    reduceMotion
      ? undefined
      : FadeInDown.duration(motionDurations.slow).delay(delayMs).easing(motionEasing.standardOut);

  return (
    <View style={styles.root}>
      {/* Grabber — signals this screen dismisses with a downward swipe. */}
      <View style={[styles.grabberWrap, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.grabber} />
      </View>

      <View style={styles.header}>
        <PressableScale
          onPress={() => {
            hapticLight();
            navigation.goBack();
          }}
          to={0.92}
          style={styles.closeBtn}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Close player">
          <ChevronDown size={26} color={c.onSurface} strokeWidth={2.4} />
        </PressableScale>
        <View style={styles.headerCenter}>
          <SazdaText variant="label" color="onSurfaceVariant" style={styles.kicker} numberOfLines={1}>
            Now Playing
          </SazdaText>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.body}>
        {/* Surah identity */}
        <Animated.View entering={enter(0)} style={styles.identity}>
          <SazdaText variant="headlineLarge" color="primary" align="center" numberOfLines={1}>
            {surah ? `Surah ${surah}` : 'Quran Audio'}
          </SazdaText>
          <SazdaText variant="caption" color="onSurfaceVariant" style={styles.reciter} numberOfLines={1}>
            {RECITER.toUpperCase()}
            {ayah ? `  •  AYAH ${ayah}` : ''}
          </SazdaText>
        </Animated.View>

        {/* Verse card — the "artwork" of this player. */}
        <Animated.View entering={enter(70)} style={styles.verseCard}>
          <ScrollView
            style={styles.verseScroll}
            contentContainerStyle={styles.verseScrollContent}
            showsVerticalScrollIndicator={false}>
            {arabic ? (
              <Animated.View
                key={`${surah ?? ''}-${ayah ?? 0}`}
                entering={reduceMotion ? undefined : FadeIn.duration(motionDurations.base)}
                style={styles.verseInner}>
                <SazdaText variant="headlineLarge" color="primary" align="center" rtl style={styles.arabic}>
                  {arabic}
                </SazdaText>
                {translation ? (
                  <SazdaText
                    variant="body"
                    color="onSurfaceVariant"
                    align="center"
                    style={styles.translation}>
                    “{translation}”
                  </SazdaText>
                ) : null}
              </Animated.View>
            ) : isLoading ? (
              <View style={styles.skeletonBlock}>
                <Skeleton width="82%" height={22} radius={radius.sm} />
                <Skeleton width="64%" height={22} radius={radius.sm} />
                <Skeleton width="88%" height={12} radius={radius.sm} />
              </View>
            ) : null}
          </ScrollView>
        </Animated.View>

        {error ? (
          <SazdaText variant="bodySmall" color="error" align="center" style={styles.err}>
            {error}
          </SazdaText>
        ) : null}
      </View>

      <Animated.View
        entering={enter(140)}
        style={[styles.footer, { paddingBottom: insets.bottom + spacing.xl }]}>
        <View
          style={styles.progressTrack}
          onLayout={e => setTrackWidth(e.nativeEvent.layout.width)}
          accessibilityRole="progressbar"
          accessibilityLabel="Playback progress"
          accessibilityValue={{
            min: 0,
            max: Math.max(1, Math.round(duration)),
            now: Math.round(progress),
          }}>
          <Animated.View style={[styles.progressFill, fillStyle]} />
        </View>
        <View style={styles.timeRow}>
          <SazdaText variant="caption" color="onSurface" style={styles.time}>
            {fmt(progress)}
          </SazdaText>
          <SazdaText variant="caption" color="onSurfaceVariant" style={styles.time}>
            {fmt(duration)}
          </SazdaText>
        </View>

        <View style={styles.controls}>
          <PressableScale
            onPress={() => {
              hapticSelection();
              setAuto(!auto);
            }}
            to={0.9}
            style={[styles.smallBtn, auto && styles.smallBtnActive]}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={auto ? 'Disable autoplay' : 'Enable autoplay'}
            accessibilityState={{ selected: auto }}>
            <Repeat
              size={20}
              color={auto ? c.onSecondaryContainer : c.outline}
              strokeWidth={2.2}
            />
          </PressableScale>
          <PressableScale
            onPress={() => {
              hapticLight();
              prev().catch(() => {
                /* store exposes playback errors via `error` */
              });
            }}
            to={0.9}
            style={styles.transportBtn}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Previous ayah">
            <SkipBack size={24} color={c.primary} strokeWidth={2.2} />
          </PressableScale>
          <PressableScale
            onPress={() => {
              hapticMedium();
              toggle();
            }}
            disabled={isLoading}
            to={0.94}
            style={[styles.playBtn, isLoading && styles.playBtnLoading]}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
            accessibilityState={{ disabled: isLoading, busy: isLoading }}>
            {isPlaying ? (
              <Pause size={34} color={playFg} strokeWidth={2.2} />
            ) : (
              <Play size={34} color={playFg} strokeWidth={2.2} style={styles.playIcon} />
            )}
          </PressableScale>
          <PressableScale
            onPress={() => {
              hapticLight();
              next().catch(() => {
                /* store exposes playback errors via `error` */
              });
            }}
            to={0.9}
            style={styles.transportBtn}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Next ayah">
            <SkipForward size={24} color={c.primary} strokeWidth={2.2} />
          </PressableScale>
          <View style={styles.smallBtn} />
        </View>
      </Animated.View>
    </View>
  );
}

function createPlayerStyles(c: AppPalette, scheme: ResolvedScheme) {
  const playFill = scheme === 'dark' ? c.primaryContainer : c.primary;
  const hairline = scheme === 'dark' ? 'rgba(142,207,178,0.16)' : 'rgba(0,53,39,0.1)';

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.surface },
    grabberWrap: { alignItems: 'center', paddingBottom: spacing.xs },
    grabber: {
      width: 44,
      height: 5,
      borderRadius: radius.full,
      backgroundColor: c.outlineVariant,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.xs,
      gap: spacing.md,
    },
    closeBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.full,
      backgroundColor: c.surfaceContainerLow,
      alignItems: 'center',
      justifyContent: 'center',
      ...elevation('sm', scheme),
    },
    headerCenter: { flex: 1, minWidth: 0, alignItems: 'center' },
    kicker: { letterSpacing: 2, textTransform: 'uppercase', fontWeight: '700' },
    headerSpacer: { width: 44, height: 44 },
    body: {
      flex: 1,
      paddingHorizontal: spacing.lg,
      justifyContent: 'center',
    },
    identity: { alignItems: 'center', gap: spacing.xs },
    reciter: { letterSpacing: 1.2, fontWeight: '600' },
    verseCard: {
      marginTop: spacing.lg,
      alignSelf: 'stretch',
      flexShrink: 1,
      backgroundColor: c.surfaceContainerLowest,
      borderRadius: radius.md + 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hairline,
      ...elevation('md', scheme),
    },
    verseScroll: { flexGrow: 0 },
    verseScrollContent: {
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.xl,
    },
    verseInner: { gap: spacing.lg },
    arabic: { fontSize: 34, lineHeight: 34 * 1.7 },
    translation: { fontStyle: 'italic', lineHeight: 26 },
    skeletonBlock: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
    err: { marginTop: spacing.md, fontWeight: '600' },
    footer: { paddingHorizontal: spacing.xl },
    progressTrack: {
      height: 6,
      borderRadius: radius.full,
      backgroundColor: c.surfaceContainerHighest,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: radius.full,
      backgroundColor: c.primary,
    },
    timeRow: {
      marginTop: spacing.sm,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    time: { fontWeight: '700', fontVariant: ['tabular-nums'] },
    controls: {
      marginTop: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    smallBtn: {
      width: 48,
      height: 48,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    smallBtnActive: {
      backgroundColor: c.secondaryContainer,
      ...elevation('sm', scheme),
    },
    transportBtn: {
      width: 56,
      height: 56,
      borderRadius: radius.full,
      backgroundColor: c.surfaceContainerLow,
      alignItems: 'center',
      justifyContent: 'center',
      ...elevation('sm', scheme),
    },
    playBtn: {
      width: 88,
      height: 88,
      borderRadius: radius.full,
      backgroundColor: playFill,
      alignItems: 'center',
      justifyContent: 'center',
      ...elevation('lg', scheme),
    },
    playBtnLoading: { opacity: 0.55 },
    playIcon: { marginLeft: 3 },
  });
}
