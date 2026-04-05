import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import {
  Award,
  CalendarDays,
  Compass,
  Globe,
  Hash,
  HandCoins,
  ListChecks,
  Quote,
  ScrollText,
} from 'lucide-react-native';
import { TabLandingHeader } from '../../components/organisms/TabLandingHeader';
import { SazdaText } from '../../components/atoms/SazdaText/SazdaText';
import { usePrayerTimesHome } from '../../hooks/usePrayerTimesHome';
import { usePrayerStreak } from '../../hooks/usePrayerStreak';
import type { ToolsStackParamList } from '../../navigation/types';
import { fetchGregorianToHijri } from '../../services/hijriCalendarApi';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import type { AppPalette } from '../../theme/useThemePalette';
import type { ResolvedScheme } from '../../theme/useThemePalette';
import { useThemePalette } from '../../theme/useThemePalette';
import { useProfileStore } from '../../store/profileStore';
import { formatHhmmTo12h } from '../../utils/prayerTimesDisplay';
import type { PrayerTimingsDay } from '../../services/prayerTimesApi';

type Nav = NativeStackNavigationProp<ToolsStackParamList, 'ToolsMain'>;

function nextPrayerTimeLabel(
  timings: PrayerTimingsDay | null,
  targetName: string | undefined,
): string {
  if (!timings || !targetName) return '—';
  const row = timings[targetName as keyof PrayerTimingsDay];
  if (!row) return '—';
  return formatHhmmTo12h(row);
}

