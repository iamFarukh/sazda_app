import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import {
  Box,
  Expand,
  Info,
  Landmark,
  MapPin,
  RefreshCw,
} from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { CompassGridBackground } from '../../components/atoms/CompassGridBackground/CompassGridBackground';
import { SazdaText } from '../../components/atoms/SazdaText/SazdaText';
import { TabLandingHeader } from '../../components/organisms/TabLandingHeader';
import { useCompassHeadingWhileFocused } from '../../hooks/useCompassHeadingWhileFocused';
import { usePrayerTimesHome } from '../../hooks/usePrayerTimesHome';
import type { PrayerTimingsDay } from '../../services/prayerTimesApi';
import { radius } from '../../theme/radius';
import { AppAlert } from '../../components/organisms/AppAlert/AppAlert';
import type { AppPalette } from '../../theme/useThemePalette';
import type { ResolvedScheme } from '../../theme/useThemePalette';
import { useThemePalette } from '../../theme/useThemePalette';
import { spacing } from '../../theme/spacing';
import { fontFamilies } from '../../theme/typography';
import { formatHhmmTo12h } from '../../utils/prayerTimesDisplay';
import { hapticSuccess } from '../../utils/appHaptics';
import {
  KAABA_LAT,
  KAABA_LON,
  bearingToIntercardinal,
  bearingToKaaba,
  formatDistanceKm,
  haversineKm,
} from '../../utils/qiblaBearing';

const OUTER = 300;
const INNER = 248;
const CENTER_READOUT = 120;
const RING_R = (INNER / 2) * 0.48;
const CIRC = 2 * Math.PI * RING_R;

const PRAYER_ROWS: { key: keyof PrayerTimingsDay; label: string }[] = [
  { key: 'Fajr', label: 'Fajr' },
  { key: 'Sunrise', label: 'Sunrise' },
  { key: 'Dhuhr', label: 'Dhuhr' },
  { key: 'Asr', label: 'Asr' },
  { key: 'Sunset', label: 'Sunset' },
  { key: 'Maghrib', label: 'Maghrib' },
  { key: 'Isha', label: 'Isha' },
];

type QiblaStyles = ReturnType<typeof createQiblaStyles>;

function PulseDot({ s }: { s: QiblaStyles }) {
  const ring = useSharedValue(1);
  const ringOp = useSharedValue(0.45);

  useEffect(() => {
    ring.value = withRepeat(
      withSequence(
        withTiming(1.55, { duration: 1100, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 0 }),
      ),
      -1,
    );
    ringOp.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 1100, easing: Easing.out(Easing.cubic) }),
        withTiming(0.45, { duration: 0 }),
      ),
      -1,
    );
  }, [ring, ringOp]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ring.value }],
    opacity: ringOp.value,
  }));

  return (
    <View style={s.pulseWrap}>
      <Animated.View
        style={[
          s.pulseRing,
          ringStyle,
        ]}
      />
      <View style={s.pulseCore} />
    </View>
  );
}

