import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import {
  Box,
  ChevronLeft,
  Expand,
  Info,
  MapPin,
  RefreshCw,
} from 'lucide-react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SazdaText } from '../../components/atoms/SazdaText/SazdaText';
import { Skeleton } from '../../components/atoms/Skeleton/Skeleton';
import { TabLandingHeader } from '../../components/organisms/TabLandingHeader';
import { QiblaCompass } from './QiblaCompass';
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
import { hapticLight, hapticMedium, hapticSuccess } from '../../utils/appHaptics';
import {
  KAABA_LAT,
  KAABA_LON,
  bearingToIntercardinal,
  bearingToKaaba,
  formatDistanceKm,
  haversineKm,
} from '../../utils/qiblaBearing';

/** Proximity bands (degrees off) that fire an ascending "tick" as you turn closer. */
const HAPTIC_BANDS = [45, 25, 12, 6];

/** Full-screen dark emerald gradient — the immersive Qibla backdrop. */
function QiblaImmersiveBg() {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
      <Defs>
        <RadialGradient id="qBg" cx="50%" cy="34%" r="85%">
          <Stop offset="0" stopColor="#0c4a3a" />
          <Stop offset="0.5" stopColor="#072a20" />
          <Stop offset="1" stopColor="#03130e" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#qBg)" />
    </Svg>
  );
}

/** Light ink for the immersive dark background. */
const INK = '#ffffff';
const INK_SOFT = 'rgba(255,255,255,0.82)';
const INK_MUTED = 'rgba(255,255,255,0.6)';
const GOLD = '#fed65b';

