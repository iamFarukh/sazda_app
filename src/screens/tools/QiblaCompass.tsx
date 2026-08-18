import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { Landmark } from 'lucide-react-native';
import { SazdaText } from '../../components/atoms/SazdaText/SazdaText';
import type { AppPalette, ResolvedScheme } from '../../theme/useThemePalette';

const STAGE = 320;
const DISC = 264;
const RING_R = 116;
const CIRC = 2 * Math.PI * RING_R;
const CENTER = 132;

const RAYS = require('../../assets/lottie/prayer/rays.json');
const STARS = require('../../assets/lottie/prayer/stars.json');

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  /** Continuous (unbounded) device heading, degrees. Owned by the screen. */
  headingSv: SharedValue<number>;
  /** Qibla bearing, degrees. Owned by the screen. */
  qiblaSv: SharedValue<number>;
  /** 0→1 aligned spring. Owned by the screen. */
  alignedSv: SharedValue<number>;
  bearing: number;
  intercardinal: string;
  aligned: boolean;
  /** Bumped on each new alignment so the success burst replays. */
  alignCount: number;
  reduceMotion: boolean;
  colors: AppPalette;
  scheme: ResolvedScheme;
};

/**
 * The Qibla compass centerpiece. Purely presentational — it reads shared values the screen
 * derives from the (unchanged) heading/bearing math and turns them into a progress-driven
 * experience: a center fill that grows as you approach, a sweeping ring, rising glow, and a
 * success burst at alignment. All decorative motion honors Reduce Motion.
 */
