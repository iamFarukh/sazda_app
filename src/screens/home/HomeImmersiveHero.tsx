import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Award } from 'lucide-react-native';
import { PrayerAtmosphere } from '../../components/molecules/PrayerScene/PrayerAtmosphere';
import { spacing } from '../../theme/spacing';
import { fontFamilies, getFontConfig } from '../../theme/typography';
import type { PrayerHeroPeriod } from '../../utils/prayerSchedule';

const BOTTOM_RADIUS = 34;
/** Height of the nav chrome row (TabLandingHeader denseBottom) — streak sits just below it. */
const NAV_ROW_HEIGHT = 52;

type Props = {
  /** Drives the sky + Lottie accent. */
  period: PrayerHeroPeriod;
  /** Full pixel height of the immersive section (~58% of screen). */
  height: number;
  /** Safe-area top inset — content starts below it; the atmosphere fills behind it. */
  topInset: number;
  streakCount: number;
  /** Gold accent for the active sky. */
  highlight: string;
  /** Nav chrome + page title + greeting + date (rendered in white by the caller). */
  header: ReactNode;
  /** Bottom-anchored prayer content (or a loading / permission / error block). */
  children: ReactNode;
};

/**
 * Full-bleed, edge-to-edge immersive header for the home screen. The period atmosphere
 * (animated sky + original Lottie accent + readability scrim) runs from under the status
 * bar down to a rounded bottom edge. Header chrome sits at the top, prayer content anchors
 * to the bottom, and a salah-streak badge floats top-right.
 */
export function HomeImmersiveHero({
  period,
  height,
  topInset,
  streakCount,
  highlight,
  header,
  children,
}: Props) {
  return (
    <View style={[styles.hero, { minHeight: height }]}>
      <PrayerAtmosphere period={period} borderRadius={0} />

      <View style={[styles.inner, { paddingTop: topInset + spacing.xs }]}>
        {header}

        <View
          pointerEvents="none"
          style={[styles.streak, { top: topInset + NAV_ROW_HEIGHT + spacing.lg }]}
          accessibilityLabel={`Salah streak ${streakCount} full days in a row`}>
          <Award size={14} color={highlight} strokeWidth={2.25} />
          <Text style={[styles.streakNum, { color: highlight }]}>
            {streakCount}
          </Text>
        </View>

        <View style={styles.spacer} />
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    position: 'relative',
    width: '100%',
    borderBottomLeftRadius: BOTTOM_RADIUS,
    borderBottomRightRadius: BOTTOM_RADIUS,
    overflow: 'hidden',
    backgroundColor: '#06231f',
  },
  inner: {
    flex: 1,
    zIndex: 2,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  spacer: { flex: 1, minHeight: spacing.lg },
  streak: {
    position: 'absolute',
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
    backgroundColor: 'rgba(0,0,0,0.22)',
    zIndex: 4,
  },
  streakNum: {
    ...getFontConfig(fontFamilies.headline, '800'),
    fontSize: 15,
    letterSpacing: -0.35,
  },
});
