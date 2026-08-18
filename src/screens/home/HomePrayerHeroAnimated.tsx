import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useReducedMotion,
} from 'react-native-reanimated';
import { AlertTriangle, Clock3 } from 'lucide-react-native';
import { SazdaText } from '../../components/atoms/SazdaText/SazdaText';
import { ProgressRing } from '../../components/atoms/ProgressRing/ProgressRing';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { fontFamilies, getFontConfig } from '../../theme/typography';
import type { PrayerHeroState } from '../../utils/prayerSchedule';
import { formatCountdown, formatTime12h } from '../../utils/prayerSchedule';

type ContentStyles = ReturnType<typeof createPrayerContentStyles>;

type Props = {
  hero: PrayerHeroState;
  prayerKicker: string;
  currentPrayerLabel: string;
  currentPrayerTimeLabel: string;
  nextPrayerLabel: string;
  countdownLabel: string;
  prayerPeriodNote: string | null;
  methodNote: string;
  locationLine: string;
  /** Gold accent for the active sky (from resolvePrayerAtmosphere). */
  highlight: string;
  styles: ContentStyles;
};

/** Light ink that always reads on the (dark, saturated) sky. */
const INK = '#ffffff';
const INK_SOFT = 'rgba(255,255,255,0.82)';
const INK_MUTED = 'rgba(255,255,255,0.64)';

/**
 * Bottom-anchored, left-aligned prayer content for the immersive home hero. Transparent —
 * the parent (<HomeImmersiveHero>) provides the atmosphere + readability scrim. Crossfades
 * its content when the prayer period changes (also serves as the mount entrance).
 */
export function PrayerHeroContent({
  hero,
  prayerKicker,
  currentPrayerLabel,
  currentPrayerTimeLabel,
  nextPrayerLabel,
  countdownLabel,
  prayerPeriodNote,
  methodNote,
  locationLine,
  highlight,
  styles: s,
}: Props) {
  const isMakruh = hero.currentPeriod.startsWith('Makruh');
  const isBetweenPrayers = hero.currentPeriod === 'BetweenFajrDhuhr';
  const reduceMotion = useReducedMotion();

  const makruhDetails = useMemo(() => {
    switch (hero.currentPeriod) {
      case 'MakruhSunrise':
        return {
          title: 'Sunrise (Ishraq)',
          body: 'Prohibited from the start of the sun rising until it reaches the height of a spear.',
        };
      case 'MakruhSunset':
        return {
          title: 'Sunset (Ghurub)',
          body: 'Starts when the sun turns yellow/pale until it disappears.',
        };
      case 'MakruhBeforeDhuhr':
      default:
        return {
          title: 'Midday (zawāl)',
          body: 'The sun is at its highest point in the sky.',
        };
    }
  }, [hero.currentPeriod]);

  const waitRemaining =
    countdownLabel === 'Now'
      ? 'Now'
      : `${formatCountdown(hero.countdownMs)} remaining`;
  const nextAtLine = `${nextPrayerLabel} at ${formatTime12h(hero.nextPrayerAt)}`;

  const StatPair = (
    <View style={s.statRow}>
      <View style={s.statCol}>
        <Text style={s.statLabel}>Wait time</Text>
        <Text style={[s.statValue, { color: highlight }]}>{waitRemaining}</Text>
      </View>
      <View style={[s.statCol, s.statColRight]}>
        <Text style={s.statLabel}>Next prayer</Text>
        <Text style={[s.statValueSm, { color: highlight }]}>{nextAtLine}</Text>
      </View>
    </View>
  );

  return (
    <Animated.View
      key={hero.currentPeriod}
      entering={reduceMotion ? undefined : FadeIn.duration(460)}
      exiting={reduceMotion ? undefined : FadeOut.duration(260)}
      layout={reduceMotion ? undefined : LinearTransition.duration(420)}
      style={s.block}>
      {isMakruh ? (
        <>
          <View style={[s.kickerChip, s.kickerChipFill]}>
            <Text style={[s.kickerText, { color: highlight }]}>MAKRUH</Text>
            <AlertTriangle size={13} color={highlight} strokeWidth={2.5} />
          </View>
          <Text style={[s.contextLine, { color: INK_SOFT }]}>
            Optional prayer is discouraged during this window — follow your madhhab.
          </Text>
          <Text style={s.titleLg}>{makruhDetails.title}</Text>
          <Text style={[s.body, { color: INK_SOFT }]}>{makruhDetails.body}</Text>
          {StatPair}
          <Text style={[s.foot, { color: INK_SOFT }]}>{methodNote}</Text>
          <Text style={[s.footMuted, { color: INK_MUTED }]}>{locationLine}</Text>
        </>
      ) : isBetweenPrayers ? (
        <>
          <View style={[s.kickerChip, s.kickerChipFill]}>
            <Text style={[s.kickerText, { color: highlight }]}>
              {prayerKicker.toUpperCase()}
            </Text>
            <Clock3 size={13} color={highlight} strokeWidth={2.5} />
          </View>
          <Text style={s.titleLg}>{currentPrayerLabel}</Text>
          {currentPrayerTimeLabel ? (
            <Text style={[s.timeLine, { color: highlight }]}>
              {currentPrayerTimeLabel}
            </Text>
          ) : null}
          {prayerPeriodNote ? (
            <Text style={[s.body, { color: INK_SOFT }]}>{prayerPeriodNote}</Text>
          ) : null}
          {StatPair}
          <Text style={[s.foot, { color: INK_SOFT }]}>{methodNote}</Text>
          <Text style={[s.footMuted, { color: INK_MUTED }]}>{locationLine}</Text>
        </>
      ) : (
        <>
          <View style={[s.kickerChip, s.kickerChipFill]}>
            <Text style={[s.kickerText, { color: highlight }]}>
              {prayerKicker.toUpperCase()}
            </Text>
            <Clock3 size={13} color={highlight} strokeWidth={2.5} />
          </View>
          <View style={s.titleRow}>
            <SazdaText variant="displayLg" style={s.prayerName}>
              {currentPrayerLabel}
            </SazdaText>
            <Text style={[s.prayerTime, { color: highlight }]}>
              {currentPrayerTimeLabel}
            </Text>
          </View>
          <View style={s.countdownPill}>
            <ProgressRing
              size={22}
              strokeWidth={2.5}
              startMs={hero.currentPeriodStart.getTime()}
              endMs={hero.nextPrayerAt.getTime()}
              trackColor="rgba(255,255,255,0.28)"
              progressColor={highlight}>
              <Clock3 size={11} color={highlight} strokeWidth={2} />
            </ProgressRing>
            <Text style={s.countdownText}>
              Time to {nextPrayerLabel}:{' '}
              <Text style={[s.countdownHighlight, { color: highlight }]}>
                {countdownLabel}
              </Text>
            </Text>
          </View>
          {prayerPeriodNote ? (
            <Text style={[s.periodNote, { color: INK_SOFT }]}>
              {prayerPeriodNote}
            </Text>
          ) : null}
          <Text style={[s.foot, { color: INK_SOFT }]}>{methodNote}</Text>
          <Text style={[s.footMuted, { color: INK_MUTED }]}>{locationLine}</Text>
        </>
      )}
    </Animated.View>
  );
}