function QiblaCompassBase({
  headingSv,
  qiblaSv,
  alignedSv,
  bearing,
  intercardinal,
  aligned,
  alignCount,
  reduceMotion,
  colors: c,
}: Props) {
  // Proximity 0..1 on the UI thread: 1 = perfectly aligned, 0 = ≥90° off. Smoothstepped.
  const proximity = useDerivedValue(() => {
    'worklet';
    const rel = qiblaSv.value - headingSv.value;
    const d = Math.abs(((rel % 360) + 540) % 360 - 180); // [0,180]
    const lin = Math.max(0, Math.min(1, 1 - d / 90));
    return lin * lin * (3 - 2 * lin);
  }, []);

  // Idle breathing + ambient glow pulse.
  const breath = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) {
      breath.value = 0;
      return;
    }
    breath.value = withRepeat(
      withTiming(1, { duration: 6000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => cancelAnimation(breath);
  }, [reduceMotion, breath]);

  // Success ripple — expands once on each alignment.
  const ripple = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion || !aligned) return;
    ripple.value = 0;
    ripple.value = withSequence(
      withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: 0 }),
    );
  }, [alignCount, aligned, reduceMotion, ripple]);

  const discBreathStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.015 * breath.value }],
  }));

  const needleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${qiblaSv.value - headingSv.value}deg` }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    opacity: 0.25 + 0.75 * proximity.value,
    transform: [{ scale: 0.12 + proximity.value * 1.05 }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: proximity.value * 0.9,
  }));

  const rippleStyle = useAnimatedStyle(() => ({
    opacity: ripple.value * 0.7,
    transform: [{ scale: 0.55 + ripple.value * 0.95 }],
  }));

  const ripple2Style = useAnimatedStyle(() => ({
    opacity: ripple.value * 0.4,
    transform: [{ scale: 0.55 + ripple.value * 1.5 }],
  }));

  const kaabaStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + alignedSv.value * 0.16 }],
  }));

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRC * (1 - proximity.value),
  }));

  return (
    <View style={styles.stage} pointerEvents="none">
      {/* ambient Lottie — rotating energy rays + faint stars */}
      {!reduceMotion ? (
        <>
          <LottieView
            source={RAYS}
            autoPlay
            loop
            speed={0.6}
            style={styles.ambientRays}
          />
          <LottieView
            source={STARS}
            autoPlay
            loop
            speed={0.7}
            style={styles.ambientStars}
          />
        </>
      ) : null}

      {/* breathing disc */}
      <Animated.View style={[styles.disc, discBreathStyle]}>
        {/* center proximity glow */}
        <Animated.View style={[styles.glow, glowStyle]} pointerEvents="none">
          <Svg width={DISC} height={DISC}>
            <Defs>
              <RadialGradient id="qGlow" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor="#ffd86b" stopOpacity={0.55} />
                <Stop offset="0.6" stopColor="#ffd86b" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={DISC / 2} cy={DISC / 2} r={DISC / 2} fill="url(#qGlow)" />
          </Svg>
        </Animated.View>

        {/* center fill — grows from the middle as you approach */}
        <Animated.View style={[styles.fill, fillStyle]} pointerEvents="none">
          <Svg width={200} height={200}>
            <Defs>
              <RadialGradient id="qFill" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor="#ffe08a" stopOpacity={0.95} />
                <Stop offset="0.55" stopColor="#ffcd50" stopOpacity={0.55} />
                <Stop offset="0.78" stopColor="#ffcd50" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={100} cy={100} r={100} fill="url(#qFill)" />
          </Svg>
        </Animated.View>

        {/* success ripple — two concentric expanding rings (no glyph) */}
        <Animated.View style={[styles.ripple, rippleStyle]} pointerEvents="none" />
        <Animated.View style={[styles.ripple, ripple2Style]} pointerEvents="none" />

        {/* progress ring */}
        <Svg width={DISC} height={DISC} style={styles.ringSvg}>
          <Circle
            cx={DISC / 2}
            cy={DISC / 2}
            r={RING_R}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={4}
            fill="none"
          />
          <AnimatedCircle
            cx={DISC / 2}
            cy={DISC / 2}
            r={RING_R}
            stroke={c.secondaryContainer}
            strokeWidth={5}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={CIRC}
            animatedProps={ringProps}
            transform={`rotate(-90 ${DISC / 2} ${DISC / 2})`}
          />
        </Svg>

        {/* cardinal marks */}
        <View style={styles.cardinals}>
          <SazdaText variant="caption" color="#ffffff" style={[styles.cm, styles.cmN]}>N</SazdaText>
          <SazdaText variant="caption" color="#ffffff" style={[styles.cm, styles.cmE]}>E</SazdaText>
          <SazdaText variant="caption" color="#ffffff" style={[styles.cm, styles.cmS]}>S</SazdaText>
          <SazdaText variant="caption" color="#ffffff" style={[styles.cm, styles.cmW]}>W</SazdaText>
        </View>

        {/* needle + Kaaba marker */}
        <Animated.View style={[styles.needle, needleStyle]}>
          <Animated.View style={[styles.kaaba, kaabaStyle]}>
            <Landmark size={22} color={c.primary} strokeWidth={2} />
          </Animated.View>
          <View style={styles.needleLine} />
        </Animated.View>

        {/* center readout */}
        <View style={styles.center}>
          <SazdaText variant="displayLg" color="#ffffff" style={styles.deg}>
            {Math.round(bearing)}°
          </SazdaText>
          <SazdaText variant="caption" color="#ffd86b" style={styles.inter}>
            {aligned ? 'FACING QIBLA' : intercardinal}
          </SazdaText>
        </View>
      </Animated.View>
    </View>
  );
}

export const QiblaCompass = memo(QiblaCompassBase);

const styles = StyleSheet.create({
  stage: {
    width: STAGE,
    height: STAGE,
    // Circular clip: the ambient rays radiate from the centre, so a rounded-square
    // mask sliced them along straight edges. A full-circle mask lets every spoke end
    // on a clean radial boundary. All inner content fits inside the inscribed circle.
    borderRadius: STAGE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ambientRays: {
    position: 'absolute',
    width: STAGE,
    height: STAGE,
    opacity: 0.35,
  },
  ambientStars: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.25,
  },
  disc: {
    width: DISC,
    height: DISC,
    borderRadius: DISC / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: { position: 'absolute', width: DISC, height: DISC },
  fill: {
    position: 'absolute',
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ripple: {
    position: 'absolute',
    width: DISC,
    height: DISC,
    borderRadius: DISC / 2,
    borderWidth: 2,
    borderColor: 'rgba(255,216,107,0.7)',
  },
  ringSvg: { position: 'absolute', width: DISC, height: DISC },
  cardinals: {
    position: 'absolute',
    width: DISC - 24,
    height: DISC - 24,
    opacity: 0.5,
  },
  cm: { position: 'absolute', fontSize: 11, fontWeight: '800' },
  cmN: { top: 0, left: '50%', marginLeft: -5 },
  cmE: { right: 0, top: '50%', marginTop: -8 },
  cmS: { bottom: 0, left: '50%', marginLeft: -5 },
  cmW: { left: 0, top: '50%', marginTop: -8 },
  needle: {
    position: 'absolute',
    width: DISC,
    height: DISC,
    alignItems: 'center',
    paddingTop: 16,
    zIndex: 6,
  },
  kaaba: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#fed65b',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0,0,0,0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
  },
  needleLine: {
    marginTop: 6,
    width: 6,
    height: 60,
    borderRadius: 3,
    backgroundColor: 'rgba(255,216,107,0.55)',
  },
  center: {
    position: 'absolute',
    width: CENTER,
    height: CENTER,
    borderRadius: CENTER / 2,
    backgroundColor: 'rgba(6,40,31,0.66)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 8,
  },
  deg: {
    fontSize: 38,
    lineHeight: 42,
    fontWeight: '900',
    letterSpacing: -1,
  },
  inter: {
    marginTop: 4,
    fontWeight: '800',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    fontSize: 11,
  },
});
