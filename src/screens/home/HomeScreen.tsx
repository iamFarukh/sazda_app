import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  Compass,
  Hash,
  HandCoins,
  ListChecks,
  Quote,
  Smile,
  Frown,
  Moon,
} from 'lucide-react-native';
import { TabLandingHeader } from '../../components/organisms/TabLandingHeader';
import { Card } from '../../components/atoms/Card/Card';
import { SazdaText } from '../../components/atoms/SazdaText/SazdaText';
import { radius } from '../../theme/radius';
import type { AppPalette } from '../../theme/useThemePalette';
import type { ResolvedScheme } from '../../theme/useThemePalette';
import { useThemePalette } from '../../theme/useThemePalette';
import { spacing } from '../../theme/spacing';
import { useNavigateMainTab } from '../../navigation/useNavigateMainTab';
import { useNavigateToToolsScreen } from '../../navigation/useNavigateToToolsScreen';
import { fontFamilies, getFontConfig } from '../../theme/typography';
import { usePrayerTimesHome } from '../../hooks/usePrayerTimesHome';
import { usePrayerStreak } from '../../hooks/usePrayerStreak';
import { usePrayerWidgetSnapshot } from '../../hooks/usePrayerWidgetSnapshot';
import { HomeLocationBar } from '../../components/molecules/HomeLocationBar/HomeLocationBar';
import { LocationSettingsSheet } from '../../components/molecules/LocationSettingsSheet/LocationSettingsSheet';
import { fetchGregorianToHijri } from '../../services/hijriCalendarApi';
import { dayjs } from '../../utils/dayjs';
import type { DailyPrayerName } from '../../utils/prayerSchedule';
import {
  createDualHeroStyles,
  HomePrayerHeroAnimated,
} from './HomePrayerHeroAnimated';
import { HomePrayerTimesList } from './HomePrayerTimesList';
import { useProfileStore } from '../../store/profileStore';
import { motionDurations } from '../../theme/motion';
import { hapticLight } from '../../utils/appHaptics';

const FIVE_SALAH_KEYS = new Set<string>([
  'Fajr',
  'Dhuhr',
  'Asr',
  'Maghrib',
  'Isha',
]);

