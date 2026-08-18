import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import LottieView from 'lottie-react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { HandCoins, Hash, ListChecks, MoonStar, ScrollText } from 'lucide-react-native';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { motionEasing } from '../../../theme/motion';
import type { AppPalette, ResolvedScheme } from '../../../theme/useThemePalette';

const RAYS = require('../../../assets/lottie/prayer/rays.json');

type MotifProps = {
  c: AppPalette;
  scheme: ResolvedScheme;
  /** True when this card's screen is focused and Reduce Motion is off. */
  active: boolean;
};

/* ------------------------------------------------------------------ *
 * Shared building blocks — every card is a gradient wash + a large   *
 * faint watermark glyph + one signature animated accent. This is the *
 * pattern that makes the Qibla hero read as "designed", applied to   *
 * every tool for a cohesive, premium system.                         *
 * ------------------------------------------------------------------ */

/** Soft directional colour wash that gives each card its own tonal identity. */
function CardWash({ id, color, scheme }: { id: string; color: string; scheme: ResolvedScheme }) {
  const top = scheme === 'dark' ? 0.16 : 0.08;
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
      <Defs>
        <LinearGradient id={id} x1="100%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={color} stopOpacity={top} />
          <Stop offset="65%" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

/** Large, very faint tool glyph anchored to the card's free corner for depth + identity. */
function GlyphWatermark({ children, scheme }: { children: ReactNode; scheme: ResolvedScheme }) {
  return (
    <View
      style={[styles.watermark, scheme === 'dark' ? styles.watermarkDark : styles.watermarkLight]}
      pointerEvents="none">
      {children}
    </View>
  );
}

/** Slow, continuous rotation — used for the Qibla compass needle. */
export function useSlowSpin(active: boolean, durationMs = 14000) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (!active) return;
    t.value = withRepeat(withTiming(1, { duration: durationMs, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(t);
  }, [active, durationMs, t]);
  return useAnimatedStyle(() => ({ transform: [{ rotate: `${t.value * 360}deg` }] }));
}

/** Faint rotating energy rays in the corner of the Qibla hero card. */
export function QiblaRaysDeco({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <View style={styles.qiblaRays} pointerEvents="none">
      <LottieView source={RAYS} autoPlay loop speed={0.4} style={styles.fillAbs} />
    </View>
  );
}

/* ------------------------------- Tasbeeh ------------------------------- *
 * Meditative dhikr waves — concentric rings breathe outward from behind   *
 * the icon, the visual echo of a repeated remembrance.                    */
export function TasbeehMotif({ c, scheme, active }: MotifProps) {
  return (
    <View style={styles.fill} pointerEvents="none">
      <CardWash id="washTasbeeh" color={c.primary} scheme={scheme} />
      <View style={styles.iconAnchor}>
        <Ripple index={0} color={c.primary} active={active} />
        <Ripple index={1} color={c.primary} active={active} />
        <Ripple index={2} color={c.secondary} active={active} />
      </View>
      <GlyphWatermark scheme={scheme}>
        <Hash size={128} color={c.primary} strokeWidth={1.1} />
      </GlyphWatermark>
    </View>
  );
}

function Ripple({ index, color, active }: { index: number; color: string; active: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (!active) return;
    t.value = withDelay(
      index * 780,
      withRepeat(withTiming(1, { duration: 2340, easing: motionEasing.standardOut }), -1, false),
    );
    return () => cancelAnimation(t);
  }, [active, index, t]);
  const style = useAnimatedStyle(() => ({
    opacity: (1 - t.value) * 0.45,
    transform: [{ scale: 0.55 + t.value * 1.7 }],
  }));
  return <Animated.View style={[styles.ripple, { borderColor: color }, style]} />;
}

/* -------------------------------- Zakat -------------------------------- *
 * A slow band of golden light sweeps across the card — wealth purified    *
 * and given, catching the light as it moves.                              */
export function ZakatMotif({ c, scheme, active }: MotifProps) {
  const x = useSharedValue(-90);
  useEffect(() => {
    if (!active) return;
    x.value = withRepeat(
      withSequence(
        withTiming(240, { duration: 2200, easing: motionEasing.standardInOut }),
        withTiming(-90, { duration: 0 }),
        withTiming(-90, { duration: 1900 }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(x);
  }, [active, x]);
  const sweep = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { rotate: '18deg' }] }));

  return (
    <View style={styles.fill} pointerEvents="none">
      <CardWash id="washZakat" color={c.secondary} scheme={scheme} />
      <Animated.View style={[styles.zakatSweep, sweep]}>
        <Svg width={64} height={280}>
          <Defs>
            <LinearGradient id="zakatShimmer" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor={c.secondaryContainer} stopOpacity={0} />
              <Stop offset="50%" stopColor={c.secondaryContainer} stopOpacity={scheme === 'dark' ? 0.45 : 0.6} />
              <Stop offset="100%" stopColor={c.secondaryContainer} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={64} height={280} fill="url(#zakatShimmer)" />
        </Svg>
      </Animated.View>
      <GlyphWatermark scheme={scheme}>
        <HandCoins size={124} color={c.secondary} strokeWidth={1.1} />
      </GlyphWatermark>
    </View>
  );
}

/* -------------------------------- Duas --------------------------------- *
 * A warm glow breathes behind the icon — the quiet light of supplication. */
