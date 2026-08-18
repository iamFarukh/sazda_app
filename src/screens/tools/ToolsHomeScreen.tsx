import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarDays,
  Compass,
  Globe,
  Hash,
  HandCoins,
  ListChecks,
  Quote,
  ScrollText,
} from 'lucide-react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { TabLandingHeader } from '../../components/organisms/TabLandingHeader';
import { SazdaText } from '../../components/atoms/SazdaText/SazdaText';
import { PressableScale } from '../../components/atoms/PressableScale/PressableScale';
import {
  DuasMotif,
  HijriMotif,
  QiblaRaysDeco,
  TasbeehMotif,
  TrackerMotif,
  ZakatMotif,
  useSlowSpin,
} from '../../components/molecules/ToolMotifs/ToolMotifs';
import { usePrayerTimesHome } from '../../hooks/usePrayerTimesHome';
import type { ToolsStackParamList } from '../../navigation/types';
import { fetchGregorianToHijri } from '../../services/hijriCalendarApi';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import type { AppPalette } from '../../theme/useThemePalette';
import type { ResolvedScheme } from '../../theme/useThemePalette';
import { useThemePalette } from '../../theme/useThemePalette';

type Nav = NativeStackNavigationProp<ToolsStackParamList, 'ToolsMain'>;

const DAILY_WISDOM_QUOTES = [
  { text: 'Verily, with hardship comes ease.', ref: 'Surah Ash-Sharh 94:5' },
  { text: 'Verily, in the remembrance of Allah do hearts find rest.', ref: 'Surah Ar-Ra\'d 13:28' },
  { text: 'And whoever relies upon Allah - then He is sufficient for him.', ref: 'Surah At-Talaq 65:3' },
  { text: 'So be patient. Indeed, the promise of Allah is truth.', ref: 'Surah Ar-Rum 30:60' },
  { text: 'He knows what is within the breasts.', ref: 'Surah Al-Mulk 67:13' },
  { text: 'And My mercy encompasses all things.', ref: 'Surah Al-A\'raf 7:156' },
  { text: 'Allah is with the patient.', ref: 'Surah Al-Baqarah 2:153' },
  { text: 'Call upon Me; I will respond to you.', ref: 'Surah Ghafir 40:60' },
  { text: 'The most beloved of deeds to Allah are those that are most consistent, even if it is small.', ref: 'Sahih al-Bukhari 6464' },
  { text: 'Richness is not having many possessions, but richness is being content with oneself.', ref: 'Sahih Muslim 1051' },
];

function getDailyWisdom(dateKey: string) {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) % 1000;
  }
  return DAILY_WISDOM_QUOTES[hash % DAILY_WISDOM_QUOTES.length];
}

