import { useEffect, useId, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';
import { AlertTriangle, Clock3 } from 'lucide-react-native';
import { SazdaText } from '../../components/atoms/SazdaText/SazdaText';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { fontFamilies, platformFontWeight } from '../../theme/typography';
import type { AppPalette } from '../../theme/useThemePalette';
import type { ResolvedScheme } from '../../theme/useThemePalette';
import type { PrayerHeroState } from '../../utils/prayerSchedule';
import { formatCountdown, formatTime12h } from '../../utils/prayerSchedule';

type HomeHeroStyles = ReturnType<typeof createDualHeroStyles>;

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
  palette: AppPalette;
  scheme: ResolvedScheme;
  styles: HomeHeroStyles;
};

const TRANSITION_MS = 520;

/** Diamond tile like Stitch `makruh.html` `.bg-pattern` */
function MakruhCardPattern({ color }: { color: string }) {
  const uid = useId().replace(/:/g, '');
  const pid = `mkpat-${uid}`;
  const d = 'M30 0l15 30-15 30-15-30z';
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id={pid} patternUnits="userSpaceOnUse" width={60} height={60}>
            <Path d={d} fill={color} fillOpacity={0.04} fillRule="evenodd" />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${pid})`} />
      </Svg>
    </View>
  );
}

export function HomePrayerHeroAnimated({
  hero,
  prayerKicker,
  currentPrayerLabel,
  currentPrayerTimeLabel,
  nextPrayerLabel,
  countdownLabel,
  prayerPeriodNote,
  methodNote,
  locationLine,
  palette: c,
  scheme,
  styles: s,
}: Props) {
  const isMakruh = hero.currentPeriod.startsWith('Makruh');
  const isBetweenPrayers = hero.currentPeriod === 'BetweenFajrDhuhr';
  const p = useSharedValue(isMakruh ? 1 : 0);

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

  useEffect(() => {
    p.value = withTiming(isMakruh ? 1 : 0, {
      duration: TRANSITION_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [isMakruh, p]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: isBetweenPrayers ? 0 : 0.12 * (1 - p.value),
  }));

  const standardStyle = useAnimatedStyle(() => ({
    opacity: 1 - p.value,
    transform: [{ scale: 1 - p.value * 0.02 }],
  }));

  const makruhStyle = useAnimatedStyle(() => ({
    opacity: p.value,
  }));

  const standardOn =
    scheme === 'dark' ? 'onPrimaryContainer' : 'onPrimary';

  const standardAccent =
    scheme === 'dark' ? 'secondary' : 'secondaryContainer';

  const standardAccentHex =
    scheme === 'dark' ? c.secondary : c.secondaryContainer;

  const countdownBaseHex =
    scheme === 'dark' ? c.onPrimaryContainer : c.onPrimary;

  const waitRemaining =
    countdownLabel === 'Now' ? 'Now' : `${formatCountdown(hero.countdownMs)} remaining`;
  const nextAtLine = `${nextPrayerLabel} at ${formatTime12h(hero.nextPrayerAt)}`;

  const makruhInk = c.onSecondaryContainer;
  const patternInk = c.primaryContainer;

  return (
    <View style={s.dualWrap}>
      {/* Standard hero — in document flow so the section reserves full height (fixes quick-action overlap). */}
      <Animated.View style={[s.standardColumn, standardStyle]} pointerEvents={isMakruh ? 'none' : 'auto'}>
        <View style={s.standardInner}>
          <Animated.View style={[s.prayerGlow, glowStyle]} pointerEvents="none" />
          <View style={[s.prayerCard, isBetweenPrayers && s.betweenStitchCard]}>
            {isBetweenPrayers ? (
              <>
                <MakruhCardPattern color={c.primary} />
                <View style={s.betweenWatermark} pointerEvents="none">
                  <AlertTriangle
                    size={88}
                    color={c.secondary}
                    fill={c.secondary}
                    strokeWidth={1.2}
                  />
                </View>
                <View style={s.betweenStitchInner}>
                  <View style={s.makruhBadgeRow}>
                    <View style={[s.makruhBadge, s.betweenBadgeCompact, { backgroundColor: c.secondary }]}>
                      <Text style={s.betweenBadgeText}>{prayerKicker.toUpperCase()}</Text>
                    </View>
                    <Clock3 size={18} color={c.secondary} strokeWidth={2.25} />
                  </View>
                  <Text style={[s.betweenTitle, { color: c.onSecondaryContainer }]}>
                    {currentPrayerLabel}
                  </Text>
                  {currentPrayerTimeLabel ? (
                    <Text style={[s.betweenTimeLine, { color: c.primary }]}>
                      {currentPrayerTimeLabel}
                    </Text>
                  ) : null}
                  {prayerPeriodNote ? (
                    <Text style={[s.betweenBody, { color: c.onSecondaryContainer }]}>
                      {prayerPeriodNote}
                    </Text>
                  ) : null}
                  <View
                    style={[
                      s.betweenPrayersDivider,
                      {
                        borderTopColor:
                          scheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(115, 92, 0, 0.1)',
                      },
                    ]}>
                    <View style={s.makruhStatCol}>
                      <Text style={[s.betweenStatLabel, { color: c.onSecondaryContainer }]}>
                        Wait time
                      </Text>
                      <Text style={[s.betweenStatValue, { color: c.primary }]}>{waitRemaining}</Text>
                    </View>
                    <View style={[s.makruhStatCol, s.makruhStatColRight]}>
                      <Text style={[s.betweenStatLabel, { color: c.onSecondaryContainer }]}>
                        Next prayer
                      </Text>
                      <Text style={[s.betweenNextValue, { color: c.primary }]}>{nextAtLine}</Text>
                    </View>
                  </View>
                  <SazdaText variant="caption" style={[s.betweenFoot, { color: c.onSecondaryContainer }]}>
                    {methodNote}
                  </SazdaText>
                  <SazdaText variant="caption" style={[s.betweenFootMuted, { color: c.onSecondaryContainer }]}>
                    {locationLine}
                  </SazdaText>
                </View>
              </>
            ) : (
              <>
                <SazdaText variant="label" color={standardOn} style={s.prayerKicker}>
                  {prayerKicker}
                </SazdaText>
                <View style={s.prayerTitleRow}>
                  <SazdaText variant="displayLg" color={standardOn} style={s.prayerName}>
                    {currentPrayerLabel}
                  </SazdaText>
                  <SazdaText variant="headlineLarge" color={standardAccent} style={s.prayerTime}>
                    {currentPrayerTimeLabel}
                  </SazdaText>
                </View>
                <View style={s.countdownPill}>
                  <Clock3 size={18} color={standardAccentHex} strokeWidth={2} />
                  <Text style={[s.countdownText, { color: countdownBaseHex }]}>
                    Time to {nextPrayerLabel}:{' '}
                    <Text style={[s.countdownHighlight, { color: standardAccentHex }]}>
                      {countdownLabel}
                    </Text>
                  </Text>
                </View>
                {prayerPeriodNote ? (
                  <SazdaText variant="caption" color={standardOn} style={s.prayerPeriodNote}>
                    {prayerPeriodNote}
                  </SazdaText>
                ) : null}
                <SazdaText variant="caption" color={standardOn} style={s.prayerFootnote}>
                  {methodNote}
                </SazdaText>
                <SazdaText variant="caption" color={standardOn} style={s.prayerFootnoteMuted}>
                  {locationLine}
                </SazdaText>
              </>
            )}
          </View>
        </View>
      </Animated.View>

      {/* Makruh — overlays the same footprint; vertically centered (Stitch reference). */}
      <Animated.View
        style={[s.makruhOverlay, makruhStyle]}
        pointerEvents={isMakruh ? 'box-none' : 'none'}>
        <View style={s.makruhCenter}>
          <View style={[s.makruhCard, { backgroundColor: '#fed65b' }]}>
            <MakruhCardPattern color="#064e3b" />
            <View style={s.makruhWatermark} pointerEvents="none">
              <Svg width={150} height={150} viewBox="0 0 24 24" fill="#735c00">
                <Path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
              </Svg>
            </View>
            <View style={s.makruhInner}>
              <View style={s.makruhBadgeRow}>
                <View style={[s.makruhBadge, { backgroundColor: '#735c00' }]}>
                  <SazdaText variant="label" style={s.makruhBadgeText}>
                    CURRENTLY PROHIBITED
                  </SazdaText>
                </View>
                <Clock3 size={20} color="#735c00" strokeWidth={2.5} />
              </View>
              <SazdaText variant="headlineMedium" style={[s.makruhTitle, { color: '#745c00' }]}>
                {makruhDetails.title}
              </SazdaText>
              <SazdaText variant="bodyMedium" style={[s.makruhBody, { color: '#745c00' }]}>
                {makruhDetails.body}
              </SazdaText>
              <View style={[s.makruhDivider, { borderTopColor: 'rgba(115,92,0,0.1)' }]}>
                <View style={s.makruhStatCol}>
                  <SazdaText variant="caption" style={[s.makruhStatLabel, { color: '#745c00' }]}>
                    Wait time
                  </SazdaText>
                  <SazdaText variant="titleSm" style={[s.makruhStatValue, { color: '#003527' }]}>
                    {waitRemaining}
                  </SazdaText>
                </View>
                <View style={[s.makruhStatCol, s.makruhStatColRight]}>
                  <SazdaText variant="caption" style={[s.makruhStatLabel, { color: '#745c00' }]}>
                    Next prayer
                  </SazdaText>
                  <SazdaText variant="titleSm" style={[s.makruhNextValue, { color: '#003527' }]}>
                    {nextAtLine}
                  </SazdaText>
                </View>
              </View>
              {/* Optional footnotes mapped in primary color for legibility */}
              <SazdaText variant="caption" style={[s.makruhFoot, { color: '#745c00' }]}>
                {methodNote}
              </SazdaText>
              <SazdaText variant="caption" style={[s.makruhFootMuted, { color: '#745c00' }]}>
                {locationLine}
              </SazdaText>
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

export type DualHeroStyleOptions = {
  /** Fajr ended, before Dhuhr — warm gold hero (Stitch “between prayers”). */
  betweenPrayers?: boolean;
};

export function createDualHeroStyles(
  c: AppPalette,
  scheme: ResolvedScheme,
  opts?: DualHeroStyleOptions,
) {
  const between = opts?.betweenPrayers === true;

  const heroFill = between
    ? c.secondaryContainer
    : scheme === 'dark'
      ? c.primaryContainer
      : c.primary;

  const cardShadow = between
    ? scheme === 'dark'
      ? 'rgba(0,0,0,0.45)'
      : 'rgba(115, 92, 0, 0.22)'
    : scheme === 'dark'
      ? 'rgba(0,0,0,0.35)'
      : 'rgba(6, 78, 59, 0.25)';
  const makruhShadow = scheme === 'dark' ? 'rgba(0,0,0,0.45)' : 'rgba(115, 92, 0, 0.14)';

  const subMutedOpacity = 0.58;
  const footMutedOpacity = 0.65;

  return StyleSheet.create({
    dualWrap: {
      position: 'relative',
      width: '100%',
      overflow: 'visible',
    },
    standardColumn: {
      width: '100%',
    },
    standardInner: {
      position: 'relative',
      width: '100%',
    },
    prayerGlow: {
      position: 'absolute',
      left: -4,
      right: -4,
      top: 4,
      bottom: -8,
      backgroundColor: between
        ? scheme === 'dark'
          ? 'rgba(228, 199, 101, 0.28)'
          : 'rgba(115, 92, 0, 0.2)'
        : c.secondaryContainer,
      borderRadius: radius.md + 8,
    },
    makruhOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      justifyContent: 'center',
      zIndex: 4,
    },
    makruhCenter: {
      width: '100%',
      paddingVertical: spacing.xs,
    },
    prayerCard: {
      backgroundColor: heroFill,
      borderRadius: radius.md + 8,
      padding: spacing.xl,
      alignItems: 'center',
      shadowColor: cardShadow,
      shadowOpacity: 1,
      shadowRadius: 40,
      shadowOffset: { width: 0, height: 12 },
      elevation: 10,
    },
    /** Stitch `makruh.html` amber status card — between-prayers home hero. */
    betweenStitchCard: {
      alignItems: 'flex-start',
      overflow: 'hidden',
      alignSelf: 'stretch',
      width: '100%',
      paddingTop: spacing.md,
      paddingBottom: spacing.md,
      paddingLeft: spacing.lg,
      paddingRight: spacing.lg,
      shadowColor: between
        ? scheme === 'dark'
          ? 'rgba(0,0,0,0.45)'
          : 'rgba(115, 92, 0, 0.1)'
        : cardShadow,
      shadowOffset: { width: 0, height: between ? 16 : 12 },
      shadowRadius: between ? 22 : 40,
      elevation: between ? 12 : 10,
    },
    betweenWatermark: {
      position: 'absolute',
      right: -24,
      top: -24,
      opacity: 0.1,
    },
    betweenStitchInner: {
      width: '100%',
      gap: spacing.xs,
      zIndex: 2,
    },
    betweenBadgeCompact: {
      paddingVertical: 3,
      paddingHorizontal: 10,
    },
    betweenBadgeText: {
      fontFamily: fontFamilies.body,
      fontSize: 9,
      fontWeight: platformFontWeight('800'),
      letterSpacing: 1.6,
      textTransform: 'uppercase',
      color: c.white,
    },
    betweenTitle: {
      fontFamily: fontFamilies.headline,
      fontSize: 20,
      fontWeight: platformFontWeight('800'),
      letterSpacing: -0.35,
      marginTop: 0,
      lineHeight: 24,
    },
    betweenTimeLine: {
      fontFamily: fontFamilies.headline,
      fontSize: 17,
      fontWeight: platformFontWeight('900'),
      letterSpacing: -0.45,
      marginTop: 0,
      lineHeight: 22,
    },
    betweenBody: {
      fontFamily: fontFamilies.body,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 0,
      opacity: 0.85,
      paddingRight: spacing.sm,
    },
    betweenPrayersDivider: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginTop: spacing.sm,
      paddingTop: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      gap: spacing.md,
    },
    betweenStatLabel: {
      opacity: 0.62,
      fontWeight: platformFontWeight('800'),
      letterSpacing: 1.6,
      fontSize: 10,
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    betweenStatValue: {
      fontFamily: fontFamilies.headline,
      fontWeight: platformFontWeight('900'),
      fontSize: 17,
      letterSpacing: -0.4,
      lineHeight: 22,
    },
    betweenNextValue: {
      fontFamily: fontFamilies.headline,
      fontWeight: platformFontWeight('800'),
      fontSize: 14,
      letterSpacing: -0.25,
      textAlign: 'right',
      lineHeight: 18,
      marginTop: 2,
    },
    betweenFoot: {
      marginTop: spacing.sm,
      opacity: 0.75,
      textAlign: 'center',
      fontSize: 11,
      lineHeight: 15,
    },
    betweenFootMuted: {
      marginTop: spacing.xxs,
      opacity: subMutedOpacity,
      textAlign: 'center',
      fontSize: 10,
      lineHeight: 14,
    },
    prayerKicker: {
      opacity: 0.85,
      marginBottom: spacing.md,
      letterSpacing: 2,
    },
    prayerTitleRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    prayerName: {
      fontSize: 44,
      lineHeight: 48,
    },
    prayerTime: {
      fontSize: 26,
    },
    countdownPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.lg,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm + 2,
      borderRadius: radius.full,
      backgroundColor: between
        ? scheme === 'dark'
          ? 'rgba(255,255,255,0.1)'
          : 'rgba(0, 53, 39, 0.12)'
        : scheme === 'dark'
          ? 'rgba(255,255,255,0.06)'
          : 'rgba(255,255,255,0.08)',
    },
    countdownText: {
      fontFamily: fontFamilies.body,
      fontSize: 14,
      fontWeight: platformFontWeight('600'),
    },
    countdownHighlight: {
      fontFamily: fontFamilies.body,
      fontSize: 14,
      fontWeight: platformFontWeight('600'),
    },
    prayerPeriodNote: {
      marginTop: spacing.sm,
      paddingHorizontal: spacing.md,
      opacity: 0.88,
      textAlign: 'center',
      lineHeight: 18,
      fontSize: 11,
    },
    prayerFootnote: {
      marginTop: spacing.md,
      opacity: 0.9,
      textAlign: 'center',
    },
    prayerFootnoteMuted: {
      marginTop: spacing.xs,
      opacity: footMutedOpacity,
      textAlign: 'center',
      fontSize: 11,
    },

    makruhCard: {
      borderRadius: radius.md + 8,
      overflow: 'hidden',
      paddingVertical: spacing.lg + 2,
      paddingHorizontal: spacing.lg,
      maxWidth: '100%',
      alignSelf: 'center',
      width: '100%',
      shadowColor: makruhShadow,
      shadowOpacity: 1,
      shadowRadius: 28,
      shadowOffset: { width: 0, height: 14 },
      elevation: 9,
    },
    makruhWatermark: {
      position: 'absolute',
      right: -30,
      top: -30,
      opacity: 0.1,
    },
    makruhInner: {
      gap: spacing.sm,
    },
    makruhBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    makruhBadge: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 99,
    },
    makruhBadgeText: {
      fontWeight: platformFontWeight('700'),
      letterSpacing: 2.0,
      fontSize: 10,
      color: '#ffffff',
    },
    makruhTitle: {
      fontWeight: platformFontWeight('800'),
      fontSize: 24,
      letterSpacing: -0.4,
      marginTop: spacing.xs,
    },
    makruhBody: {
      opacity: 0.88,
      lineHeight: 22,
      fontSize: 15,
      marginTop: 2,
      paddingRight: spacing.sm,
    },
    makruhDivider: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginTop: spacing.md,
      paddingTop: spacing.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      gap: spacing.md,
    },
    makruhStatCol: {
      flex: 1,
      minWidth: 0,
    },
    makruhStatColRight: {
      alignItems: 'flex-end',
    },
    makruhStatLabel: {
      opacity: 0.62,
      fontWeight: platformFontWeight('800'),
      letterSpacing: 1.2,
      fontSize: 9,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    makruhStatValue: {
      fontWeight: platformFontWeight('900'),
      fontSize: 19,
      letterSpacing: -0.45,
    },
    makruhNextValue: {
      fontWeight: platformFontWeight('800'),
      fontSize: 16,
      letterSpacing: -0.25,
      textAlign: 'right',
    },
    makruhFoot: {
      marginTop: spacing.md,
      opacity: 0.72,
      textAlign: 'center',
      fontSize: 11,
    },
    makruhFootMuted: {
      opacity: subMutedOpacity,
      textAlign: 'center',
      fontSize: 10,
    },
  });
}
