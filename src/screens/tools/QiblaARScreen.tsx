import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import Animated, {
  cancelAnimation,
  Easing,
  SensorType,
  useAnimatedSensor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { ArrowLeft, ChevronUp, Info, Landmark, MapPin } from 'lucide-react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';

import { useCompassHeadingWhileFocused } from '../../hooks/useCompassHeadingWhileFocused';
import { usePrayerTimesHome } from '../../hooks/usePrayerTimesHome';
import { useThemePalette } from '../../theme/useThemePalette';
import { fontFamilies } from '../../theme/typography';
import { AppAlert } from '../../components/organisms/AppAlert/AppAlert';
import { hapticSuccess } from '../../utils/appHaptics';
import {
  KAABA_LAT,
  KAABA_LON,
  bearingToIntercardinal,
  bearingToKaaba,
  haversineKm,
} from '../../utils/qiblaBearing';

const RETICLE = 256;
const ORBIT = 312;

export function QiblaARScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const reduceMotion = useReducedMotion();
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', next => setAppState(next));
    return () => sub.remove();
  }, []);

  const { colors: c } = useThemePalette();

  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

  const { coords } = usePrayerTimesHome();
  const { heading, compassError } = useCompassHeadingWhileFocused(Platform.OS === 'android' ? 1.5 : 0.5);

  const gravity = useAnimatedSensor(SensorType.GRAVITY, { interval: 100 });

  const bearing = useMemo(
    () => (coords ? bearingToKaaba(coords.lat, coords.lon) : null),
    [coords],
  );

  const distanceKm = useMemo(
    () =>
      coords ? haversineKm(coords.lat, coords.lon, KAABA_LAT, KAABA_LON) : null,
    [coords],
  );

  const [aligned, setAligned] = useState(false);
  const alignedSv = useSharedValue(0);

  const headingSv = useSharedValue(0);
  const prevHeadingRef = useRef(heading ?? 0);
  const continuousHeadingRef = useRef(heading ?? 0);

  // Directional hint text state
  const [directionHint, setDirectionHint] = useState<string | null>(null);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    if (heading == null) return;

    let diff = heading - prevHeadingRef.current;
    if (diff > 180) diff -= 360;
    else if (diff < -180) diff += 360;

    continuousHeadingRef.current += diff;
    prevHeadingRef.current = heading;

    // Fast, ultra-smooth physics interpolated for AR tracking tracking
    headingSv.value = withSpring(continuousHeadingRef.current, {
      damping: 30,
      stiffness: 400,
      mass: 0.3,
      overshootClamping: false,
    });
  }, [heading, headingSv]);

  const deltaDeg = useMemo(() => {
    if (bearing == null || heading == null) return null;
    const raw = ((bearing - heading + 540) % 360) - 180;
    return raw;
  }, [bearing, heading]);

  useEffect(() => {
    if (deltaDeg == null) return;
    const absDelta = Math.abs(deltaDeg);

    if (!aligned && absDelta <= 4) {
      setAligned(true);
      hapticSuccess();
      setDirectionHint(null);
    } else if (aligned && absDelta > 6) {
      setAligned(false);
    }

    if (!aligned) {
      if (deltaDeg > 6 && deltaDeg < 180) {
        setDirectionHint('Turn right');
      } else if (deltaDeg < -6 && deltaDeg > -180) {
        setDirectionHint('Turn left');
      }
    }
  }, [deltaDeg, aligned]);

  useEffect(() => {
    alignedSv.value = withSpring(aligned ? 1 : 0, { damping: 14, stiffness: 120 });
  }, [aligned, alignedSv]);

  // Idle ambient: slow rotation of the reticle brackets + a calm pulse ring.
  const spin = useSharedValue(0);
  const pulse = useSharedValue(0);
  const ripple = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    spin.value = withRepeat(
      withTiming(1, { duration: 18000, easing: Easing.linear }),
      -1,
    );
    pulse.value = withRepeat(
      withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(spin);
      cancelAnimation(pulse);
    };
  }, [reduceMotion, spin, pulse]);

  useEffect(() => {
    if (reduceMotion || !aligned) return;
    ripple.value = 0;
    ripple.value = withSequence(
      withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: 0 }),
    );
  }, [aligned, reduceMotion, ripple]);

  // Orbiting Qibla pointer — rotates so it points toward the Kaaba bearing.
  const pointerStyle = useAnimatedStyle(() => {
    const rel = (bearing ?? 0) - headingSv.value;
    return {
      transform: [
        { perspective: 1000 },
        { rotateX: '-10deg' },
        { rotateZ: `${rel}deg` },
      ],
      opacity: withTiming(heading !== null ? 1 : 0),
    };
  });

  const reticleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + alignedSv.value * 0.06 }],
  }));

  const cornerSpinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.12 + pulse.value * 0.16 - alignedSv.value * 0.28,
    transform: [{ scale: 0.92 + pulse.value * 0.08 }],
  }));

  const rippleStyle = useAnimatedStyle(() => ({
    opacity: ripple.value * 0.7,
    transform: [{ scale: 0.7 + ripple.value * 0.9 }],
  }));

  const kaabaTargetStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + alignedSv.value * 0.65,
    transform: [{ scale: 0.85 + alignedSv.value * 0.25 }],
  }));

  const goldGlowStyle = useAnimatedStyle(() => ({
    opacity: alignedSv.value,
  }));

  const hintStyle = useAnimatedStyle(() => ({
    opacity: withTiming(alignedSv.value > 0.05 ? 0 : 1, { duration: 250 }),
    transform: [{ translateY: withSpring(alignedSv.value > 0.05 ? 10 : 0) }],
  }));

  const tiltBannerStyle = useAnimatedStyle(() => {
    // Determine if phone is roughly vertical (Y axis gravity > 5 or < -5)
    const isUpright = Math.abs(gravity.sensor.value.y) > 5;
    return {
      transform: [{ translateY: withSpring(isUpright ? 150 : 0) }],
      opacity: withTiming(isUpright ? 0 : 1),
    };
  });

  const intercardinal = bearing != null ? bearingToIntercardinal(bearing) : '—';

  const onInfo = () => {
    AppAlert.show(
      'AR Qibla',
      'Hold your phone upright and slowly turn until the pointer locks at the top. Keep away from metal and magnets for best accuracy.',
      undefined,
      { variant: 'info' },
    );
  };

  if (!hasPermission) {
    return (
      <View style={[styles.center, { backgroundColor: c.surface }]}>
        <Text style={[styles.textCenter, { color: c.onSurface }]}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (device == null) {
    return (
      <View style={[styles.center, { backgroundColor: c.surface }]}>
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={[styles.textCenter, { color: c.onSurface, marginTop: 12 }]}>Initializing AR Camera...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isFocused && appState === 'active'}
        audio={false}
        photo={false}
        video={false}
      />

      {/* Cinematic vignette — darkens top/bottom for legibility, keeps the center clear. */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
        <Defs>
          <LinearGradient id="arVignette" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0" stopColor="#000" stopOpacity={0.6} />
            <Stop offset="0.26" stopColor="#000" stopOpacity={0.12} />
            <Stop offset="0.6" stopColor="#000" stopOpacity={0.14} />
            <Stop offset="1" stopColor="#000" stopOpacity={0.78} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#arVignette)" />
      </Svg>

      {/* Golden wash on alignment */}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.goldGlow, goldGlowStyle]}
        pointerEvents="none"
      />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back">
            <ArrowLeft color="#fff" size={22} />
          </Pressable>
          <View style={styles.makkahBadge}>
            <MapPin color={c.primary} size={13} />
            <Text style={styles.badgeText}>MAKKAH</Text>
          </View>
          <Pressable
            onPress={onInfo}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="AR help">
            <Info color="#fff" size={22} />
          </Pressable>
        </View>

        {/* AR reticle stage */}
        <View
          style={styles.arStage}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={
            aligned
              ? 'You are now facing the Qibla.'
              : deltaDeg != null
                ? `Qibla is ${Math.round(Math.abs(deltaDeg))} degrees to your ${
                    deltaDeg > 0 ? 'right' : 'left'
                  }.`
                : 'Locating Qibla direction.'
          }>
          {compassError ? (
            <View style={styles.errCard}>
              <Text style={styles.errText}>Compass error — calibrate your device with a figure-8 motion.</Text>
            </View>
          ) : (
            <>
              {/* idle pulse */}
              <Animated.View style={[styles.pulseRing, pulseStyle]} pointerEvents="none" />
              {/* success ripple */}
              <Animated.View style={[styles.ripple, rippleStyle]} pointerEvents="none" />

              {/* fixed viewfinder reticle */}
              <Animated.View style={[styles.reticle, reticleStyle]}>
                <Animated.View style={[styles.cornerLayer, cornerSpinStyle]}>
                  <View style={[styles.corner, styles.cTL]} />
                  <View style={[styles.corner, styles.cTR]} />
                  <View style={[styles.corner, styles.cBL]} />
                  <View style={[styles.corner, styles.cBR]} />
                </Animated.View>
                <View style={styles.crossH} />
                <View style={styles.crossV} />
                <Animated.View style={[styles.kaabaTarget, kaabaTargetStyle]}>
                  <Landmark color="#0a1f19" size={26} strokeWidth={2.2} />
                </Animated.View>
              </Animated.View>

              {/* orbiting pointer toward Qibla */}
              <Animated.View style={[styles.pointerOrbit, pointerStyle]} pointerEvents="none">
                <View style={styles.pointer}>
                  <ChevronUp color="#0a1f19" size={26} strokeWidth={3} />
                </View>
              </Animated.View>

              {/* turn hint */}
              <Animated.View style={[styles.hintCard, hintStyle]} pointerEvents="none">
                <Text style={styles.hintText}>{directionHint ?? 'Aligning…'}</Text>
              </Animated.View>
            </>
          )}
        </View>

        {/* Bottom HUD */}
        <View style={styles.bottomSection}>
          <Animated.View style={tiltBannerStyle}>
            <View style={styles.tiltBanner}>
              <Text style={styles.tiltTitle}>HOLD UPRIGHT</Text>
              <Text style={styles.tiltBody}>Stand your phone vertical for AR precision.</Text>
            </View>
          </Animated.View>

          <View style={styles.hudCard}>
            {aligned ? (
              <View style={[styles.hudTopAligned, { backgroundColor: c.secondaryContainer }]}>
                <View style={[styles.alignedDot, { backgroundColor: c.onSecondaryContainer }]} />
                <Text style={[styles.alignedText, { color: c.onSecondaryContainer }]}>YOU ARE FACING QIBLA</Text>
              </View>
            ) : null}

            <View style={styles.hudBody}>
              <View style={styles.hudCol}>
                <Text style={styles.hudLabel}>BEARING</Text>
                <Text style={styles.hudValue}>{bearing != null ? `${Math.round(bearing)}°` : '—'}</Text>
                <Text style={styles.hudSub}>{intercardinal}</Text>
              </View>
              <View style={styles.hudDivider} />
              <View style={styles.hudCol}>
                <Text style={styles.hudLabel}>DISTANCE</Text>
                <Text style={styles.hudValue}>{distanceKm != null ? `${Math.round(distanceKm).toLocaleString()}` : '—'}</Text>
                <Text style={styles.hudSub}>kilometres</Text>
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  safe: { flex: 1, justifyContent: 'space-between' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  textCenter: { fontFamily: fontFamilies.body, fontSize: 16 },
  goldGlow: { backgroundColor: 'rgba(254, 214, 91, 0.16)' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  iconBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  makkahBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  badgeText: {
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 2,
    color: '#003527',
    fontFamily: fontFamilies.body,
  },

  arStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 48,
  },
  errCard: {
    marginHorizontal: 32,
    backgroundColor: 'rgba(147,0,10,0.85)',
    padding: 16,
    borderRadius: 16,
  },
  errText: { color: '#ffdad6', fontWeight: '700', textAlign: 'center', fontFamily: fontFamilies.body },

  pulseRing: {
    position: 'absolute',
    width: ORBIT,
    height: ORBIT,
    borderRadius: ORBIT / 2,
    borderWidth: 2,
    borderColor: 'rgba(254,214,91,0.5)',
  },
  ripple: {
    position: 'absolute',
    width: ORBIT,
    height: ORBIT,
    borderRadius: ORBIT / 2,
    borderWidth: 2,
    borderColor: 'rgba(254,214,91,0.8)',
  },
  reticle: {
    width: RETICLE,
    height: RETICLE,
    borderRadius: RETICLE / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  cornerLayer: { ...StyleSheet.absoluteFillObject },
  corner: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderColor: '#fed65b',
  },
  cTL: { top: 14, left: 14, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
  cTR: { top: 14, right: 14, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
  cBL: { bottom: 14, left: 14, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
  cBR: { bottom: 14, right: 14, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
  crossH: {
    position: 'absolute',
    width: 40,
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  crossV: {
    position: 'absolute',
    width: 1.5,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  kaabaTarget: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#fed65b',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#fed65b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 18,
    elevation: 8,
  },
  pointerOrbit: {
    position: 'absolute',
    width: ORBIT,
    height: ORBIT,
    alignItems: 'center',
  },
  pointer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fed65b',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -4,
    shadowColor: 'rgba(254,214,91,0.7)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 8,
  },
  hintCard: {
    position: 'absolute',
    bottom: -16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  hintText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontFamily: fontFamilies.body,
  },

  bottomSection: { paddingHorizontal: 20, paddingBottom: 20 },
  tiltBanner: {
    backgroundColor: 'rgba(10, 24, 20, 0.88)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(254,214,91,0.25)',
  },
  tiltTitle: { color: '#fed65b', fontWeight: '800', fontSize: 12, letterSpacing: 1.5, fontFamily: fontFamilies.body },
  tiltBody: { color: '#fff', fontSize: 12, marginTop: 3, opacity: 0.9, fontFamily: fontFamilies.body },
  hudCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(10, 24, 20, 0.82)',
  },
  hudTopAligned: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
  },
  alignedDot: { width: 9, height: 9, borderRadius: 5 },
  alignedText: { fontWeight: '900', fontSize: 14, letterSpacing: 1, fontFamily: fontFamilies.body },
  hudBody: { flexDirection: 'row', paddingVertical: 18 },
  hudCol: { flex: 1, alignItems: 'center' },
  hudDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  hudLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: 6,
    fontFamily: fontFamilies.body,
  },
  hudValue: { color: '#fff', fontSize: 30, fontWeight: '800', fontFamily: fontFamilies.body },
  hudSub: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: fontFamilies.body,
  },
});
