import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import Animated, {
  Easing,
  SensorType,
  useAnimatedSensor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { ArrowLeft, Info, MapPin, Target } from 'lucide-react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { AppState, AppStateStatus } from 'react-native';

import { useCompassHeadingWhileFocused } from '../../hooks/useCompassHeadingWhileFocused';
import { usePrayerTimesHome } from '../../hooks/usePrayerTimesHome';
import { useThemePalette } from '../../theme/useThemePalette';
import { fontFamilies } from '../../theme/typography';
import { hapticSuccess } from '../../utils/appHaptics';
import {
  KAABA_LAT,
  KAABA_LON,
  bearingToKaaba,
  formatDistanceKm,
  haversineKm,
} from '../../utils/qiblaBearing';

export function QiblaARScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
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
        setDirectionHint('Turn Right →');
      } else if (deltaDeg < -6 && deltaDeg > -180) {
        setDirectionHint('← Turn Left');
      }
    }
  }, [deltaDeg, aligned]);

  useEffect(() => {
    alignedSv.value = withSpring(aligned ? 1 : 0, { damping: 14, stiffness: 120 });
  }, [aligned, alignedSv]);

  // Transform matrix to rotate the AR arrow layer relative to Kaaba
  const arArrowStyle = useAnimatedStyle(() => {
    const b = bearing ?? 0;
    const currentHeading = headingSv.value;
    const rel = b - currentHeading;

    return {
      transform: [
        { perspective: 1000 },
        { rotateX: '-12deg' }, 
        { rotateZ: `${rel}deg` },
        // Glow/Pop when aligned
        { scale: 1 + alignedSv.value * 0.1 },
      ],
      opacity: withTiming(heading !== null ? 1 : 0),
    };
  });

  const hintStyle = useAnimatedStyle(() => ({
    opacity: withTiming(alignedSv.value > 0.05 ? 0 : 1, { duration: 250 }),
    transform: [{ translateY: withSpring(alignedSv.value > 0.05 ? 10 : 0) }],
  }));

  const tiltBannerStyle = useAnimatedStyle(() => {
    // Determine if phone is roughly vertical (Y axis gravity > 5 or < -5)
    // If abs(y) < 5, phone is too flat
    const isUpright = Math.abs(gravity.sensor.value.y) > 5;
    return {
      transform: [{ translateY: withSpring(isUpright ? 150 : 0) }],
      opacity: withTiming(isUpright ? 0 : 1),
    };
  });

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
        format={undefined}
      />
      
      {/* Dark tint over camera */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <ArrowLeft color="#fff" size={24} />
          </Pressable>
          <View style={styles.makkahBadge}>
            <MapPin color={c.primary} size={14} style={{ marginRight: 6 }} />
            <Text style={styles.badgeText}>MAKKAH</Text>
          </View>
          <Pressable onPress={() => {}} style={styles.iconBtn}>
            <Info color="#fff" size={24} />
          </Pressable>
        </View>

        {/* 3D AR Arrow Graphic */}
        <View style={styles.arStage}>
          {compassError ? (
            <Text style={styles.compassErr}>Compass Error: Please calibrate your device.</Text>
          ) : (
            <>
              <Animated.View style={[styles.arrowContainer, arArrowStyle]}>
                <View style={[styles.arrowTop, { borderBottomColor: c.secondaryContainer }]} />
                <View style={[styles.arrowBg, { backgroundColor: c.secondaryContainer }]} />
              </Animated.View>
              
              {/* Direction Hint below the arrow */}
              <Animated.View style={[styles.hintCard, hintStyle]}>
                <Text style={styles.hintText}>{directionHint ?? 'Aligning...'}</Text>
              </Animated.View>
            </>
          )}
        </View>

        {/* Bottom Status Blocks */}
        <View style={styles.bottomSection}>

          <Animated.View style={tiltBannerStyle}>
            <View style={[styles.tiltBanner, { backgroundColor: 'rgba(10, 24, 20, 0.85)' }]}>
              <Text style={{ color: '#fed65b', fontWeight: '800', fontSize: 13 }}>TILT SENSOR</Text>
              <Text style={{ color: '#fff', fontSize: 12, marginTop: 2 }}>Hold your phone completely upright for AR precision.</Text>
            </View>
          </Animated.View>

          <View style={[styles.hudCard, { backgroundColor: 'rgba(10, 24, 20, 0.85)' }]}>
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
              </View>
              <View style={styles.hudDivider} />
              <View style={styles.hudCol}>
                <Text style={styles.hudLabel}>DISTANCE</Text>
                <Text style={styles.hudValue}>{distanceKm != null ? `${Math.round(distanceKm).toLocaleString()} km` : '—'}</Text>
              </View>
            </View>
          </View>
          
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safe: {
    flex: 1,
    justifyContent: 'space-between',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCenter: {
    fontFamily: fontFamilies.body,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  makkahBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  badgeText: {
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 2,
    color: '#003527',
  },
  arStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 64, // offset center slightly up
  },
  compassErr: {
    color: '#ffdad6',
    backgroundColor: '#93000a',
    padding: 12,
    borderRadius: 8,
    overflow: 'hidden',
    fontWeight: 'bold',
  },
  arrowContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(254, 214, 91, 0.4)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  arrowTop: {
    width: 0,
    height: 0,
    borderLeftWidth: 70,
    borderRightWidth: 70,
    borderBottomWidth: 110,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginBottom: -2,
    zIndex: 2,
  },
  arrowBg: {
    width: 80,
    height: 160,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    zIndex: 1,
  },
  hintCard: {
    position: 'absolute',
    bottom: -60,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  hintText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  tiltBanner: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  hudCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  hudTopAligned: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  alignedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  alignedText: {
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1,
  },
  hudBody: {
    flexDirection: 'row',
    paddingVertical: 20,
  },
  hudCol: {
    flex: 1,
    alignItems: 'center',
  },
  hudDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  hudLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: 8,
  },
  hudValue: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
  },
});