export function ToolsHomeScreen() {
  const navigation = useNavigation<Nav>();
  const displayName = useProfileStore(s => s.displayName.trim() || 'Guest');
  const { colors: c, scheme } = useThemePalette();
  const styles = useMemo(() => createToolsStyles(c, scheme), [c, scheme]);
  const streak = usePrayerStreak();

  const {
    coords,
    hero,
    countdownLabel,
    nextPrayerLabel,
    todayTimings,
    todayDateKey,
    permissionDenied,
    prayerLoading,
  } = usePrayerTimesHome();

  const { data: hijriToday } = useQuery({
    queryKey: ['toolsGToH', todayDateKey],
    queryFn: () => fetchGregorianToHijri(todayDateKey),
    staleTime: 1000 * 60 * 60,
  });

  const nextTimeDisplay = nextPrayerTimeLabel(todayTimings, hero?.countdownTargetName);
  const nextNameDisplay =
    todayTimings && hero && !permissionDenied ? nextPrayerLabel : '—';
  const remainingDisplay =
    todayTimings && hero && !permissionDenied ? countdownLabel : prayerLoading ? '…' : '—';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerPad}>
        <TabLandingHeader />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        <View style={styles.greetingBlock}>
          <SazdaText variant="label" color="primary" style={styles.salamKicker}>
            As-salāmu ʿalaykum
          </SazdaText>
          <View style={styles.greetingTitleRow}>
            <SazdaText variant="headlineLarge" color="primary" style={styles.greetingTitle}>
              {displayName},
            </SazdaText>
            <SazdaText variant="headlineLarge" color="secondary" style={styles.greetingAccent}>
              {' '}
              Peace be with you.
            </SazdaText>
          </View>
        </View>

        <View style={styles.insightCard}>
          <View style={styles.insightLeft}>
            <SazdaText variant="bodyMedium" color="onSurfaceVariant" style={styles.insightLabel}>
              Next prayer:{' '}
              <SazdaText variant="bodyMedium" color="primary" style={styles.insightBold}>
                {nextNameDisplay}
              </SazdaText>
            </SazdaText>
            <SazdaText variant="headlineLarge" color="primary" style={styles.insightTime}>
              {nextTimeDisplay}
            </SazdaText>
            <View style={styles.pulseRow}>
              <View style={styles.pulseDot} />
              <SazdaText variant="label" color="onSurfaceVariant" style={styles.remainingTiny}>
                {remainingDisplay === '—' ? 'Times on Home' : `${remainingDisplay} left`}
              </SazdaText>
            </View>
          </View>
          <View style={styles.insightDivider} />
          <View style={styles.insightRight}>
            <SazdaText variant="bodyMedium" color="onSurfaceVariant" style={styles.insightLabel}>
              Salah streak
            </SazdaText>
            <View style={styles.streakRow}>
              <SazdaText variant="headlineLarge" color="primary" style={styles.streakNum}>
                {streak}
              </SazdaText>
              <Award size={22} color={c.secondary} strokeWidth={2} />
            </View>
            <SazdaText variant="label" color="onSurfaceVariant" style={styles.streakHint}>
              Full days in a row
            </SazdaText>
          </View>
        </View>

        <View style={styles.sectionHead}>
          <SazdaText variant="titleSm" color="primary" style={styles.sectionTitle}>
            Sacred tools
          </SazdaText>
          <SazdaText variant="bodyMedium" color="secondary" style={styles.sectionLink}>
            All in one place
          </SazdaText>
        </View>

        <View style={styles.asymmetricGrid}>
          <Pressable
            onPress={() => navigation.navigate('Qibla')}
            style={({ pressed }) => [styles.qiblaHero, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Qibla finder">
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
            <View style={styles.qiblaOrb}>
              <Compass size={28} color={c.primary} strokeWidth={2} />
            </View>
            <View style={styles.qiblaDeco} pointerEvents="none">
              <View style={styles.qiblaDecoInner}>
                <Globe size={120} color={c.onPrimary} strokeWidth={1} />
              </View>
            </View>
          </Pressable>

          <View style={styles.pairRow}>
            <SacredSmallTile
              styles={styles}
              title="Tasbeeh"
              subtitle="Daily dhikr & digital beads"
              icon={<Hash size={22} color={c.primary} strokeWidth={2} />}
              iconVariant="primary"
              onPress={() => navigation.navigate('Tasbeeh')}
            />
            <SacredSmallTile
              styles={styles}
              title="Zakat"
              subtitle="Cycles, ₹ payments & insights"
              icon={<HandCoins size={22} color={c.secondary} strokeWidth={2} />}
              iconVariant="secondary"
              onPress={() => navigation.navigate('ZakatHome')}
            />
          </View>

          <View style={styles.pairRow}>
            <SacredSmallTile
              styles={styles}
              title="Daily duas"
              subtitle="Supplications & Hindi help"
              icon={<ScrollText size={22} color={c.primary} strokeWidth={2} />}
              iconVariant="primary"
              onPress={() => navigation.navigate('DailyDuas')}
            />
            <SacredSmallTile
              styles={styles}
              title="Prayer tracker"
              subtitle="Five prayers · streaks"
              icon={<ListChecks size={22} color={c.primary} strokeWidth={2} />}
              iconVariant="primary"
              onPress={() => navigation.navigate('PrayerTracker')}
            />
          </View>

          <Pressable
            onPress={() => navigation.navigate('HijriCalendar')}
            style={({ pressed }) => [styles.hijriWide, pressed && styles.pressed]}
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
          </Pressable>
        </View>

        <SazdaText variant="titleSm" color="primary" style={styles.wisdomTitle}>
          Daily wisdom
        </SazdaText>
        <View style={styles.wisdomCard}>
          <View style={styles.wisdomDots} pointerEvents="none" />
          <Quote size={36} color={c.secondary} strokeWidth={1.75} style={styles.wisdomQuoteIcon} />
          <SazdaText variant="bodyMedium" color="primary" align="center" style={styles.wisdomQuote}>
            “Verily, in the remembrance of Allah do hearts find rest.”
          </SazdaText>
          <SazdaText variant="label" color="secondary" style={styles.wisdomRef}>
            Surah Ar-Ra&apos;d 13:28
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
  onPress,
}: {
  styles: ToolsStyles;
  title: string;
  subtitle: string;
  icon: ReactNode;
  iconVariant: 'primary' | 'secondary';
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.smallTile, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={title}>
      <View
        style={[
          styles.smallTileIcon,
          iconVariant === 'secondary' ? styles.smallTileIconSec : null,
        ]}>
        {icon}
      </View>
      <SazdaText variant="titleSm" color="primary" style={styles.smallTileTitle} numberOfLines={2}>
        {title}
      </SazdaText>
      <SazdaText variant="caption" color="onSurfaceVariant" style={styles.smallTileSub} numberOfLines={3}>
        {subtitle}
      </SazdaText>
    </Pressable>
  );
}