export function createPrayerContentStyles() {
  return StyleSheet.create({
    block: {
      alignItems: 'flex-start',
      gap: spacing.xs,
    },

    // glass kicker chip (all states)
    kickerChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 99,
      marginBottom: spacing.xs,
    },
    kickerChipFill: {
      backgroundColor: 'rgba(0,0,0,0.24)',
    },
    kickerText: {
      ...getFontConfig(fontFamilies.body, '800'),
      letterSpacing: 1.8,
      fontSize: 10,
    },

    // standard
    titleRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    prayerName: {
      color: INK,
      fontSize: 46,
      lineHeight: 50,
      textShadowColor: 'rgba(0,0,0,0.3)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 16,
    },
    prayerTime: {
      ...getFontConfig(fontFamilies.headline, '800'),
      fontSize: 26,
      letterSpacing: -0.4,
    },
    countdownPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      backgroundColor: 'rgba(255,255,255,0.13)',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255,255,255,0.22)',
    },
    countdownText: {
      ...getFontConfig(fontFamilies.body, '600'),
      fontSize: 14,
      color: INK,
    },
    countdownHighlight: {
      ...getFontConfig(fontFamilies.body, '700'),
      fontSize: 14,
    },
    periodNote: {
      marginTop: spacing.sm,
      lineHeight: 18,
      fontSize: 11,
      fontFamily: fontFamilies.body,
    },

    // makruh / between
    contextLine: {
      ...getFontConfig(fontFamilies.body, '600'),
      fontSize: 12,
      lineHeight: 17,
    },
    titleLg: {
      ...getFontConfig(fontFamilies.headline, '800'),
      fontSize: 30,
      letterSpacing: -0.6,
      color: INK,
      textShadowColor: 'rgba(0,0,0,0.3)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 16,
    },
    timeLine: {
      ...getFontConfig(fontFamilies.headline, '400'),
      fontSize: 22,
      letterSpacing: -0.3,
    },
    body: {
      fontFamily: fontFamilies.body,
      fontSize: 13,
      lineHeight: 19,
      maxWidth: 300,
    },
    statRow: {
      flexDirection: 'row',
      alignSelf: 'stretch',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginTop: spacing.sm,
      paddingTop: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: 'rgba(255,255,255,0.16)',
      gap: spacing.md,
    },
    statCol: { flex: 1, minWidth: 0 },
    statColRight: { alignItems: 'flex-end' },
    statLabel: {
      ...getFontConfig(fontFamilies.body, '800'),
      color: INK_MUTED,
      letterSpacing: 1.4,
      fontSize: 10,
      textTransform: 'uppercase',
      marginBottom: 3,
    },
    statValue: {
      ...getFontConfig(fontFamilies.headline, '900'),
      fontSize: 17,
      letterSpacing: -0.4,
    },
    statValueSm: {
      ...getFontConfig(fontFamilies.headline, '800'),
      fontSize: 14,
      letterSpacing: -0.25,
      textAlign: 'right',
    },

    // footnotes (all states)
    foot: {
      marginTop: spacing.md,
      fontSize: 11,
      lineHeight: 15,
      fontFamily: fontFamilies.body,
    },
    footMuted: {
      marginTop: spacing.xxs,
      fontSize: 10,
      lineHeight: 14,
      fontFamily: fontFamilies.body,
    },
  });
}