export function DuasMotif({ c, scheme, active }: MotifProps) {
  const g = useSharedValue(0);
  useEffect(() => {
    if (!active) return;
    g.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2100, easing: motionEasing.inOutSine }),
        withTiming(0, { duration: 2100, easing: motionEasing.inOutSine }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(g);
  }, [active, g]);
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.22 + g.value * 0.3,
    transform: [{ scale: 0.85 + g.value * 0.35 }],
  }));

  return (
    <View style={styles.fill} pointerEvents="none">
      <CardWash id="washDuas" color={c.secondary} scheme={scheme} />
      <View style={styles.iconAnchor}>
        <Animated.View style={[styles.duasGlow, { backgroundColor: c.secondaryContainer }, glowStyle]} />
      </View>
      <GlyphWatermark scheme={scheme}>
        <ScrollText size={122} color={c.primary} strokeWidth={1.1} />
      </GlyphWatermark>
    </View>
  );
}

/* ------------------------------- Tracker ------------------------------- *
 * Five pills fill through the day and reset — the rhythm of the five daily *
 * prayers, kept as a quiet progress column.                               */
export function TrackerMotif({ c, scheme, active }: MotifProps) {
  const p = useSharedValue(0);
  useEffect(() => {
    if (!active) return;
    p.value = withRepeat(
      withSequence(
        withTiming(5, { duration: 3600, easing: motionEasing.standardInOut }),
        withTiming(5, { duration: 900 }),
        withTiming(0, { duration: 0 }),
        withTiming(0, { duration: 600 }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(p);
  }, [active, p]);

  return (
    <View style={styles.fill} pointerEvents="none">
      <CardWash id="washTracker" color={c.primary} scheme={scheme} />
      <View style={styles.trackerColumn}>
        {[0, 1, 2, 3, 4].map(i => (
          <TrackerPill key={i} index={i} progress={p} color={c.secondary} idle={c.outlineVariant} />
        ))}
      </View>
      <GlyphWatermark scheme={scheme}>
        <ListChecks size={122} color={c.primary} strokeWidth={1.1} />
      </GlyphWatermark>
    </View>
  );
}

function TrackerPill({
  index,
  progress,
  color,
  idle,
}: {
  index: number;
  progress: SharedValue<number>;
  color: string;
  idle: string;
}) {
  const style = useAnimatedStyle(() => {
    const on = interpolate(progress.value, [index, index + 1], [0, 1], Extrapolation.CLAMP);
    return {
      opacity: 0.3 + on * 0.7,
      width: 12 + on * 8,
      backgroundColor: on > 0.5 ? color : idle,
    };
  });
  return <Animated.View style={[styles.trackerPill, style]} />;
}

/* -------------------------------- Hijri -------------------------------- *
 * A softly glowing crescent with a scatter of slow-twinkling stars.       */
export function HijriMotif({ c, scheme, active }: MotifProps) {
  const g = useSharedValue(0);
  useEffect(() => {
    if (!active) return;
    g.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2400, easing: motionEasing.inOutSine }),
        withTiming(0, { duration: 2400, easing: motionEasing.inOutSine }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(g);
  }, [active, g]);
  const crescentGlow = useAnimatedStyle(() => ({ opacity: 0.6 + g.value * 0.4 }));

  return (
    <View style={styles.fill} pointerEvents="none">
      <CardWash id="washHijri" color={c.secondary} scheme={scheme} />
      <View style={styles.hijriStars}>
        <Twinkle index={0} color={c.secondary} active={active} top={6} left={2} size={4} />
        <Twinkle index={1} color={c.primary} active={active} top={30} left={30} size={3} />
        <Twinkle index={2} color={c.secondary} active={active} top={44} left={12} size={3} />
      </View>
      <Animated.View style={[styles.hijriCrescent, crescentGlow]}>
        <MoonStar size={20} color={c.secondary} strokeWidth={1.9} />
      </Animated.View>
    </View>
  );
}

function Twinkle({
  index,
  color,
  active,
  top,
  left,
  size,
}: {
  index: number;
  color: string;
  active: boolean;
  top: number;
  left: number;
  size: number;
}) {
  const t = useSharedValue(0.3);
  useEffect(() => {
    if (!active) return;
    t.value = withDelay(
      index * 620,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 900, easing: motionEasing.inOutSine }),
          withTiming(0.2, { duration: 900, easing: motionEasing.inOutSine }),
        ),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(t);
  }, [active, index, t]);
  const style = useAnimatedStyle(() => ({ opacity: t.value }));
  return (
    <Animated.View
      style={[
        styles.star,
        { top, left, width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  fillAbs: { ...StyleSheet.absoluteFillObject },
  watermark: {
    position: 'absolute',
    right: -22,
    bottom: -24,
  },
  watermarkLight: { opacity: 0.06 },
  watermarkDark: { opacity: 0.1 },
  star: { position: 'absolute' },
  // Anchored over the top-left icon badge (card padding 24 + ~half of a 44 badge).
  iconAnchor: {
    position: 'absolute',
    top: 24 + 22,
    left: 24 + 22,
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ripple: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    marginLeft: -22,
    marginTop: -22,
  },
  duasGlow: {
    position: 'absolute',
    width: 62,
    height: 62,
    borderRadius: 31,
    marginLeft: -31,
    marginTop: -31,
  },
  qiblaRays: {
    position: 'absolute',
    right: -40,
    bottom: -40,
    width: 170,
    height: 170,
    opacity: 0.18,
  },
  zakatSweep: {
    position: 'absolute',
    top: -60,
    left: 0,
    width: 64,
    height: 280,
  },
  trackerColumn: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 6,
  },
  trackerPill: {
    height: 5,
    borderRadius: 3,
  },
  hijriStars: {
    position: 'absolute',
    top: 12,
    right: 16,
    width: 40,
    height: 52,
  },
  hijriCrescent: {
    position: 'absolute',
    top: 12,
    right: 14,
  },
});
