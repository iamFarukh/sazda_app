import { useCallback, useEffect, useId, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Droplets } from 'lucide-react-native';

const ORB = 256;
const R = ORB / 2 - 3;

type Props = {
  primary: string;
  primaryContainer: string;
  iconColor: string;
  /** Increment on each successful tap to drive ripple + droplet animation. */
  tapTick: number;
  onPress: () => void;
  scheme: 'light' | 'dark';
};

function ExpandingRipple({
  id,
  rippleColor,
  onDone,
}: {
  id: number;
  rippleColor: string;
  onDone: () => void;
}) {
  const scale = useSharedValue(0.52);
  const opacity = useSharedValue(0.38);

  useEffect(() => {
    scale.value = 0.52;
    opacity.value = 0.38;
    scale.value = withTiming(2.35, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
    opacity.value = withTiming(0, {
      duration: 900,
      easing: Easing.out(Easing.quad),
    });
    const t = setTimeout(onDone, 920);
    return () => clearTimeout(t);
  }, [id, onDone, opacity, scale]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.rippleHost, ringStyle]}>
      <View
        style={[
          styles.rippleRing,
          {
            width: ORB,
            height: ORB,
            borderRadius: ORB / 2,
            borderColor: rippleColor,
          },
        ]}
      />
    </Animated.View>
  );
}

export function TasbeehTapOrb({
  primary,
  primaryContainer,
  iconColor,
  tapTick,
  onPress,
  scheme,
}: Props) {
  const gid = useId().replace(/:/g, '');
  const gradId = `tasbeehOrb-${gid}`;

  const orbScale = useSharedValue(1);
  const dropScale = useSharedValue(1);
  const outerPulse = useSharedValue(0.4);
  const midPulse = useSharedValue(0.55);

  const [ripples, setRipples] = useState<number[]>([]);

  const spawnRipple = useCallback(() => {
    setRipples(prev => [...prev, Date.now()]);
  }, []);

  const removeRipple = useCallback((id: number) => {
    setRipples(prev => prev.filter(x => x !== id));
  }, []);

  useEffect(() => {
    outerPulse.value = withRepeat(
      withSequence(
        withTiming(0.72, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.4, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
    midPulse.value = withRepeat(
      withSequence(
        withTiming(0.88, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.55, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
  }, [midPulse, outerPulse]);

  useEffect(() => {
    if (tapTick <= 0) return;
    dropScale.value = withSequence(
      withTiming(0.82, { duration: 55, easing: Easing.out(Easing.quad) }),
      withSpring(1.18, { damping: 8, stiffness: 320, mass: 0.45 }),
      withSpring(1, { damping: 14, stiffness: 220 }),
    );
    spawnRipple();
  }, [tapTick, dropScale, spawnRipple]);

  const orbAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: orbScale.value }],
  }));

  const dropAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dropScale.value }],
  }));

  const outerDecorStyle = useAnimatedStyle(() => ({
    opacity: outerPulse.value,
  }));

  const midDecorStyle = useAnimatedStyle(() => ({
    opacity: midPulse.value,
  }));

  const rippleStroke =
    scheme === 'dark' ? 'rgba(142, 207, 178, 0.45)' : 'rgba(0, 53, 39, 0.22)';

  const shadowColor = scheme === 'dark' ? '#000' : 'rgb(6, 78, 59)';

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.decorOuter, outerDecorStyle]}>
        <View
          style={[
            styles.decorRing,
            {
              width: ORB + 64,
              height: ORB + 64,
              borderRadius: (ORB + 64) / 2,
              borderColor: scheme === 'dark' ? 'rgba(142,207,178,0.12)' : 'rgba(0,53,39,0.06)',
            },
          ]}
        />
      </Animated.View>
      <Animated.View style={[styles.decorMid, midDecorStyle]}>
        <View
          style={[
            styles.decorRing,
            {
              width: ORB + 32,
              height: ORB + 32,
              borderRadius: (ORB + 32) / 2,
              borderColor: scheme === 'dark' ? 'rgba(142,207,178,0.18)' : 'rgba(0,53,39,0.1)',
            },
          ]}
        />
      </Animated.View>

      {ripples.map(id => (
        <ExpandingRipple key={id} id={id} rippleColor={rippleStroke} onDone={() => removeRipple(id)} />
      ))}

      <Pressable
        onPress={onPress}
        onPressIn={() => {
          orbScale.value = withSpring(0.94, { damping: 16, stiffness: 380 });
        }}
        onPressOut={() => {
          orbScale.value = withSpring(1, { damping: 14, stiffness: 260 });
        }}
        accessibilityRole="button"
        accessibilityLabel="Tap to count dhikr"
        style={styles.pressable}>
        <Animated.View
          style={[
            styles.orbShadow,
            orbAnimStyle,
            {
              shadowColor,
              shadowOpacity: scheme === 'dark' ? 0.55 : 0.28,
              shadowRadius: scheme === 'dark' ? 28 : 36,
              shadowOffset: { width: 0, height: 18 },
              elevation: 16,
            },
          ]}>
          <View style={styles.orbClip}>
            <Svg width={ORB} height={ORB}>
              <Defs>
                {/* Top-to-bottom split: slightly lighter crest, deeper base (Stitch ref). */}
                <LinearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor={primaryContainer} />
                  <Stop offset="55%" stopColor={primary} />
                  <Stop offset="100%" stopColor={primary} />
                </LinearGradient>
              </Defs>
              <Circle cx={ORB / 2} cy={ORB / 2} r={R} fill={`url(#${gradId})`} />
            </Svg>
            <View
              pointerEvents="none"
              style={[
                styles.shineOverlay,
                { height: ORB * 0.48, opacity: scheme === 'dark' ? 0.14 : 0.22 },
              ]}
            />
            <Animated.View style={[styles.iconLayer, dropAnimStyle]}>
              <Droplets size={68} color={iconColor} strokeWidth={2.1} />
            </Animated.View>
          </View>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: ORB + 72,
    height: ORB + 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  decorOuter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  decorMid: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  decorRing: {
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  rippleHost: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  rippleRing: {
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  pressable: {
    zIndex: 2,
    borderRadius: ORB / 2 + 8,
  },
  orbShadow: {
    borderRadius: ORB / 2,
    overflow: 'visible',
  },
  orbClip: {
    width: ORB,
    height: ORB,
    borderRadius: ORB / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shineOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: ORB / 2,
    borderTopRightRadius: ORB / 2,
    backgroundColor: '#fff',
  },
  iconLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
