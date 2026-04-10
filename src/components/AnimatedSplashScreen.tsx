import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  withRepeat,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Stop, Rect, Path } from 'react-native-svg';
import BootSplash from 'react-native-bootsplash';
import { useIslamicContext } from '../context/useIslamicContext';

const { width, height } = Dimensions.get('window');

interface Props {
  onAnimationEnd: () => void;
}

export function AnimatedSplashScreen({ onAnimationEnd }: Props) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.95); // Starts slightly closer to 1 as per constraints
  const loadingDots = useSharedValue(0);

  const { config } = useIslamicContext();
  const splash = config.splash;
  const logoColor = splash.logoTint || config.paletteLight.secondaryContainer;

  useEffect(() => {
    BootSplash.hide({ fade: true }).catch(() => {});

    // Extremely fast and smooth entry (under 800ms)
    opacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) });
    scale.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) });

    loadingDots.value = withRepeat(
      withSequence(withTiming(1, { duration: 400 }), withTiming(0, { duration: 400 })),
      -1,
      true
    );

    // Strict exit timeline: Total duration capped at 1200ms
    const timeout = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 400 }, (finished) => {
        if (finished) runOnJS(onAnimationEnd)();
      });
    }, 1200);

    return () => clearTimeout(timeout);
  }, [opacity, scale, loadingDots, onAnimationEnd]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const dot1Style = useAnimatedStyle(() => ({ opacity: loadingDots.value >= 0.3 ? 1 : 0.4 }));
  const dot2Style = useAnimatedStyle(() => ({ opacity: loadingDots.value >= 0.6 ? 1 : 0.4 }));
  const dot3Style = useAnimatedStyle(() => ({ opacity: loadingDots.value >= 0.9 ? 1 : 0.4 }));

  return (
    <View style={[styles.container, { backgroundColor: splash.backgroundColor }]}>
      <Svg height={height} width={width} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="bg" cx="50%" cy="50%" rx="70%" ry="70%">
            <Stop offset="0%" stopColor={splash.gradient[0]} />
            <Stop offset="100%" stopColor={splash.gradient[1]} />
          </RadialGradient>
          <RadialGradient id="glowTop" cx="30%" cy="20%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor={splash.gradient[0]} stopOpacity="0.3" />
            <Stop offset="100%" stopColor={splash.backgroundColor} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="glowBottom" cx="70%" cy="80%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor={logoColor} stopOpacity="0.1" />
            <Stop offset="100%" stopColor={splash.backgroundColor} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#bg)" />
        <Rect width={width} height={height} fill="url(#glowTop)" />
        <Rect width={width} height={height} fill="url(#glowBottom)" />

        <Path 
          d={`M0,${height} L${width},${height} L${width},${height - 50} Q${width - 50},${height - 80} ${width - 100},${height - 50} L${width - 150},${height - 70} Q${width - 200},${height - 200} ${width - 250},${height - 70} L${width - 300},${height - 50} Q${width - 350},${height - 80} ${width - 400},${height - 50} L0,${height - 50} Z`} 
          fill="#e4e4cc" 
          opacity="0.05" 
        />
      </Svg>

      <Animated.View style={[styles.content, animatedStyle]}>
        <View style={[styles.iconContainer, { backgroundColor: `${logoColor}15`, borderColor: `${logoColor}30` }]}>
          <Svg width={48} height={48} viewBox="0 0 24 24" fill={logoColor}>
            <Path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1Z" />
          </Svg>
        </View>

        <Text style={[styles.title, { color: logoColor }]}>Sazda</Text>
        <Text style={[styles.tagline, { color: logoColor }]}>{splash.message}</Text>
        <View style={[styles.divider, { backgroundColor: `${logoColor}40` }]} />
        
        <View style={styles.brandingContainer}>
          <Text style={[styles.developedBy, { color: logoColor }]}>App developed by</Text>
          <Text style={[styles.developerName, { color: logoColor }]}>farukhchenda</Text>
        </View>
      </Animated.View>

      <Animated.View style={[styles.loadingContainer, animatedStyle]}>
        <View style={styles.dots}>
          <Animated.View style={[styles.dot, dot1Style, { backgroundColor: logoColor }]} />
          <Animated.View style={[styles.dot, dot2Style, { backgroundColor: logoColor }]} />
          <Animated.View style={[styles.dot, dot3Style, { backgroundColor: logoColor }]} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    zIndex: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Manrope',
    fontWeight: '900',
    fontStyle: 'italic',
    fontSize: 48,
    letterSpacing: -1,
  },
  tagline: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 18,
    letterSpacing: 3,
    fontWeight: '500',
    opacity: 0.9,
    marginTop: 8,
  },
  divider: {
    width: 48,
    height: 1,
    marginTop: 16,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 64,
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  brandingContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  developedBy: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.7,
  },
  developerName: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 2,
  },
});
