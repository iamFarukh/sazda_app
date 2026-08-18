import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { LayoutChangeEvent, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import type { AnimationObject } from 'lottie-react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import type {
  AtmosphereAccent,
  PrayerAtmosphere as Atmosphere,
} from '../../../theme/prayerAtmosphere';
import { resolvePrayerAtmosphere } from '../../../theme/prayerAtmosphere';
import type { PrayerHeroPeriod } from '../../../utils/prayerSchedule';
import { PrayerSky } from './PrayerSky';

const ACCENT_SOURCES: Record<
  Exclude<AtmosphereAccent, null>,
  AnimationObject
> = {
  stars: require('../../../assets/lottie/prayer/stars.json'),
  particles: require('../../../assets/lottie/prayer/particles.json'),
  embers: require('../../../assets/lottie/prayer/embers.json'),
  rays: require('../../../assets/lottie/prayer/rays.json'),
};

/** Crossfade duration for the whole atmosphere when the prayer period changes. */
const SKY_FADE_MS = 1100;
const BREATH_MS = 7000;
const DRIFT_MS = 13000;

type Props = {
  period: PrayerHeroPeriod;
  borderRadius: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Living, period-aware background for the prayer card.
 *
 * Layers (back → front):
 *   1. Procedural SVG sky + sun/moon orb, gently "breathing" (scale).
 *   2. Original Lottie accent (stars / particles / rays / embers) with slow parallax.
 *   3. Readability scrim (top + bottom) so card text always passes contrast.
 *
 * When the period's mood changes, the entire stack crossfades via Reanimated layout
 * animations — never an abrupt cut. Honors Reduce Motion (static sky + paused accent).
 */
export function PrayerAtmosphere({ period, borderRadius, style }: Props) {
  const reduced = useReducedMotion();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const atmosphere = useMemo<Atmosphere>(
    () => resolvePrayerAtmosphere(period),
    [period],
  );

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize(prev =>
      prev.w === width && prev.h === height ? prev : { w: width, h: height },
    );
  };

  // --- Ambient motion (UI thread) ---
  const breath = useSharedValue(0);
  const drift = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    breath.value = withRepeat(
      withTiming(1, { duration: BREATH_MS, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    drift.value = withRepeat(
      withTiming(1, { duration: DRIFT_MS, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(breath);
      cancelAnimation(drift);
    };
  }, [reduced, breath, drift]);

  const skyBreathStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.03 * breath.value }],
  }));
  const accentDriftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -5 + 10 * drift.value }],
    opacity: 0.92 + 0.08 * breath.value,
  }));

  const ready = size.w > 0 && size.h > 0;
  const fadeIn = reduced ? undefined : FadeIn.duration(SKY_FADE_MS);
  const fadeOut = reduced ? undefined : FadeOut.duration(SKY_FADE_MS);

  return (
    <View
      onLayout={onLayout}
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.clip, { borderRadius }, style]}>
      {/* 1. Sky (breathing). Keyed by mood → crossfades on change. */}
      <Animated.View style={[StyleSheet.absoluteFill, skyBreathStyle]}>
        {ready ? (
          <Animated.View
            key={`sky-${atmosphere.mood}`}
            entering={fadeIn}
            exiting={fadeOut}
            style={StyleSheet.absoluteFill}>
            <PrayerSky
              atmosphere={atmosphere}
              width={size.w}
              height={size.h}
              uid={atmosphere.mood}
            />
          </Animated.View>
        ) : null}
      </Animated.View>

      {/* 2. Lottie accent (drifting). */}
      {atmosphere.accent && ready ? (
        <Animated.View
          key={`accent-${atmosphere.mood}`}
          entering={fadeIn}
          exiting={fadeOut}
          style={[StyleSheet.absoluteFill, accentDriftStyle]}>
          <LottieView
            source={ACCENT_SOURCES[atmosphere.accent]}
            autoPlay={!reduced}
            loop
            speed={0.85}
            resizeMode="cover"
            style={[StyleSheet.absoluteFill, { opacity: atmosphere.accentOpacity }]}
          />
        </Animated.View>
      ) : null}

      {/* 3. Readability scrim — top + bottom darkening. */}
      {ready ? (
        <Svg
          width={size.w}
          height={size.h}
          style={StyleSheet.absoluteFill}
          pointerEvents="none">
          <Defs>
            <LinearGradient id="scrim" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset={0} stopColor="#000" stopOpacity={atmosphere.scrimTop} />
              <Stop offset={0.28} stopColor="#000" stopOpacity={0} />
              {/* Ramp darkening across the lower half so the prayer text always reads over a
                  bright sun/glow, regardless of period. Strong floor for bright-day moods. */}
              <Stop offset={0.5} stopColor="#000" stopOpacity={0.12} />
              <Stop offset={0.72} stopColor="#000" stopOpacity={0.34} />
              <Stop offset={1} stopColor="#000" stopOpacity={Math.max(atmosphere.scrimBottom, 0.62)} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={size.w} height={size.h} fill="url(#scrim)" />
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
});