function createToolsStyles(c: AppPalette, scheme: ResolvedScheme) {
  const ambient = scheme === 'dark' ? 'rgba(0,0,0,0.35)' : 'rgba(6, 78, 59, 0.06)';
  const ghost = scheme === 'dark' ? 'rgba(142,207,178,0.15)' : 'rgba(0, 53, 39, 0.06)';
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.surface },
    headerPad: { paddingHorizontal: spacing.lg },
    scroll: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.x3xl + spacing.xl,
      gap: spacing.lg,
    },
    greetingBlock: {
      gap: spacing.xs,
      marginTop: spacing.xs,
    },
    salamKicker: {
      opacity: 0.55,
      letterSpacing: 2,
      marginBottom: 2,
    },
    greetingTitleRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'baseline',
    },
    greetingTitle: {
      fontSize: 32,
      lineHeight: 38,
      letterSpacing: -0.8,
      fontWeight: '800',
    },
    greetingAccent: {
      fontSize: 32,
      lineHeight: 38,
      letterSpacing: -0.8,
      fontWeight: '800',
    },
    insightCard: {
      flexDirection: 'row',
      alignItems: 'stretch',
      backgroundColor: c.surfaceContainerLow,
      borderRadius: radius.md + 4,
      padding: spacing.lg + 2,
      gap: spacing.md,
      shadowColor: ambient,
      shadowOpacity: 0.9,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    insightLeft: { flex: 1.15, minWidth: 0, gap: 4, justifyContent: 'center' },
    insightRight: { flex: 1, minWidth: 0, gap: 4, justifyContent: 'center' },
    insightLabel: { fontSize: 14 },
    insightBold: { fontWeight: '800' },
    insightTime: {
      fontSize: 28,
      fontWeight: '800',
      letterSpacing: -0.5,
      marginTop: 2,
    },
    pulseRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    pulseDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: c.secondary,
    },
    remainingTiny: {
      fontSize: 10,
      letterSpacing: 1.2,
      opacity: 0.85,
    },
    insightDivider: {
      width: StyleSheet.hairlineWidth,
      backgroundColor: ghost,
      alignSelf: 'stretch',
      marginVertical: spacing.xs,
    },
    streakRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: 2,
    },
    streakNum: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
    streakHint: { fontSize: 10, letterSpacing: 1, opacity: 0.8, marginTop: 4 },
    sectionHead: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginTop: spacing.md,
      marginBottom: spacing.xs,
    },
    sectionTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
    sectionLink: { fontWeight: '700', opacity: 0.9 },
    asymmetricGrid: {
      gap: spacing.md,
    },
    qiblaHero: {
      backgroundColor: c.primaryContainer,
      borderRadius: radius.md + 4,
      padding: spacing.lg + 2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      overflow: 'hidden',
      position: 'relative',
      minHeight: 112,
    },
    qiblaHeroText: { flex: 1, minWidth: 0, paddingRight: spacing.md, zIndex: 2 },
    qiblaTitle: { color: c.onPrimary, marginBottom: 4 },
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
      backgroundColor: c.surfaceContainerLowest,
      borderRadius: radius.md + 4,
      padding: spacing.lg,
      gap: spacing.sm,
      shadowColor: ambient,
      shadowOpacity: 0.7,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    smallTileIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.md - 2,
      backgroundColor: c.surfaceContainerHighest,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xs,
    },
    smallTileIconSec: {
      backgroundColor: c.surfaceContainerHighest,
    },
    smallTileTitle: { fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
    smallTileSub: { fontSize: 10, lineHeight: 14, opacity: 0.88, marginTop: 2 },
    hijriWide: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
      backgroundColor: scheme === 'dark' ? c.surfaceContainer : `${c.surfaceContainerHighest}99`,
      borderRadius: radius.md + 4,
      padding: spacing.lg + 2,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: ghost,
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
      fontSize: 18,
      fontWeight: '800',
      letterSpacing: -0.3,
      marginTop: spacing.md,
    },
    wisdomCard: {
      backgroundColor: scheme === 'dark' ? `${c.surfaceContainerHighest}80` : `${c.surfaceContainerHighest}80`,
      borderRadius: radius.md + 4,
      padding: spacing.xl,
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
    wisdomQuoteIcon: { marginBottom: spacing.md, zIndex: 1 },
    wisdomQuote: {
      fontStyle: 'italic',
      lineHeight: 26,
      paddingHorizontal: spacing.sm,
      zIndex: 1,
    },
    wisdomRef: {
      marginTop: spacing.lg,
      letterSpacing: 2,
      zIndex: 1,
    },
    pressed: { opacity: 0.94 },
  });
}