export function QiblaScreen() {
  const { colors: c, scheme } = useThemePalette();
  const styles = useMemo(() => createQiblaStyles(c, scheme), [c, scheme]);

  const gradientId = `qiblaNeedle-${useId().replace(/:/g, '')}`;

  const {
    coords,
    permissionDenied,
    locationError,
    requestLocation,
    prayerLoading,
    prayerError,
    refetchPrayers,
    hero,
    todayTimings,
  } = usePrayerTimesHome();

  // 0.5 Update rate balances ultra-smooth UI tracking. Android is aggressively throttled to 2.0 to prevent event bridge glutter.
  const { heading, compassError } = useCompassHeadingWhileFocused(Platform.OS === 'android' ? 2.0 : 0.5);

  const bearing = useMemo(
    () => (coords ? bearingToKaaba(coords.lat, coords.lon) : null),
    [coords],
  );

  const distanceKm = useMemo(
    () =>
      coords ? haversineKm(coords.lat, coords.lon, KAABA_LAT, KAABA_LON) : null,
    [coords],
  );

  const intercardinal = bearing != null ? bearingToIntercardinal(bearing) : '—';

  const headingSv = useSharedValue(0);
  const qiblaSv = useSharedValue(0);

  const prevHeadingRef = useRef(heading ?? 0);
  const continuousHeadingRef = useRef(heading ?? 0);

  useEffect(() => {
    if (heading == null) return;
    
    // Shortest path algorithm for wrap-around (e.g. 359 -> 1)
    let diff = heading - prevHeadingRef.current;
    if (diff > 180) diff -= 360;
    else if (diff < -180) diff += 360;

    continuousHeadingRef.current += diff;
    prevHeadingRef.current = heading;

    // Apply a tighter, more responsive native spring curve for instant, smooth orientation tracking
    headingSv.value = withSpring(continuousHeadingRef.current, {
      damping: 35,
      stiffness: 450,
      mass: 0.4,
      overshootClamping: false, // allow minimal natural swing for realism
    });
  }, [heading, headingSv]);

  useEffect(() => {
    qiblaSv.value = bearing ?? 0;
  }, [bearing, qiblaSv]);

  const needleStyle = useAnimatedStyle(() => {
    // Rel calculate unbounded absolute rotation so that going from 0 -> 360 doesn't rewind
    const rel = qiblaSv.value - headingSv.value;
    return {
      transform: [{ rotate: `${rel}deg` }],
    };
  });

  const ringProgress = bearing != null ? (bearing / 360) * CIRC : 0;

  const locationOk = !!coords && !permissionDenied && !locationError;

  // --- Alignment / “satisfied” feedback ---
  const deltaDeg = useMemo(() => {
    if (bearing == null || heading == null) return null;
    const raw = ((bearing - heading + 540) % 360) - 180; // [-180, 180]
    return Math.abs(raw);
  }, [bearing, heading]);

  const [aligned, setAligned] = useState(false);
  const alignedSv = useSharedValue(0);

  useEffect(() => {
    const ok = deltaDeg != null && locationOk && !compassError;
    if (!ok) {
      setAligned(false);
      return;
    }

    // Instant hysteresis: Trigger immediately without sluggish timeout
    // Lock in at <= 2.5 degrees, release at > 4.5 degrees
    if (!aligned && deltaDeg <= 2.5) {
      setAligned(true);
      hapticSuccess();
    } else if (aligned && deltaDeg > 4.5) {
      setAligned(false);
    }
  }, [compassError, deltaDeg, locationOk, aligned]);

  useEffect(() => {
    // Drop animation using spring for satisfying bounce when matching Qibla
    alignedSv.value = withSpring(aligned ? 1 : 0, {
      damping: 14,
      stiffness: 150,
      mass: 0.6,
    });
    if (aligned) {
      hapticSuccess();
    }
  }, [aligned, alignedSv]);

  const alignedBadgeStyle = useAnimatedStyle(() => {
    // Quick fade on opacity to avoid weird spring opacities, use spring value for beautiful 'drop' scale/translate
    const opacity = withTiming(alignedSv.value > 0.05 ? 1 : 0, { duration: 150 });
    return {
      opacity,
      transform: [
        { translateY: (1 - alignedSv.value) * -16 }, // Drop down from top
        { scale: 0.85 + alignedSv.value * 0.15 },
      ],
    };
  });

  const alignedFillStyle = useAnimatedStyle(() => {
    const opacity = withTiming(alignedSv.value > 0.05 ? 0.12 : 0, { duration: 150 });
    return {
      opacity,
      transform: [{ scale: 0.6 + alignedSv.value * 0.4 }], // Pop / scale in effect
    };
  });

  const fullScreenGlowStyle = useAnimatedStyle(() => {
    // A calm, smooth fade-in that washes the entire screen indicating alignment success
    const opacity = withTiming(alignedSv.value > 0.05 ? 1 : 0, {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    });
    return {
      opacity,
      backgroundColor: scheme === 'dark' ? 'rgba(254, 214, 91, 0.05)' : 'rgba(254, 214, 91, 0.18)',
    };
  });

  const onCalibrate = () => {
    requestLocation().catch(() => {
      /* permission / GPS errors surfaced via hook state */
    });
    refetchPrayers();
    AppAlert.show(
      'Calibrate compass',
      'Move your phone slowly in a figure-∞ pattern away from metal and magnets, then hold it flat.',
      undefined,
      { variant: 'info' }
    );
  };

  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const onArView = () => {
    navigation.navigate('QiblaAR');
  };

  const currentPrayerKey = hero?.currentSalahRow ?? null;
  const nextPrayerKey = hero?.countdownTargetRow ?? null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Animated.View style={[StyleSheet.absoluteFillObject, fullScreenGlowStyle]} pointerEvents="none" />
      <CompassGridBackground />

      <View style={[styles.headerLift, styles.headerPad]}>
        <TabLandingHeader />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {locationOk ? (
          <View style={styles.statusPill}>
            <PulseDot s={styles} />
            <SazdaText variant="caption" color="primary" style={styles.statusPillText}>
              Precise location active
            </SazdaText>
          </View>
        ) : (
          <View style={[styles.statusPill, styles.statusMuted]}>
            <View style={styles.dotMuted} />
            <SazdaText variant="caption" color="onSurfaceVariant" style={styles.statusPillText}>
              Location needed
            </SazdaText>
          </View>
        )}

        <SazdaText variant="headlineLarge" color="primary" align="center" style={styles.heroTitle}>
          Qibla Finder
        </SazdaText>
        <SazdaText variant="bodyMedium" color="onSurfaceVariant" align="center" style={styles.heroSub}>
          Align your soul towards the Sacred House
        </SazdaText>

        {permissionDenied ? (
          <View style={styles.centerBlock}>
            <SazdaText variant="bodyMedium" color="onSurfaceVariant" align="center">
              We need your location to compute Qibla direction and today&apos;s prayer times.
            </SazdaText>
            <Pressable
              onPress={() => requestLocation()}
              style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed]}>
              <SazdaText variant="label" color="onPrimary">
                Enable location
              </SazdaText>
            </Pressable>
          </View>
        ) : locationError ? (
          <View style={styles.centerBlock}>
            <SazdaText variant="bodyMedium" color="error" align="center">
              {locationError}
            </SazdaText>
            <Pressable
              onPress={() => requestLocation()}
              style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed]}>
              <SazdaText variant="label" color="onPrimary">
                Try again
              </SazdaText>
            </Pressable>
          </View>
        ) : !coords || bearing == null ? (
          <View style={styles.centerBlock}>
            <ActivityIndicator color={c.primary} size="large" />
            <SazdaText variant="bodyMedium" color="onSurfaceVariant">
              Finding your position…
            </SazdaText>
          </View>
        ) : (
          <>
            <View style={styles.compassStage}>
              <View style={[styles.decoRing, styles.ring1]} />
              <View style={[styles.decoRing, styles.ring2]} />
              <View style={[styles.decoRing, styles.ring3]} />

              <View style={[styles.cardinalRotate, { transform: [{ rotate: '15deg' }] }]}>
                <SazdaText variant="caption" color="primary" style={[styles.cardinalMark, styles.cmN]}>
                  N
                </SazdaText>
                <SazdaText variant="caption" color="primary" style={[styles.cardinalMark, styles.cmE]}>
                  E
                </SazdaText>
                <SazdaText variant="caption" color="primary" style={[styles.cardinalMark, styles.cmS]}>
                  S
                </SazdaText>
                <SazdaText variant="caption" color="primary" style={[styles.cardinalMark, styles.cmW]}>
                  W
                </SazdaText>
              </View>

              <View style={styles.compassMain}>
                <View style={styles.patternOverlay} pointerEvents="none" />

                <Svg width={INNER} height={INNER} style={StyleSheet.absoluteFill}>
                  <Circle
                    cx={INNER / 2}
                    cy={INNER / 2}
                    r={RING_R}
                    stroke={c.surfaceContainerHighest}
                    strokeWidth={1}
                    fill="none"
                  />
                  <Circle
                    cx={INNER / 2}
                    cy={INNER / 2}
                    r={RING_R}
                    stroke={c.primary}
                    strokeOpacity={0.12}
                    strokeWidth={3}
                    fill="none"
                    strokeDasharray="2 6"
                  />
                  <Circle
                    cx={INNER / 2}
                    cy={INNER / 2}
                    r={RING_R}
                    stroke={c.primary}
                    strokeWidth={4}
                    fill="none"
                    strokeDasharray={`${ringProgress} ${CIRC}`}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${INNER / 2} ${INNER / 2})`}
                  />
                </Svg>

                <Animated.View style={[styles.needleStack, needleStyle]}>
                  <View style={styles.kaabaChip}>
                    <Landmark size={22} color={c.primary} strokeWidth={2} />
                  </View>
                  <Svg width={14} height={118} style={styles.needleSvg}>
                    <Defs>
                      <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={c.secondary} />
                        <Stop offset="0.55" stopColor={c.secondary} stopOpacity={0.65} />
                        <Stop offset="1" stopColor={c.secondary} stopOpacity={0} />
                      </LinearGradient>
                    </Defs>
                    <Rect x={4} y={0} width={6} height={112} rx={3} fill={`url(#${gradientId})`} />
                  </Svg>
                </Animated.View>

                <View style={styles.centerReadout}>
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.alignedFill,
                      { backgroundColor: c.secondary },
                      alignedFillStyle,
                    ]}
                  />
                  <SazdaText variant="displayLg" color="primary" style={styles.degText}>
                    {Math.round(bearing)}°
                  </SazdaText>
                  <SazdaText variant="caption" color="secondary" style={styles.interText}>
                    {intercardinal}
                  </SazdaText>
                </View>
              </View>
            </View>

            <Animated.View
              pointerEvents="none"
              style={[
                styles.alignedBadge,
                {
                  borderColor:
                    scheme === 'dark' ? 'rgba(254,214,91,0.28)' : 'rgba(115,92,0,0.18)',
                },
                alignedBadgeStyle,
              ]}>
              <View style={[styles.alignedDot, { backgroundColor: c.secondary }]} />
              <SazdaText variant="label" color="secondary" style={styles.alignedText}>
                Aligned · you’re facing Qibla
              </SazdaText>
            </Animated.View>

            <View style={styles.distanceCard}>
              <View style={styles.distanceLeft}>
                <View style={styles.distanceIcon}>
                  <MapPin size={22} color={c.primary} strokeWidth={2} />
                </View>
                <View>
                  <SazdaText variant="caption" color="onSurfaceVariant" style={styles.cardKicker}>
                    Distance to Kaaba
                  </SazdaText>
                  <SazdaText variant="headlineMedium" color="primary" style={styles.distanceValue}>
                    {distanceKm != null ? formatDistanceKm(distanceKm) : '—'}
                  </SazdaText>
                </View>
              </View>
              <View style={styles.distanceRight}>
                <SazdaText variant="caption" color="onSurfaceVariant" style={styles.cardKicker}>
                  Makkah, SA
                </SazdaText>
                <View style={styles.clearRow}>
                  <View style={styles.clearDot} />
                  <SazdaText variant="caption" color="secondary" style={styles.clearText}>
                    Clear path
                  </SazdaText>
                </View>
              </View>
            </View>

            <View style={styles.actionRow}>
              <Pressable
                onPress={onArView}
                style={({ pressed }) => [styles.btnPrimary, styles.btnHalf, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="AR view">
                <Expand size={20} color={c.onPrimary} strokeWidth={2.25} />
                <SazdaText variant="label" color="onPrimary" style={styles.btnLabel}>
                  AR view
                </SazdaText>
              </Pressable>
              <Pressable
                onPress={onCalibrate}
                style={({ pressed }) => [styles.btnGhost, styles.btnHalf, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Calibrate">
                <RefreshCw size={20} color={c.primary} strokeWidth={2.25} />
                <SazdaText variant="label" color="primary" style={styles.btnLabel}>
                  Calibrate
                </SazdaText>
              </Pressable>
            </View>

            <View style={styles.infoBanner}>
              <Info size={20} color={c.secondary} strokeWidth={2} />
              <Text style={styles.infoText}>
                Move your phone in a <Text style={styles.boldInfo}>∞ pattern</Text> for superior compass accuracy.
              </Text>
            </View>

            {compassError || heading == null ? (
              <SazdaText variant="caption" color="onSurfaceVariant" align="center" style={styles.compassHint}>
                {compassError
                  ? 'Compass unavailable — use the bearing and distance with a map.'
                  : 'Calibrating compass… hold flat and move gently in a figure eight.'}
              </SazdaText>
            ) : (
              <SazdaText variant="caption" color="onSurfaceVariant" align="center" style={styles.compassHint}>
                When the gold marker points up, you face the Qibla.
              </SazdaText>
            )}
          </>
        )}

        <View style={styles.timesSection}>
          <View style={styles.timesHead}>
            <Box size={20} color={c.primary} strokeWidth={2} />
            <SazdaText variant="headlineMedium" color="primary" style={styles.timesTitle}>
              Today&apos;s prayer times
            </SazdaText>
          </View>
          <SazdaText variant="caption" color="onSurfaceVariant" style={styles.timesSub}>
            ISNA (Aladhan) · local times for your area
          </SazdaText>

          {prayerError ? (
            <Pressable onPress={() => refetchPrayers()} style={styles.timesError}>
              <SazdaText variant="bodyMedium" color="error" align="center">
                Couldn&apos;t load times. Tap to retry.
              </SazdaText>
            </Pressable>
          ) : prayerLoading && !todayTimings ? (
            <ActivityIndicator color={c.primary} style={styles.timesLoader} />
          ) : todayTimings ? (
            <View style={styles.timesCard}>
              {PRAYER_ROWS.map((row, index) => {
                const isCurrent = currentPrayerKey === row.key;
                const isNext = nextPrayerKey === row.key && !isCurrent;
                const isLast = index === PRAYER_ROWS.length - 1;
                return (
                  <View
                    key={row.key}
                    style={[
                      styles.timeRow,
                      !isLast && styles.timeRowBorder,
                      isCurrent && styles.timeRowCurrent,
                      isNext && styles.timeRowNext,
                    ]}>
                    <View style={styles.timeRowLeft}>
                      <SazdaText
                        variant="bodyMedium"
                        color={isCurrent || isNext ? 'primary' : 'onSurface'}
                        style={styles.timeName}>
                        {row.label}
                      </SazdaText>
                      {isCurrent ? (
                        <View style={styles.badge}>
                          <SazdaText variant="caption" color="onSecondaryContainer" style={styles.badgeText}>
                            Now
                          </SazdaText>
                        </View>
                      ) : null}
                      {isNext ? (
                        <View style={styles.badgeNext}>
                          <SazdaText variant="caption" color="secondary" style={styles.badgeTextNext}>
                            Next
                          </SazdaText>
                        </View>
                      ) : null}
                    </View>
                    <SazdaText variant="titleSm" color="primary" style={styles.timeValue}>
                      {formatHhmmTo12h(todayTimings[row.key])}
                    </SazdaText>
                  </View>
                );
              })}
            </View>
          ) : (
            <SazdaText variant="bodyMedium" color="onSurfaceVariant" align="center">
              Enable location to load prayer times.
            </SazdaText>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createQiblaStyles(c: AppPalette, scheme: ResolvedScheme) {
  return StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: c.surface,
  },
  headerLift: {
    zIndex: 2,
  },
  headerPad: {
    paddingHorizontal: spacing.lg,
  },
  scrollView: {
    flex: 1,
    zIndex: 1,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.x3xl + spacing.xl,
    alignItems: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: 'rgba(234, 234, 209, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(0, 53, 39, 0.06)',
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  statusMuted: {
    backgroundColor: c.surfaceContainerLow,
  },
  statusPillText: {
    fontSize: 10,
    fontFamily: fontFamilies.body,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  dotMuted: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.outlineVariant,
    marginRight: spacing.sm,
  },
  pulseWrap: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  pulseRing: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: c.secondary,
  },
  pulseCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.secondary,
  },
  heroTitle: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  heroSub: {
    marginTop: spacing.xs,
    fontWeight: '500',
    opacity: 0.88,
    maxWidth: 320,
  },
  centerBlock: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.x3xl,
    paddingHorizontal: spacing.md,
    width: '100%',
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: c.primary,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.full,
    shadowColor: 'rgba(0, 53, 39, 0.22)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 6,
  },
  btnGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(228, 228, 204, 0.75)',
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(0, 53, 39, 0.06)',
  },
  btnHalf: {
    flex: 1,
    minWidth: 0,
  },
  btnLabel: {
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  pressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
  compassStage: {
    width: OUTER,
    height: OUTER,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  decoRing: {
    position: 'absolute',
    borderRadius: OUTER / 2,
    borderWidth: 1,
  },
  ring1: {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderColor: 'rgba(228, 228, 204, 0.55)',
  },
  ring2: {
    top: 22,
    left: 22,
    right: 22,
    bottom: 22,
    borderColor: 'rgba(234, 234, 209, 0.75)',
  },
  ring3: {
    top: 36,
    left: 36,
    right: 36,
    bottom: 36,
    borderStyle: 'dashed',
    borderColor: 'rgba(0, 53, 39, 0.08)',
    borderWidth: 2,
  },
  cardinalRotate: {
    position: 'absolute',
    width: OUTER - 8,
    height: OUTER - 8,
    opacity: 0.45,
  },
  cardinalMark: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: '800',
    fontFamily: fontFamilies.body,
  },
  cmN: { top: 0, left: '50%', marginLeft: -6 },
  cmE: { right: 0, top: '50%', marginTop: -8 },
  cmS: { bottom: 0, left: '50%', marginLeft: -6 },
  cmW: { left: 0, top: '50%', marginTop: -8 },
  compassMain: {
    width: INNER,
    height: INNER,
    borderRadius: INNER / 2,
    backgroundColor: c.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: 'rgba(0, 53, 39, 0.1)',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 1,
    shadowRadius: 40,
    elevation: 12,
  },
  patternOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: c.primary,
    opacity: 0.03,
  },
  needleStack: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    paddingTop: 14,
    zIndex: 10,
  },
  kaabaChip: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: c.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(115, 92, 0, 0.2)',
    marginBottom: 4,
    shadowColor: 'rgba(0,0,0,0.12)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  needleSvg: {
    marginTop: -2,
  },
  centerReadout: {
    position: 'absolute',
    width: CENTER_READOUT,
    height: CENTER_READOUT,
    borderRadius: CENTER_READOUT / 2,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  alignedFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: CENTER_READOUT / 2,
  },
  degText: {
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '900',
    letterSpacing: -1,
  },
  interText: {
    marginTop: 4,
    fontWeight: '800',
    letterSpacing: 3,
    textTransform: 'uppercase',
    fontSize: 11,
  },
  distanceCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderRadius: radius.md + 8,
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(228, 228, 204, 0.55)',
    marginBottom: spacing.md,
  },
  distanceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
    minWidth: 0,
  },
  distanceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(6, 78, 59, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardKicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    opacity: 0.85,
  },
  distanceValue: {
    fontWeight: '800',
    marginTop: 2,
  },
  distanceRight: {
    alignItems: 'flex-end',
    paddingLeft: spacing.sm,
  },
  clearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  clearDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: c.secondary,
  },
  clearText: {
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontSize: 10,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
    marginBottom: spacing.lg,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    width: '100%',
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md + 6,
    backgroundColor: 'rgba(254, 214, 91, 0.28)',
    borderWidth: 1,
    borderColor: 'rgba(115, 92, 0, 0.12)',
    marginBottom: spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    fontWeight: '600',
    color: c.onSurfaceVariant,
    fontFamily: fontFamilies.body,
  },
  boldInfo: {
    fontWeight: '800',
    color: c.primary,
    fontFamily: fontFamilies.body,
  },
  compassHint: {
    opacity: 0.85,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  alignedBadge: {
    alignSelf: 'center',
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    backgroundColor: scheme === 'dark' ? 'rgba(10, 18, 14, 0.55)' : 'rgba(251, 251, 226, 0.7)',
    borderWidth: StyleSheet.hairlineWidth,
  },
  alignedDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  alignedText: {
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  timesSection: {
    width: '100%',
    marginTop: spacing.md,
    alignItems: 'stretch',
  },
  timesHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  timesTitle: {
    fontWeight: '800',
  },
  timesSub: {
    marginBottom: spacing.md,
    opacity: 0.85,
  },
  timesCard: {
    borderRadius: radius.md + 8,
    backgroundColor: c.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(0, 53, 39, 0.06)',
    overflow: 'hidden',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
  },
  timeRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 53, 39, 0.08)',
  },
  timeRowCurrent: {
    backgroundColor: 'rgba(254, 214, 91, 0.22)',
  },
  timeRowNext: {
    backgroundColor: 'rgba(6, 78, 59, 0.04)',
  },
  timeRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
    flex: 1,
    minWidth: 0,
  },
  timeName: {
    fontWeight: '600',
  },
  timeValue: {
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  badge: {
    backgroundColor: c.secondaryContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  badgeNext: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(115, 92, 0, 0.35)',
  },
  badgeTextNext: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  timesError: {
    padding: spacing.lg,
  },
  timesLoader: {
    marginVertical: spacing.lg,
  },
});
}

