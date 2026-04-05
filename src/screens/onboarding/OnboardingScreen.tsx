import { useCallback, useMemo, useRef } from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, G, Path, Pattern, Rect } from 'react-native-svg';
import { ArrowRight, BookOpen, ChevronLeft, Clock, Compass, Grid3x3 } from 'lucide-react-native';
import { SazdaText } from '../../components/atoms/SazdaText/SazdaText';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { fontFamilies } from '../../theme/typography';
import { useThemePalette } from '../../theme/useThemePalette';
import { useAppStore } from '../../store/appStore';

const { width: W } = Dimensions.get('window');

type Page = {
  key: string;
  kicker: string;
  title: string;
  body: string;
  primaryLabel: string;
  Icon: typeof Clock;
  heroVariant: 'cardPrayer' | 'tileQuran' | 'bentoTools';
};

function DotGridBackground() {
  const { colors: c, scheme } = useThemePalette();
  const fillOpacity = scheme === 'dark' ? 0.06 : 0.035;
  const d =
    'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z';
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="p" patternUnits="userSpaceOnUse" width={60} height={60} viewBox="0 0 60 60">
            <G fill={c.primary} fillOpacity={fillOpacity}>
              <Path d={d} />
            </G>
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#p)" />
      </Svg>
    </View>
  );
}

function HeroCard({
  variant,
  Icon,
}: {
  variant: Page['heroVariant'];
  Icon: Page['Icon'];
}) {
  const { colors: c } = useThemePalette();

  if (variant === 'tileQuran') {
    return (
      <View style={styles.heroTileWrap}>
        <View style={[styles.heroTile, { backgroundColor: c.primaryContainer }]}>
          <View style={styles.heroTileDots} />
          <Icon size={56} color={c.secondaryContainer} strokeWidth={2.25} />
          <View style={[styles.heroBadge, { backgroundColor: c.secondaryContainer }]}>
            <BookOpen size={18} color={c.primary} strokeWidth={2.5} />
          </View>
        </View>
      </View>
    );
  }

  if (variant === 'bentoTools') {
    return (
      <View style={styles.bentoWrap}>
        <View style={[styles.bentoBig, { backgroundColor: 'rgba(255,255,255,0.92)' }]}>
          <View style={[styles.bentoCircle, { backgroundColor: c.primaryContainer }]}>
            <Compass size={28} color={c.secondaryContainer} strokeWidth={2.3} />
          </View>
          <View style={[styles.bentoLine, { backgroundColor: c.secondary }]} />
        </View>
        <View style={styles.bentoRightCol}>
          <View style={[styles.bentoPill, { backgroundColor: c.primaryContainer }]}>
            <Grid3x3 size={22} color={c.secondaryContainer} strokeWidth={2.2} />
            <View style={[styles.bentoLineSoft, { backgroundColor: 'rgba(251,251,226,0.18)' }]} />
          </View>
          <View style={[styles.bentoPill, { backgroundColor: c.secondaryContainer }]}>
            <View style={[styles.bentoHeart, { backgroundColor: c.primary }]} />
          </View>
        </View>
      </View>
    );
  }

  // cardPrayer
  return (
    <View style={styles.heroCardWrap}>
      <View style={[styles.heroCard, { backgroundColor: 'rgba(255,255,255,0.92)' }]}>
        <View style={styles.heroCardDots} />
        <View style={[styles.heroCircle, { backgroundColor: c.primaryContainer }]}>
          <Icon size={52} color={c.secondaryContainer} strokeWidth={2.25} />
        </View>
        <View style={styles.heroStarsRow}>
          <View style={[styles.star, { backgroundColor: c.secondary }]} />
          <View style={[styles.star, { backgroundColor: 'rgba(115,92,0,0.25)' }]} />
          <View style={[styles.star, { backgroundColor: c.secondary }]} />
        </View>
        <View style={[styles.heroChip, { backgroundColor: c.secondaryContainer }]}>
          <Clock size={16} color={c.primary} strokeWidth={2.5} />
          <SazdaText variant="label" color="primary" style={styles.heroChipText}>
            FAJR 05:12
          </SazdaText>
        </View>
      </View>
    </View>
  );
}