export function ToolsHomeScreen() {
  const navigation = useNavigation<Nav>();
  const { colors: c, scheme } = useThemePalette();
  const styles = useMemo(() => createToolsStyles(c, scheme), [c, scheme]);
  const isFocused = useIsFocused();
  const reducedMotion = useReducedMotion();
  const motionActive = isFocused && !reducedMotion;
  const qiblaSpin = useSlowSpin(motionActive);

  const { coords, todayDateKey } = usePrayerTimesHome();

  const { data: hijriToday } = useQuery({
    queryKey: ['toolsGToH', todayDateKey],
    queryFn: () => fetchGregorianToHijri(todayDateKey),
    staleTime: 1000 * 60 * 60,
  });

  const dailyWisdom = useMemo(() => getDailyWisdom(todayDateKey), [todayDateKey]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerPad}>
        <TabLandingHeader />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        <View style={styles.pageHead}>
          <SazdaText variant="label" color="secondary" style={styles.pageKicker}>
            SACRED TOOLS
          </SazdaText>
          <SazdaText variant="headlineLarge" color="primary" style={styles.pageTitle}>
            Everything you need
          </SazdaText>
          <SazdaText variant="bodyMedium" color="onSurfaceVariant" style={styles.pageSub}>
            Your daily companions, all in one place.
          </SazdaText>
        </View>

        <View style={styles.asymmetricGrid}>
          <PressableScale
            to={0.98}
            onPress={() => navigation.navigate('Qibla')}
            style={styles.qiblaHero}
            accessibilityRole="button"
            accessibilityLabel="Qibla finder">
            <View style={styles.qiblaDeco} pointerEvents="none">
              <View style={styles.qiblaDecoInner}>
                <Globe size={120} color={c.onPrimary} strokeWidth={1} />
              </View>
            </View>
            <QiblaRaysDeco active={motionActive} />
            <View style={styles.qiblaHeroText} pointerEvents="none">
              <SazdaText variant="titleSm" color="onPrimaryContainer" style={styles.qiblaTitle}>
                Qibla finder
              </SazdaText>
              <SazdaText variant="caption" color="onPrimaryContainer" style={styles.qiblaSub}>
                Precision compass for your location
              </SazdaText>
              <View style={styles.gpsChip}>
                <SazdaText variant="label" color="onPrimaryContainer" style={styles.gpsChipText}>
                  {coords ? 'GPS ready' : 'Set location on Home'}
                </SazdaText>
              </View>
            </View>
            <View style={styles.qiblaOrb} pointerEvents="none">
              <Animated.View style={qiblaSpin}>
                <Compass size={28} color={c.primary} strokeWidth={2} />
              </Animated.View>
            </View>
          </PressableScale>

          <View style={styles.pairRow}>
            <SacredSmallTile
              styles={styles}
              title="Tasbeeh"
              subtitle="Daily dhikr & digital beads"
              icon={<Hash size={24} color={c.primary} strokeWidth={2.25} />}
              iconVariant="primary"
              motif={<TasbeehMotif c={c} scheme={scheme} active={motionActive} />}
              onPress={() => navigation.navigate('Tasbeeh')}
            />
            <SacredSmallTile
              styles={styles}
              title="Zakat"
              subtitle="Cycles, ₹ payments & insights"
              icon={<HandCoins size={24} color={c.secondary} strokeWidth={2.25} />}
              iconVariant="secondary"
              motif={<ZakatMotif c={c} scheme={scheme} active={motionActive} />}
              onPress={() => navigation.navigate('ZakatHome')}
            />
          </View>

          <View style={styles.pairRow}>
            <SacredSmallTile
              styles={styles}
              title="Daily duas"
              subtitle="Supplications & Hindi help"
              icon={<ScrollText size={24} color={c.primary} strokeWidth={2.25} />}
              iconVariant="primary"
              motif={<DuasMotif c={c} scheme={scheme} active={motionActive} />}
              onPress={() => navigation.navigate('DailyDuas')}
            />
            <SacredSmallTile
              styles={styles}
              title="Prayer tracker"
              subtitle="Five prayers · streaks"
              icon={<ListChecks size={24} color={c.primary} strokeWidth={2.25} />}
              iconVariant="primary"
              motif={<TrackerMotif c={c} scheme={scheme} active={motionActive} />}
              onPress={() => navigation.navigate('PrayerTracker')}
            />
          </View>

          <PressableScale
            to={0.98}
            onPress={() => navigation.navigate('HijriCalendar')}
            style={styles.hijriWide}
            accessibilityRole="button"
            accessibilityLabel="Hijri calendar">
            <View style={styles.hijriDateBox}>
              <SazdaText variant="label" color="secondary" style={styles.hijriMon} numberOfLines={1}>
                {hijriToday?.hijriMonthEn ?? '—'}
              </SazdaText>
              <SazdaText variant="headlineLarge" color="primary" style={styles.hijriDayNum}>
                {hijriToday?.hijriDay ?? '—'}
              </SazdaText>
              <SazdaText variant="caption" color="onSurfaceVariant" style={styles.hijriYear}>
                {hijriToday ? `${hijriToday.hijriYear} AH` : '…'}
              </SazdaText>
            </View>
            <View style={styles.hijriCopy}>
              <SazdaText variant="titleSm" color="primary">
                Hijri calendar
              </SazdaText>
              <SazdaText variant="caption" color="onSurfaceVariant" style={styles.hijriBody}>
                Islamic dates, holidays, and the month grid — live from Aladhan.
              </SazdaText>
              <View style={styles.hijriFoot}>
                <CalendarDays size={16} color={c.primary} strokeWidth={2} />
                <SazdaText variant="label" color="primary" style={styles.hijriFootText}>
                  Open calendar
                </SazdaText>
              </View>
            </View>
            <HijriMotif c={c} scheme={scheme} active={motionActive} />
          </PressableScale>
        </View>

        <SazdaText variant="titleSm" color="primary" style={styles.wisdomTitle}>
          Daily wisdom
        </SazdaText>
        <View style={styles.wisdomCard}>
          <View style={styles.wisdomDots} pointerEvents="none" />
          <Quote size={26} color={c.secondary} strokeWidth={1.75} style={styles.wisdomQuoteIcon} />
          <SazdaText variant="bodyMedium" color="primary" align="center" style={styles.wisdomQuote}>
            “{dailyWisdom.text}”
          </SazdaText>
          <SazdaText variant="label" color="secondary" style={styles.wisdomRef}>
            {dailyWisdom.ref}
          </SazdaText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type ToolsStyles = ReturnType<typeof createToolsStyles>;

function SacredSmallTile({
  styles,
  title,
  subtitle,
  icon,
  iconVariant,
  motif,
  onPress,
}: {
  styles: ToolsStyles;
  title: string;
  subtitle: string;
  icon: ReactNode;
  iconVariant: 'primary' | 'secondary';
  motif?: ReactNode;
  onPress: () => void;
}) {
  return (
    <PressableScale
      to={0.97}
      onPress={onPress}
      style={styles.smallTile}
      accessibilityRole="button"
      accessibilityLabel={title}>
      {motif}
      <View
        style={[
          styles.smallTileIcon,
          iconVariant === 'secondary' ? styles.smallTileIconSec : null,
        ]}>
        {icon}
      </View>
      <View style={styles.smallTileText}>
        <SazdaText variant="titleSm" color="primary" style={styles.smallTileTitle} numberOfLines={2}>
          {title}
        </SazdaText>
        <SazdaText variant="caption" color="onSurfaceVariant" style={styles.smallTileSub} numberOfLines={3}>
          {subtitle}
        </SazdaText>
      </View>
    </PressableScale>
  );
}

function createToolsStyles(c: AppPalette, scheme: ResolvedScheme) {
  const ambient = scheme === 'dark' ? 'rgba(0,0,0,0.35)' : 'rgba(6, 78, 59, 0.06)';
  const ghost = scheme === 'dark' ? 'rgba(142,207,178,0.15)' : 'rgba(0, 53, 39, 0.06)';
  const primaryTint = scheme === 'dark' ? 'rgba(146,226,200,0.14)' : 'rgba(6, 78, 59, 0.09)';
  const secondaryTint = scheme === 'dark' ? 'rgba(233,200,74,0.16)' : 'rgba(254, 214, 91, 0.35)';
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.surface },
    headerPad: { paddingHorizontal: spacing.lg },
    scroll: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.x3xl + spacing.xl,
      gap: spacing.md,
    },
    pageHead: {
      marginTop: spacing.xs,
      marginBottom: spacing.xs,
      gap: 3,
    },
    pageKicker: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 2,
      opacity: 0.85,
    },
    pageTitle: {
      fontSize: 30,
      lineHeight: 35,
      fontWeight: '800',
      letterSpacing: -0.7,
    },
    pageSub: {
      fontSize: 14,
      opacity: 0.7,
      marginTop: 2,
    },
    asymmetricGrid: {
      gap: spacing.md,
    },
    qiblaHero: {
      backgroundColor: c.primaryContainer,
      borderRadius: radius.md + 6,
      padding: spacing.lg + 2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      overflow: 'hidden',
      position: 'relative',
      minHeight: 124,
      shadowColor: scheme === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(0, 53, 39, 0.28)',
      shadowOpacity: 1,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
    qiblaHeroText: { flex: 1, minWidth: 0, paddingRight: spacing.md, zIndex: 2 },
    qiblaTitle: { color: c.onPrimary, marginBottom: 4, fontSize: 17 },
    qiblaSub: { opacity: 0.82, lineHeight: 16 },
    gpsChip: {
      alignSelf: 'flex-start',
      marginTop: spacing.md,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 6,
      borderRadius: radius.full,
      backgroundColor: 'rgba(255,255,255,0.12)',
    },
    gpsChipText: { fontSize: 9, letterSpacing: 1.2 },
    qiblaOrb: {
      width: 56,
      height: 56,
      borderRadius: radius.full,
      backgroundColor: c.secondaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
      shadowColor: 'rgba(0,0,0,0.2)',
      shadowOpacity: 1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 5,
    },
    qiblaDeco: {
      position: 'absolute',
      right: -28,
      bottom: -32,
      zIndex: 0,
    },
    qiblaDecoInner: {
      opacity: 0.12,
    },
    pairRow: {
      flexDirection: 'row',
      gap: spacing.md,
      alignItems: 'stretch',
    },
    smallTile: {
      flex: 1,
      minWidth: 0,
      minHeight: 158,
      backgroundColor: c.surfaceContainerLowest,
      borderRadius: radius.md + 6,
      padding: spacing.lg,
      justifyContent: 'flex-start',
      position: 'relative',
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: ghost,
      shadowColor: ambient,
      shadowOpacity: 0.85,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
    smallTileIcon: {
      width: 46,
      height: 46,
      borderRadius: radius.md,
      backgroundColor: primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
      zIndex: 2,
    },
    smallTileIconSec: {
      backgroundColor: secondaryTint,
    },
    smallTileText: { marginTop: 'auto', zIndex: 2 },
    smallTileTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
    smallTileSub: { fontSize: 11.5, lineHeight: 15, opacity: 0.8, marginTop: 3 },
    hijriWide: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
      backgroundColor: scheme === 'dark' ? c.surfaceContainer : `${c.surfaceContainerHighest}99`,
      borderRadius: radius.md + 6,
      padding: spacing.lg + 2,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: ghost,
      position: 'relative',
      overflow: 'hidden',
    },
    hijriDateBox: {
      backgroundColor: c.surface,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      minWidth: 76,
      alignItems: 'center',
      shadowColor: ambient,
      shadowOpacity: 0.5,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    hijriMon: { fontSize: 10, letterSpacing: 1, marginBottom: 2 },
    hijriDayNum: { fontSize: 30, fontWeight: '900', letterSpacing: -1, lineHeight: 34 },
    hijriYear: { fontSize: 10, fontWeight: '700', marginTop: 2 },
    hijriCopy: { flex: 1, minWidth: 0, gap: 6 },
    hijriBody: { lineHeight: 18, marginTop: 2 },
    hijriFoot: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    hijriFootText: { fontSize: 10, letterSpacing: 0.8 },
    wisdomTitle: {
      fontSize: 14,
      fontWeight: '700',
      letterSpacing: 0.4,
      opacity: 0.7,
      marginTop: spacing.xs,
    },
    wisdomCard: {
      backgroundColor: scheme === 'dark' ? `${c.surfaceContainerHighest}80` : `${c.surfaceContainerHighest}80`,
      borderRadius: radius.md,
      padding: spacing.lg,
      alignItems: 'center',
      overflow: 'hidden',
      position: 'relative',
      marginBottom: spacing.lg,
    },
    wisdomDots: {
      ...StyleSheet.absoluteFillObject,
      opacity: 0.05,
      backgroundColor: c.primary,
    },
    wisdomQuoteIcon: { marginBottom: spacing.sm, zIndex: 1 },
    wisdomQuote: {
      fontStyle: 'italic',
      lineHeight: 22,
      fontSize: 14,
      paddingHorizontal: spacing.sm,
      zIndex: 1,
    },
    wisdomRef: {
      marginTop: spacing.md,
      letterSpacing: 2,
      fontSize: 11,
      zIndex: 1,
    },
  });
}