const PRAYER_ROWS: { key: keyof PrayerTimingsDay; label: string }[] = [
  { key: 'Fajr', label: 'Fajr' },
  { key: 'Sunrise', label: 'Sunrise' },
  { key: 'Dhuhr', label: 'Zohar' },
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
  const reduceMotion = useReducedMotion();

  // Light status-bar icons over the immersive dark screen; restore on blur.
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle('light-content');
      return () =>
        StatusBar.setBarStyle(scheme === 'dark' ? 'light-content' : 'dark-content');
    }, [scheme]),
  );

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

    if (Platform.OS === 'android') {
      // Android receives throttled 2-degree chunks to save battery and bridge glutter. 
      // linear interpolation prevents the violent spring bounce overshoots.
      headingSv.value = withTiming(continuousHeadingRef.current, {
        duration: 250,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      // iOS has 60fps continuous heading updates, spring bounce looks perfect
      headingSv.value = withSpring(continuousHeadingRef.current, {
        damping: 35,
        stiffness: 450,
        mass: 0.4,
        overshootClamping: false,
      });
    }
  }, [heading, headingSv]);

  useEffect(() => {
    qiblaSv.value = bearing ?? 0;
  }, [bearing, qiblaSv]);

  const locationOk = !!coords && !permissionDenied && !locationError;

  // --- Alignment / “satisfied” feedback ---
  const deltaDeg = useMemo(() => {
    if (bearing == null || heading == null) return null;
    const raw = ((bearing - heading + 540) % 360) - 180; // [-180, 180]
    return Math.abs(raw);
  }, [bearing, heading]);

  const [aligned, setAligned] = useState(false);
  const [alignCount, setAlignCount] = useState(0);
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
      setAlignCount(n => n + 1);
      hapticSuccess();
    } else if (aligned && deltaDeg > 4.5) {
      setAligned(false);
    }
  }, [compassError, deltaDeg, locationOk, aligned]);

  // Tiered "tick" haptics as the user turns into closer proximity bands. Re-arms only after
  // leaving a band by a margin, so it never chatters at a boundary or repeats while held.
  const bandLevelRef = useRef(0);
  useEffect(() => {
    if (deltaDeg == null || !locationOk || compassError || aligned) {
      bandLevelRef.current = aligned ? HAPTIC_BANDS.length : 0;
      return;
    }
    const margin = 4;
    let closeLevel = 0;
    let armLevel = 0;
    for (const b of HAPTIC_BANDS) {
      if (deltaDeg <= b) closeLevel++;
      if (deltaDeg <= b + margin) armLevel++;
    }
    if (closeLevel > bandLevelRef.current) {
      if (closeLevel >= HAPTIC_BANDS.length) hapticMedium();
      else hapticLight();
      bandLevelRef.current = closeLevel;
    } else if (armLevel < bandLevelRef.current) {
      bandLevelRef.current = armLevel;
    }
  }, [deltaDeg, locationOk, compassError, aligned]);

  // Signed delta + proximity for accessibility (color-independent direction feedback).
  const signedDelta =
    bearing != null && heading != null
      ? ((bearing - heading + 540) % 360) - 180
      : null;
  const proximityPct =
    deltaDeg != null ? Math.round(Math.max(0, 1 - deltaDeg / 90) * 100) : 0;
  const compassA11yLabel = aligned
    ? 'You are now facing the Qibla.'
    : signedDelta != null
      ? `Qibla is ${Math.round(Math.abs(signedDelta))} degrees to your ${
          signedDelta > 0 ? 'right' : 'left'
        }. Turn ${signedDelta > 0 ? 'right' : 'left'} to align.`
      : 'Finding Qibla direction.';

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
    <View style={styles.safe}>
      <QiblaImmersiveBg />
      <Animated.View style={[StyleSheet.absoluteFillObject, fullScreenGlowStyle]} pointerEvents="none" />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={[styles.headerLift, styles.headerPad]}>
          {navigation.canGoBack() ? (
            /* Pushed from Tools: back affordance instead of the tab landing bar. */
            <View style={styles.backRow}>
              <Pressable
                onPress={() => {
                  hapticMedium();
                  navigation.goBack();
                }}
                accessibilityRole="button"
                accessibilityLabel="Go back"
                style={({ pressed }) => [styles.backChip, pressed && styles.pressed]}>
                <ChevronLeft size={24} color="#ffffff" strokeWidth={2.5} />
              </Pressable>
            </View>
          ) : (
            <TabLandingHeader onDark />
          )}
        </View>

        <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {locationOk ? (
          <View style={styles.statusPill}>
            <PulseDot s={styles} />
            <SazdaText variant="caption" color={INK} style={styles.statusPillText}>
              Precise location active
            </SazdaText>
          </View>
        ) : (
          <View style={[styles.statusPill, styles.statusMuted]}>
            <View style={styles.dotMuted} />
            <SazdaText variant="caption" color={INK_SOFT} style={styles.statusPillText}>
              Location needed
            </SazdaText>
          </View>
        )}

        <SazdaText variant="headlineLarge" color={INK} align="center" style={styles.heroTitle}>
          Qibla Finder
        </SazdaText>
        <SazdaText variant="bodyMedium" color={INK_SOFT} align="center" style={styles.heroSub}>
          Align your soul towards the Sacred House
        </SazdaText>

        {permissionDenied ? (
          <View style={styles.centerBlock}>
            <SazdaText variant="bodyMedium" color={INK_SOFT} align="center">
              We need your location to compute Qibla direction and today&apos;s prayer times.
            </SazdaText>
            <Pressable
              onPress={() => requestLocation()}
              style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed]}>
              <SazdaText variant="label" color="primary">
                Enable location
              </SazdaText>
            </Pressable>
          </View>
        ) : locationError ? (
          <View style={styles.centerBlock}>
            <SazdaText variant="bodyMedium" color="#ffb4ab" align="center">
              {locationError}
            </SazdaText>
            <Pressable
              onPress={() => requestLocation()}
              style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed]}>
              <SazdaText variant="label" color="primary">
                Try again
              </SazdaText>
            </Pressable>
          </View>
        ) : !coords || bearing == null ? (
          <View style={styles.centerBlock}>
            <ActivityIndicator color={GOLD} size="large" />
            <SazdaText variant="bodyMedium" color={INK_SOFT}>
              Finding your position…
            </SazdaText>
          </View>
        ) : (
          <>
            <View
              style={styles.compassWrap}
              accessible
              accessibilityRole="adjustable"
              accessibilityLabel={compassA11yLabel}
              accessibilityValue={{ min: 0, max: 100, now: proximityPct }}>
              <QiblaCompass
                headingSv={headingSv}
                qiblaSv={qiblaSv}
                alignedSv={alignedSv}
                bearing={bearing}
                intercardinal={intercardinal}
                aligned={aligned}
                alignCount={alignCount}
                reduceMotion={reduceMotion}
                colors={c}
                scheme={scheme}
              />
            </View>

            {/* Live region so screen readers announce alignment without re-reading the dial. */}
            <View accessibilityLiveRegion="polite" style={styles.srStatusWrap}>
              <SazdaText
                variant="caption"
                color={INK_MUTED}
                align="center"
                style={styles.srStatus}>
                {aligned
                  ? 'Aligned — facing the Qibla'
                  : `${proximityPct}% aligned`}
              </SazdaText>
            </View>

            <Animated.View
              pointerEvents="none"
              style={[styles.alignedBadge, alignedBadgeStyle]}>
              <View style={[styles.alignedDot, { backgroundColor: c.secondary }]} />
              <SazdaText variant="label" color="secondary" style={styles.alignedText}>
                Aligned · you’re facing Qibla
              </SazdaText>
            </Animated.View>

            <View style={styles.distanceCard}>
              <View style={styles.distanceLeft}>
                <View style={styles.distanceIcon}>
                  <MapPin size={22} color={GOLD} strokeWidth={2} />
                </View>
                <View>
                  <SazdaText variant="caption" color={INK_MUTED} style={styles.cardKicker}>
                    Distance to Kaaba
                  </SazdaText>
                  <SazdaText variant="headlineMedium" color={INK} style={styles.distanceValue}>
                    {distanceKm != null ? formatDistanceKm(distanceKm) : '—'}
                  </SazdaText>
                </View>
              </View>
              <View style={styles.distanceRight}>
                <SazdaText variant="caption" color={INK_MUTED} style={styles.cardKicker}>
                  Makkah, SA
                </SazdaText>
                <View style={styles.clearRow}>
                  <View style={styles.clearDot} />
                  <SazdaText variant="caption" color={GOLD} style={styles.clearText}>
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
                <Expand size={20} color="#0a2a20" strokeWidth={2.25} />
                <SazdaText variant="label" color="#0a2a20" style={styles.btnLabel}>
                  AR view
                </SazdaText>
              </Pressable>
              <Pressable
                onPress={onCalibrate}
                style={({ pressed }) => [styles.btnGhost, styles.btnHalf, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Calibrate">
                <RefreshCw size={20} color={INK} strokeWidth={2.25} />
                <SazdaText variant="label" color={INK} style={styles.btnLabel}>
                  Calibrate
                </SazdaText>
              </Pressable>
            </View>

            <View style={styles.infoBanner}>
              <Info size={20} color={GOLD} strokeWidth={2} />
              <Text style={styles.infoText}>
                Move your phone in a <Text style={styles.boldInfo}>∞ pattern</Text> for superior compass accuracy.
              </Text>
            </View>

            {compassError || heading == null ? (
              <SazdaText variant="caption" color={INK_SOFT} align="center" style={styles.compassHint}>
                {compassError
                  ? 'Compass unavailable — use the bearing and distance with a map.'
                  : 'Calibrating compass… hold flat and move gently in a figure eight.'}
              </SazdaText>
            ) : (
              <SazdaText variant="caption" color={INK_SOFT} align="center" style={styles.compassHint}>
                When the gold marker points up, you face the Qibla.
              </SazdaText>
            )}
          </>
        )}

        <View style={styles.timesSection}>
          <View style={styles.timesHead}>
            <Box size={20} color={GOLD} strokeWidth={2} />
            <SazdaText variant="headlineMedium" color={INK} style={styles.timesTitle}>
              Today&apos;s prayer times
            </SazdaText>
          </View>
          <SazdaText variant="caption" color={INK_MUTED} style={styles.timesSub}>
            ISNA (Aladhan) · local times for your area
          </SazdaText>

          {prayerError ? (
            <Pressable onPress={() => refetchPrayers()} style={styles.timesError}>
              <SazdaText variant="bodyMedium" color="error" align="center">
                Couldn&apos;t load times. Tap to retry.
              </SazdaText>
            </Pressable>
          ) : prayerLoading && !todayTimings ? (
            <View style={styles.timesCard}>
              {[0, 1, 2, 3, 4].map((i, idx, arr) => (
                <View
                  key={i}
                  style={[styles.timeRow, idx < arr.length - 1 && styles.timeRowBorder]}>
                  <Skeleton width={90} height={16} />
                  <Skeleton width={64} height={16} />
                </View>
              ))}
            </View>
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
                        color={isCurrent || isNext ? INK : INK_SOFT}
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
                    <SazdaText variant="titleSm" color={INK} style={styles.timeValue}>
                      {formatHhmmTo12h(todayTimings[row.key])}
                    </SazdaText>
                  </View>
                );
              })}
            </View>
          ) : (
            <SazdaText variant="bodyMedium" color={INK_SOFT} align="center">
              Enable location to load prayer times.
            </SazdaText>
          )}
        </View>
      </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function createQiblaStyles(c: AppPalette, _scheme: ResolvedScheme) {
  return StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#03130e',
  },
  safeArea: {
    flex: 1,
  },
  compassWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  headerLift: {
    zIndex: 2,
  },
  headerPad: {
    paddingHorizontal: spacing.lg,
  },
  backRow: {
    minHeight: 56,
    justifyContent: 'center',
  },
  backChip: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
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
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  statusMuted: {
    backgroundColor: 'rgba(255,255,255,0.06)',
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
    backgroundColor: 'rgba(255,255,255,0.4)',
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
    backgroundColor: '#fed65b',
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.full,
    shadowColor: 'rgba(0, 0, 0, 0.35)',
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
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
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
  srStatusWrap: {
    alignSelf: 'center',
  },
  srStatus: {
    marginBottom: spacing.sm,
    opacity: 0.8,
  },
  distanceCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderRadius: radius.md + 8,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(254,214,91,0.22)',
    marginBottom: spacing.md,
    shadowColor: 'rgba(0,0,0,0.4)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 4,
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
    backgroundColor: 'rgba(254,214,91,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(254,214,91,0.25)',
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
    backgroundColor: 'rgba(254, 214, 91, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(254, 214, 91, 0.22)',
    marginBottom: spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.82)',
    fontFamily: fontFamilies.body,
  },
  boldInfo: {
    fontWeight: '800',
    color: '#fed65b',
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
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(254,214,91,0.3)',
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
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
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
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  timeRowCurrent: {
    backgroundColor: 'rgba(254, 214, 91, 0.16)',
  },
  timeRowNext: {
    backgroundColor: 'rgba(255,255,255,0.05)',
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
});
}