function PagerDot({ index, x }: { index: number; x: SharedValue<number> }) {
  const { colors: c } = useThemePalette();
  const style = useAnimatedStyle(() => {
    const p = x.value / W;
    const active = 1 - Math.min(1, Math.abs(p - index));
    const w = interpolate(active, [0, 1], [8, 28], Extrapolation.CLAMP);
    const op = interpolate(active, [0, 1], [0.25, 1], Extrapolation.CLAMP);
    return {
      width: w,
      opacity: op,
    };
  });

  return <Animated.View style={[styles.dot, { backgroundColor: c.primary }, style]} />;
}

export function OnboardingScreen() {
  const { colors: c, scheme } = useThemePalette();
  const completeOnboarding = useAppStore(s => s.completeOnboarding);

  const pages: Page[] = useMemo(
    () => [
      {
        key: 'prayer',
        kicker: 'Skip',
        title: 'Accurate Prayer\nTimes',
        body:
          'Stay connected to your daily\nprayers with precise timings\nbased on your location.',
        primaryLabel: 'Next',
        Icon: Clock,
        heroVariant: 'cardPrayer',
      },
      {
        key: 'quran',
        kicker: 'Skip',
        title: 'The Holy Quran',
        body:
          'Read, listen, and understand the\nDivine word with built-in\ntranslations and recitations.',
        primaryLabel: 'Next',
        Icon: BookOpen,
        heroVariant: 'tileQuran',
      },
      {
        key: 'tools',
        kicker: 'Skip',
        title: 'Spiritual Tools',
        body:
          'Access Qibla finder, Zakat\ncalculator, and build consistency\nwith your daily habits.',
        primaryLabel: 'Get Started',
        Icon: Compass,
        heroVariant: 'bentoTools',
      },
    ],
    [],
  );

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const x = useSharedValue(0);
  const pageIndexRef = useRef(0);

  const onScroll = useAnimatedScrollHandler({
    onScroll: e => {
      x.value = e.contentOffset.x;
    },
  });

  const goTo = useCallback(
    (i: number) => {
      pageIndexRef.current = i;
      scrollRef.current?.scrollTo({ x: i * W, y: 0, animated: true });
    },
    [scrollRef],
  );

  const onNext = useCallback(() => {
    const i = pageIndexRef.current;
    if (i >= pages.length - 1) {
      completeOnboarding();
      return;
    }
    goTo(i + 1);
  }, [completeOnboarding, goTo, pages.length]);

  const onBack = useCallback(() => {
    const i = pageIndexRef.current;
    if (i <= 0) return;
    goTo(i - 1);
  }, [goTo]);

  const onSkip = useCallback(() => {
    completeOnboarding();
  }, [completeOnboarding]);

  const topGlow = scheme === 'dark' ? 'rgba(149, 211, 186, 0.08)' : 'rgba(6, 78, 59, 0.07)';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.surface }]} edges={['top', 'bottom']}>
      <DotGridBackground />
      <View style={[styles.glow, { backgroundColor: topGlow }]} pointerEvents="none" />

      <View style={styles.topRow}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Back">
          <ChevronLeft size={22} color={c.primary} strokeWidth={2.5} />
        </Pressable>

        <Pressable
          onPress={onSkip}
          style={({ pressed }) => [styles.skipBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding">
          <SazdaText variant="label" color="secondary" style={styles.skipText}>
            Skip
          </SazdaText>
        </Pressable>
      </View>

      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
        onMomentumScrollEnd={e => {
          const i = Math.round(e.nativeEvent.contentOffset.x / W);
          pageIndexRef.current = i;
        }}>
        {pages.map((p, i) => (
          <OnboardingPage key={p.key} page={p} index={i} x={x} palettePrimary={c.primary} />
        ))}
      </Animated.ScrollView>

      <View style={styles.footer}>
        <View style={styles.dotsRow}>
          {pages.map((_, i) => (
            <PagerDot key={i} index={i} x={x} />
          ))}
        </View>

        <Pressable
          onPress={onNext}
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: c.primaryContainer },
            pressed && styles.ctaPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={pages[pageIndexRef.current]?.primaryLabel ?? 'Next'}>
          <SazdaText variant="label" color="onPrimary" style={styles.ctaText}>
            {pages[pageIndexRef.current]?.primaryLabel ?? 'Next'}
          </SazdaText>
          <ArrowRight size={18} color={c.onPrimary} strokeWidth={2.5} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function OnboardingPage({
  page,
  index,
  x,
  palettePrimary,
}: {
  page: Page;
  index: number;
  x: SharedValue<number>;
  palettePrimary: string;
}) {
  const { colors: c } = useThemePalette();

  const heroStyle = useAnimatedStyle(() => {
    const p = x.value / W;
    const d = p - index;
    const tx = interpolate(d, [-1, 0, 1], [38, 0, -38], Extrapolation.CLAMP);
    const op = interpolate(Math.abs(d), [0, 1], [1, 0.25], Extrapolation.CLAMP);
    const sc = interpolate(Math.abs(d), [0, 1], [1, 0.96], Extrapolation.CLAMP);
    return { transform: [{ translateX: tx }, { scale: sc }], opacity: op };
  });

  const textStyle = useAnimatedStyle(() => {
    const p = x.value / W;
    const d = p - index;
    const ty = interpolate(d, [-1, 0, 1], [18, 0, 18], Extrapolation.CLAMP);
    const op = interpolate(Math.abs(d), [0, 1], [1, 0.2], Extrapolation.CLAMP);
    return { transform: [{ translateY: ty }], opacity: op };
  });

  return (
    <View style={{ width: W, paddingHorizontal: spacing.lg }}>
      <View style={styles.heroArea}>
        <Animated.View style={heroStyle}>
          <HeroCard variant={page.heroVariant} Icon={page.Icon} />
        </Animated.View>
      </View>

      <Animated.View style={[styles.copy, textStyle]}>
        <SazdaText variant="headlineLarge" color="primary" style={styles.title}>
          {page.title}
        </SazdaText>
        <SazdaText variant="bodyMedium" color="onSurfaceVariant" style={styles.body}>
          {page.body}
        </SazdaText>
      </Animated.View>

      <View style={styles.spacer} />
      <View style={[styles.sheet, { backgroundColor: 'rgba(255,255,255,0.92)', borderColor: `${palettePrimary}10` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  glow: {
    position: 'absolute',
    top: -120,
    left: -80,
    right: -80,
    height: 260,
    borderBottomLeftRadius: 999,
    borderBottomRightRadius: 999,
    opacity: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    minHeight: 44,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  skipBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  skipText: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  pressed: { opacity: 0.85 },

  heroArea: {
    marginTop: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 340,
  },
  copy: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  title: {
    fontSize: 38,
    lineHeight: 42,
    fontWeight: '900',
    letterSpacing: -1.2,
    fontFamily: fontFamilies.headline,
  },
  body: {
    marginTop: spacing.md,
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.9,
  },
  spacer: { flex: 1 },
  sheet: {
    height: 1,
    borderWidth: 0,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    minHeight: 18,
  },
  dot: {
    height: 8,
    borderRadius: 999,
  },
  cta: {
    height: 56,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    shadowColor: 'rgba(0,0,0,0.12)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 8,
  },
  ctaPressed: { opacity: 0.92 },
  ctaText: {
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  // Hero shapes
  heroCardWrap: {
    width: 300,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    width: 280,
    height: 240,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroCardDots: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.08,
  },
  heroCircle: {
    width: 108,
    height: 108,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroStarsRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 18,
  },
  star: {
    width: 16,
    height: 16,
    borderRadius: 4,
    transform: [{ rotate: '45deg' }],
  },
  heroChip: {
    position: 'absolute',
    right: 24,
    bottom: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroChipText: { fontWeight: '900', letterSpacing: 1.2, fontSize: 10 },

  heroTileWrap: {
    width: 300,
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTile: {
    width: 260,
    height: 260,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: 'rgba(0,0,0,0.12)',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 10,
  },
  heroTileDots: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.08,
  },
  heroBadge: {
    position: 'absolute',
    right: 18,
    bottom: 18,
    width: 48,
    height: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.8)',
  },

  bentoWrap: {
    width: 320,
    height: 260,
    flexDirection: 'row',
    gap: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoBig: {
    width: 182,
    height: 182,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  bentoCircle: {
    width: 64,
    height: 64,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoLine: {
    width: 70,
    height: 4,
    borderRadius: 999,
  },
  bentoRightCol: {
    width: 120,
    gap: 18,
  },
  bentoPill: {
    width: 120,
    height: 118,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  bentoLineSoft: {
    width: 38,
    height: 5,
    borderRadius: 999,
  },
  bentoHeart: {
    width: 18,
    height: 18,
    borderRadius: 6,
    transform: [{ rotate: '45deg' }],
  },
});