const DAILY_VERSES = [
  { ar: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا', en: '“For indeed, with hardship [will be] ease.”', ref: 'Surah Ash-Sharh 94:5' },
  { ar: 'لَا تَحْزَنْ إِنَّ اللَّهَ مَعَنَا', en: '“Do not grieve; indeed Allah is with us.”', ref: 'Surah At-Tawbah 9:40' },
  { ar: 'وَاسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ', en: '“And seek help through patience and prayer.”', ref: 'Surah Al-Baqarah 2:45' },
  { ar: 'فَاذْكُرُونِي أَذْكُرْكُمْ', en: '“So remember Me; I will remember you.”', ref: 'Surah Al-Baqarah 2:152' },
  { ar: 'إِنَّ اللَّهَ يُحِبُّ الْمُتَوَكِّلِينَ', en: '“Indeed, Allah loves those who rely [upon Him].”', ref: "Surah Ali 'Imran 3:159" },
  { ar: 'وَمَا تَشَاءُونَ إِلَّا أَن يَشَاءَ اللَّهُ', en: '“And you do not will except that Allah wills.”', ref: 'Surah Al-Insan 76:30' },
  { ar: 'وَهُوَ مَعَكُمْ أَيْنَ مَا كُنْتُمْ', en: '“And He is with you wherever you are.”', ref: 'Surah Al-Hadid 57:4' },
];

type MoodId = 'grateful' | 'anxious' | 'calm' | 'seeking';

type HomeStyles = ReturnType<typeof createHomeStyles>;

const HomeDailyVerseCard = memo(function HomeDailyVerseCard({
  verse,
  styles: s,
  quoteIconColor,
}: {
  verse: (typeof DAILY_VERSES)[number];
  styles: HomeStyles;
  quoteIconColor: string;
}) {
  return (
    <Card variant="elevated" padding="lg" borderRadius={radius.md + 8}>
      <View style={s.verseDecor} pointerEvents="none" />
      <View style={s.quoteIcon}>
        <Quote size={36} color={quoteIconColor} strokeWidth={1.75} />
      </View>
      <SazdaText variant="verse" color="primary" align="center" style={s.verseAr}>
        {verse.ar}
      </SazdaText>
      <SazdaText variant="body" color="onSurfaceVariant" align="center" style={s.verseEn}>
        {verse.en}
      </SazdaText>
      <SazdaText variant="label" color="secondary" align="center" style={s.verseRef}>
        {verse.ref}
      </SazdaText>
    </Card>
  );
});

const HomeMoodSection = memo(function HomeMoodSection({
  mood,
  onMood,
  moodIconColor,
  styles: s,
}: {
  mood: MoodId | null;
  onMood: (id: MoodId) => void;
  moodIconColor: (active: boolean) => string;
  styles: HomeStyles;
}) {
  return (
    <View style={s.section}>
      <SazdaText variant="headlineMedium" color="primary" align="center">
        How are you feeling today?
      </SazdaText>
      <View style={s.moodBar}>
        <MoodChip
          s={s}
          label="Grateful"
          active={mood === 'grateful'}
          onPress={() => onMood('grateful')}
          icon={
            <Smile
              size={22}
              color={moodIconColor(mood === 'grateful')}
              strokeWidth={2}
            />
          }
        />
        <MoodChip
          s={s}
          label="Anxious"
          active={mood === 'anxious'}
          onPress={() => onMood('anxious')}
          icon={
            <Frown
              size={22}
              color={moodIconColor(mood === 'anxious')}
              strokeWidth={2}
            />
          }
        />
        <MoodChip
          s={s}
          label="Calm"
          active={mood === 'calm'}
          onPress={() => onMood('calm')}
          icon={
            <Moon size={22} color={moodIconColor(mood === 'calm')} strokeWidth={2} />
          }
        />
        <MoodChip
          s={s}
          label="Seeking"
          active={mood === 'seeking'}
          onPress={() => onMood('seeking')}
          icon={
            <BookOpen
              size={22}
              color={moodIconColor(mood === 'seeking')}
              strokeWidth={2}
            />
          }
        />
      </View>
    </View>
  );
});

export function HomeScreen() {
  const greetingName = useProfileStore(s => s.displayName.trim() || 'Guest');
  const { colors: c, scheme } = useThemePalette();
  const styles = useMemo(() => createHomeStyles(c, scheme), [c, scheme]);
  const moodMuted =
    scheme === 'dark' ? 'rgba(142,207,178,0.38)' : 'rgba(0, 53, 39, 0.38)';
  const moodIconColor = useCallback(
    (active: boolean) => (active ? c.primary : moodMuted),
    [c.primary, moodMuted],
  );
  const heroOnFill = scheme === 'dark' ? c.onPrimaryContainer : c.onPrimary;
  /** Gold accent on prayer hero: dark palette’s `secondaryContainer` is a brown fill, not readable as text. */
  const heroAccent = scheme === 'dark' ? c.secondary : c.secondaryContainer;

  const goTab = useNavigateMainTab();
  const goTool = useNavigateToToolsScreen();
  const [mood, setMood] = useState<MoodId | null>(null);
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const [gpsSheetBusy, setGpsSheetBusy] = useState(false);
  const {
    coords,
    permissionDenied,
    locationError,
    requestLocation,
    prayerLoading,
    prayerError,
    refetchPrayers,
    hero,
    countdownLabel,
    currentPrayerLabel,
    currentPrayerTimeLabel,
    nextPrayerLabel,
    locationLine,
    locationCityLabel,
    methodNote,
    waitingNightData,
    prayerPeriodNote,
    todayTimings,
    todayDateKey,
    tomorrowTimings,
    yesterdayTimings,
    nowBeforeFajr,
  } = usePrayerTimesHome();

  const prayerWidgetSnapshot = usePrayerWidgetSnapshot(
    todayDateKey,
    todayTimings,
    tomorrowTimings,
    yesterdayTimings,
    nowBeforeFajr,
    waitingNightData,
  );

  const runGpsFromSheet = useCallback(async () => {
    setGpsSheetBusy(true);
    try {
      await requestLocation();
    } finally {
      setGpsSheetBusy(false);
    }
  }, [requestLocation]);

  const dualHeroStyles = useMemo(
    () =>
      createDualHeroStyles(c, scheme, {
        betweenPrayers: hero?.currentPeriod === 'BetweenFajrDhuhr',
      }),
    [c, scheme, hero?.currentPeriod],
  );

  const { data: hijriToday } = useQuery({
    queryKey: ['homeGToH', todayDateKey],
    queryFn: () => fetchGregorianToHijri(todayDateKey),
    staleTime: 1000 * 60 * 60,
  });

  const gregorianDateLine = useMemo(() => {
    const [d, m, y] = todayDateKey.split('-').map(Number);
    return dayjs(new Date(y, m - 1, d)).format('dddd, D MMM');
  }, [todayDateKey]);
  const hijriDateLine = hijriToday
    ? `${hijriToday.hijriDay} ${hijriToday.hijriMonthEn} ${hijriToday.hijriYear} AH`
    : null;

  const prayerStreak = usePrayerStreak();

  const activeSalahRow: DailyPrayerName | null = useMemo(() => {
    const r = hero?.currentSalahRow;
    if (!r || !FIVE_SALAH_KEYS.has(r)) return null;
    return r as DailyPrayerName;
  }, [hero?.currentSalahRow]);

  const dayIndex = useMemo(() => {
    const seed = todayDateKey.split('-').join('');
    return Number(seed) % DAILY_VERSES.length || 0;
  }, [todayDateKey]);
  const verseToday = DAILY_VERSES[dayIndex];

  const locationPending = !coords && !permissionDenied && !locationError;
  const prayerKicker = hero
    ? hero.hideCurrentAdhanTime
      ? 'Before Fajr'
      : hero.currentPeriod === 'Night'
      ? 'Night'
      : hero.currentPeriod === 'BetweenFajrDhuhr'
      ? 'Between prayers'
      : hero.currentPeriod === 'MakruhBeforeDhuhr'
      ? 'Guidance'
      : 'Current prayer'
    : 'Prayer times';

  const onMood = useCallback((id: MoodId) => {
    hapticLight();
    setMood(prev => (prev === id ? null : id));
  }, []);

  const onRefreshPrayers = useCallback(() => {
    hapticLight();
    refetchPrayers();
  }, [refetchPrayers]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={prayerLoading && !!coords}
            onRefresh={onRefreshPrayers}
            tintColor={c.primary}
            colors={[c.primary]}
          />
        }
      >
        <View style={styles.homeTopCluster}>
          <TabLandingHeader denseBottom />
          <HomeLocationBar
            cityLabel={locationCityLabel}
            onPress={() => setLocationSheetOpen(true)}
          />
        </View>

        <View style={styles.prayerHeaderBlock}>
          <SazdaText
            variant="headlineLarge"
            color="primary"
            style={styles.prayerPageTitle}
          >
            Prayer times
          </SazdaText>
          <SazdaText
            variant="bodyMedium"
            color="onSurfaceVariant"
            style={styles.greetingCompact}
          >
            Assalamu Alaikum, {greetingName}
          </SazdaText>
          <View style={styles.dateRow}>
            <SazdaText
              variant="bodyMedium"
              color="onSurfaceVariant"
              style={styles.dateRowText}
            >
              {gregorianDateLine}
            </SazdaText>
            <View style={styles.dateDot} />
            <SazdaText
              variant="bodyMedium"
              color="onSurfaceVariant"
              style={styles.dateRowText}
            >
              {hijriDateLine ?? '…'}
            </SazdaText>
          </View>
        </View>

        {/* Current prayer — live countdown every second; times from Aladhan */}
        <View style={styles.prayerWrap}>
          {hero ? (
            <HomePrayerHeroAnimated
              hero={hero}
              prayerKicker={prayerKicker}
              currentPrayerLabel={currentPrayerLabel}
              currentPrayerTimeLabel={currentPrayerTimeLabel}
              nextPrayerLabel={nextPrayerLabel}
              countdownLabel={countdownLabel}
              prayerPeriodNote={prayerPeriodNote}
              methodNote={methodNote}
              locationLine={locationLine}
              streakCount={prayerStreak}
              palette={c}
              scheme={scheme}
              styles={dualHeroStyles}
            />
          ) : (
            <>
              <View style={styles.prayerGlow} pointerEvents="none" />
              <View style={styles.prayerCard}>
                <SazdaText
                  variant="label"
                  color={heroOnFill}
                  style={styles.prayerKicker}
                >
                  {prayerKicker}
                </SazdaText>

                {permissionDenied ? (
                  <View style={styles.prayerMessageBlock}>
                    <SazdaText
                      variant="bodyMedium"
                      color={heroOnFill}
                      align="center"
                      style={styles.prayerMessage}
                    >
                      Turn on location so we can show salah times for your area.
                    </SazdaText>
                    <Pressable
                      onPress={() => requestLocation()}
                      style={({ pressed }) => [
                        styles.prayerActionBtn,
                        pressed && styles.pressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Enable location for prayer times"
                    >
                      <SazdaText
                        variant="label"
                        color="primary"
                        style={styles.prayerActionBtnLabel}
                      >
                        Enable location
                      </SazdaText>
                    </Pressable>
                  </View>
                ) : locationError ? (
                  <View style={styles.prayerMessageBlock}>
                    <SazdaText
                      variant="bodyMedium"
                      color={heroOnFill}
                      align="center"
                      style={styles.prayerMessage}
                    >
                      {locationError}
                    </SazdaText>
                    <Pressable
                      onPress={() => requestLocation()}
                      style={({ pressed }) => [
                        styles.prayerActionBtn,
                        pressed && styles.pressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Retry getting location"
                    >
                      <SazdaText
                        variant="label"
                        color="primary"
                        style={styles.prayerActionBtnLabel}
                      >
                        Try again
                      </SazdaText>
                    </Pressable>
                  </View>
                ) : locationPending || prayerLoading || waitingNightData ? (
                  <View style={styles.prayerLoadingBlock}>
                    <PrayerHeroSkeleton
                      trackColor={
                        scheme === 'dark'
                          ? 'rgba(255,255,255,0.14)'
                          : 'rgba(255,255,255,0.22)'
                      }
                    />
                    <SazdaText
                      variant="bodyMedium"
                      color={heroOnFill}
                      style={styles.prayerLoadingCaption}
                    >
                      {waitingNightData
                        ? 'Loading times…'
                        : 'Getting prayer times…'}
                    </SazdaText>
                  </View>
                ) : prayerError ? (
                  <View style={styles.prayerMessageBlock}>
                    <SazdaText
                      variant="bodyMedium"
                      color={heroOnFill}
                      align="center"
                      style={styles.prayerMessage}
                    >
                      Couldn&apos;t load prayer times. Check your connection.
                    </SazdaText>
                    <Pressable
                      onPress={() => refetchPrayers()}
                      style={({ pressed }) => [
                        styles.prayerActionBtn,
                        pressed && styles.pressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Retry loading prayer times"
                    >
                      <SazdaText
                        variant="label"
                        color="primary"
                        style={styles.prayerActionBtnLabel}
                      >
                        Retry
                      </SazdaText>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            </>
          )}
        </View>

        {todayTimings &&
        coords &&
        !permissionDenied &&
        !locationError &&
        !locationPending &&
        !prayerError ? (
          <HomePrayerTimesList
            timings={todayTimings}
            activeSalah={prayerWidgetSnapshot?.highlight ?? activeSalahRow}
            palette={c}
            scheme={scheme}
          />
        ) : null}

        <HomeDailyVerseCard
          verse={verseToday}
          styles={styles}
          quoteIconColor={c.secondaryContainer}
        />

        <HomeMoodSection
          mood={mood}
          onMood={onMood}
          moodIconColor={moodIconColor}
          styles={styles}
        />
      </ScrollView>

      <LocationSettingsSheet
        visible={locationSheetOpen}
        onClose={() => setLocationSheetOpen(false)}
        busy={gpsSheetBusy}
        onUseCurrentLocation={() => void runGpsFromSheet()}
        onRefreshLocation={() => void runGpsFromSheet()}
      />
    </SafeAreaView>
  );
}

function QuickAction({
  s,
  label,
  icon,
  onPress,
}: {
  s: HomeStyles;
  label: string;
  icon: ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.quickCell, pressed && s.pressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={s.quickIconBox}>{icon}</View>
      <SazdaText variant="label" color="primary" style={s.quickLabel}>
        {label}
      </SazdaText>
    </Pressable>
  );
}

function PrayerHeroSkeleton({ trackColor }: { trackColor: string }) {
  const o = useSharedValue(0.38);
  useEffect(() => {
    o.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: motionDurations.skeletonPulseMs / 2,
          easing: Easing.inOut(Easing.quad),
        }),
        withTiming(0.38, {
          duration: motionDurations.skeletonPulseMs / 2,
          easing: Easing.inOut(Easing.quad),
        }),
      ),
      -1,
      true,
    );
  }, [o]);
  const pulse = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <View style={{ width: '100%', gap: spacing.md, alignItems: 'center' }}>
      <Animated.View
        style={[
          {
            width: '50%',
            height: 11,
            borderRadius: 6,
            backgroundColor: trackColor,
          },
          pulse,
        ]}
      />
      <Animated.View
        style={[
          {
            width: '88%',
            height: 40,
            borderRadius: 10,
            backgroundColor: trackColor,
          },
          pulse,
        ]}
      />
      <Animated.View
        style={[
          {
            width: '100%',
            height: 48,
            borderRadius: 14,
            backgroundColor: trackColor,
          },
          pulse,
        ]}
      />
    </View>
  );
}

function MoodChip({
  s,
  label,
  icon,
  active,
  onPress,
}: {
  s: HomeStyles;
  label: string;
  icon: ReactNode;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={s.moodCell}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <View style={[s.moodCircle, active && s.moodCircleActive]}>{icon}</View>
      <SazdaText
        variant="label"
        color={active ? 'primary' : 'onSurfaceVariant'}
        style={[s.moodLabel, !active && s.moodLabelMuted]}
      >
        {label}
      </SazdaText>
    </Pressable>
  );
}

function createHomeStyles(c: AppPalette, scheme: ResolvedScheme) {
  const heroFill = scheme === 'dark' ? c.primaryContainer : c.primary;
  const heroOn = scheme === 'dark' ? c.onPrimaryContainer : c.onPrimary;
  const cardShadow =
    scheme === 'dark' ? 'rgba(0,0,0,0.35)' : 'rgba(6, 78, 59, 0.25)';

  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: c.surface,
    },
    scroll: { flex: 1 },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.x3xl + spacing.lg,
      gap: spacing.md,
    },
    /** Header + location read as one unit; avoids large scroll `gap` between them. */
    homeTopCluster: {
      gap: 2,
      marginBottom: 0,
    },
    pressed: { opacity: 0.85 },
    section: {
      gap: spacing.xs,
    },
    prayerHeaderBlock: {
      gap: spacing.xs,
      marginTop: 0,
      marginBottom: spacing.sm,
    },
    prayerPageTitle: {
      ...getFontConfig(fontFamilies.headline, '800'),
      fontSize: 34,
      lineHeight: 40,
      letterSpacing: -0.6,
    },
    greetingCompact: {
      opacity: 0.78,
      marginTop: 2,
    },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    dateRowText: {
      ...getFontConfig(fontFamilies.body, '600'),
      opacity: 0.88,
    },
    dateDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.outlineVariant,
    },
    prayerWrap: {
      position: 'relative',
      marginBottom: spacing.lg,
    },
    prayerGlow: {
      position: 'absolute',
      left: -4,
      right: -4,
      top: 4,
      bottom: -8,
      backgroundColor: c.secondaryContainer,
      opacity: 0.12,
      borderRadius: radius.md + 8,
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
    prayerKicker: {
      color: heroOn,
      opacity: 0.85,
      marginBottom: spacing.md,
      letterSpacing: 2,
    },
    prayerMessageBlock: {
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm,
      maxWidth: '100%',
    },
    prayerMessage: {
      opacity: 0.95,
      paddingHorizontal: spacing.sm,
    },
    prayerActionBtn: {
      backgroundColor: c.secondaryContainer,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm + 2,
      borderRadius: radius.full,
    },
    prayerActionBtnLabel: {
      ...getFontConfig(fontFamilies.body, '700'),
    },
    prayerLoadingBlock: {
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.lg,
    },
    prayerLoadingCaption: {
      opacity: 0.9,
    },
    quickRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: spacing.sm,
      rowGap: spacing.md,
      marginTop: spacing.xs,
    },
    quickCell: {
      flexGrow: 1,
      flexBasis: '30%',
      maxWidth: '33%',
      minWidth: 72,
      alignItems: 'center',
      gap: spacing.sm,
    },
    quickIconBox: {
      width: 64,
      height: 64,
      borderRadius: radius.md,
      backgroundColor: c.surfaceContainerLow,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickLabel: {
      fontSize: 11,
      textAlign: 'center',
    },
    verseDecor: {
      position: 'absolute',
      top: -40,
      right: -40,
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: c.secondaryContainer,
      opacity: 0.12,
    },
    quoteIcon: {
      alignSelf: 'center',
      marginBottom: spacing.lg,
    },
    verseAr: {
      marginBottom: spacing.lg,
      paddingHorizontal: spacing.md,
    },
    verseEn: {
      fontStyle: 'italic',
      fontSize: 14,
      lineHeight: 22,
    },
    verseRef: {
      marginTop: spacing.lg,
      color: c.secondary,
      letterSpacing: 1.5,
    },
    moodBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: c.surfaceContainerLow,
      borderRadius: radius.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
      marginTop: spacing.md,
    },
    moodCell: {
      alignItems: 'center',
      gap: spacing.sm,
      minWidth: 56,
    },
    moodCircle: {
      width: 48,
      height: 48,
      borderRadius: radius.full,
      backgroundColor: c.surfaceContainerLowest,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor:
        scheme === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(6, 78, 59, 0.08)',
      shadowOpacity: 1,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    moodCircleActive: {
      backgroundColor: c.secondaryContainer,
    },
    moodLabel: {
      fontSize: 9,
      letterSpacing: 0.2,
      textAlign: 'center',
    },
    moodLabelMuted: {
      opacity: 0.55,
    },
  });
}
