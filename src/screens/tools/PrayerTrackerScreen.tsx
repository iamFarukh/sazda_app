import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  FadeInUp,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import dayjs from 'dayjs';
import { useFocusEffect } from '@react-navigation/native';
import { CalendarDays, Check, ChevronRight, Flame, ListChecks, X } from 'lucide-react-native';
import { MonthCalendarModal } from '../../components/molecules/MonthCalendarModal/MonthCalendarModal';
import { SazdaText } from '../../components/atoms/SazdaText/SazdaText';
import { NoorRing } from '../../components/atoms/NoorRing/NoorRing';
import { LottieBurst } from '../../components/molecules/LottieBurst/LottieBurst';
import { AnimatedCounter } from '../../components/atoms/AnimatedCounter/AnimatedCounter';
import { PressableScale } from '../../components/atoms/PressableScale/PressableScale';
import { ToolsSubheader } from '../../components/molecules/ToolsSubheader/ToolsSubheader';
import { usePrayerTimesHome } from '../../hooks/usePrayerTimesHome';
import {
  FIVE_DAILY_PRAYERS,
  type FiveDailyPrayer,
  type PrayerMark,
  usePrayerTrackerStore,
} from '../../store/prayerTrackerStore';
import { useAuthStore } from '../../store/authStore';
import { pullAndMergePrayer, setPrayerSyncUser } from '../../services/prayerTrackerCloudSync';
import {
  cancelAllAdhanReminders,
  rescheduleAdhanReminders,
} from '../../services/prayerReminders';
import { useAdhanSettingsStore } from '../../store/adhanSettingsStore';
import { radius } from '../../theme/radius';
import type { AppPalette } from '../../theme/useThemePalette';
import type { ResolvedScheme } from '../../theme/useThemePalette';
import { useThemePalette } from '../../theme/useThemePalette';
import { spacing } from '../../theme/spacing';
import { getEncouragementMessage, getPastDayEncouragement } from '../../utils/prayerTrackerMessages';
import {
  computeStreak,
  countTodayProgress,
  dayQuality,
  formatPercent,
  lastNDayKeys,
  statsForLastNDays,
  PRAYERS_PER_DAY,
} from '../../utils/prayerTrackerStats';
import { getNextSalahFromTodayTimings, getSuggestedLogPrayer } from '../../utils/prayerNextFromTimings';
import { AppAlert } from '../../components/organisms/AppAlert/AppAlert';
import { hapticLight, hapticSuccess } from '../../utils/appHaptics';

const CELEBRATE = require('../../assets/lottie/celebrate.json');

const DISPLAY_NAMES: Record<FiveDailyPrayer, string> = {
  Fajr: 'Fajr',
  Dhuhr: 'Zohar',
  Asr: 'Asr',
  Maghrib: 'Maghrib',
  Isha: 'Isha',
};

const HISTORY_DAYS = 28;

export function PrayerTrackerScreen() {
  const { colors: c, scheme } = useThemePalette();
  const styles = useMemo(() => createPrayerTrackerStyles(c, scheme), [c, scheme]);
  const heroOnFill = scheme === 'dark' ? c.onPrimaryContainer : c.onPrimary;
  const reduceMotion = useReducedMotion();
  // Flashes a soft gold wash over the day summary when all five prayers are completed.
  const perfectGlow = useSharedValue(0);
  const perfectGlowStyle = useAnimatedStyle(() => ({ opacity: perfectGlow.value }));

  // Living streak flame: a gentle continuous flicker (scale + tilt + warmth).
  const flame = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    flame.value = withRepeat(
      withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [reduceMotion, flame]);
  const flameStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 + flame.value * 0.14 },
      { rotate: `${(flame.value - 0.5) * 6}deg` },
    ],
  }));
  const flameGlowStyle = useAnimatedStyle(() => ({ opacity: 0.35 + flame.value * 0.4 }));

  const todayKey = dayjs().format('YYYY-MM-DD');
  const minHistoryKey = dayjs(todayKey).subtract(400, 'day').format('YYYY-MM-DD');

  const [selectedKey, setSelectedKey] = useState(todayKey);
  const [calendarOpen, setCalendarOpen] = useState(false);
  /** Bumped each time a prayer is freshly marked prayed → replays the Noor burst. */
  const [noorKey, setNoorKey] = useState(0);
  /** Bumped when a mark completes all five prayers → plays the celebration burst. */
  const [perfectKey, setPerfectKey] = useState(0);

  useEffect(() => {
    if (selectedKey > todayKey) setSelectedKey(todayKey);
  }, [todayKey, selectedKey]);

  const uid = useAuthStore(s => s.firebaseUser?.uid ?? null);

  const byDay = usePrayerTrackerStore(s => s.byDay);
  const markPrayer = usePrayerTrackerStore(s => s.markPrayer);
  const resetDay = usePrayerTrackerStore(s => s.resetDay);

  const masterEnabled = useAdhanSettingsStore(s => s.masterEnabled);

  const { todayTimings, coords } = usePrayerTimesHome();

  const selectedLog = byDay[selectedKey];
  const progress = countTodayProgress(selectedLog);

  const streak = useMemo(() => computeStreak(byDay, todayKey), [byDay, todayKey]);
  const weekly = useMemo(() => statsForLastNDays(byDay, todayKey, 7), [byDay, todayKey]);
  const monthly = useMemo(() => statsForLastNDays(byDay, todayKey, 30), [byDay, todayKey]);

  const messageSeed = dayjs().date() + dayjs().month() * 31 + streak * 7;
  const headline = useMemo(() => {
    if (selectedKey < todayKey) {
      return getPastDayEncouragement(progress.prayed, progress.missed, progress.pending);
    }
    return getEncouragementMessage(
      {
        streak,
        todayPrayed: progress.prayed,
        todayMissed: progress.missed,
        todayPending: progress.pending,
        weekly,
        monthly,
      },
      messageSeed,
    );
  }, [
    selectedKey,
    todayKey,
    streak,
    progress.prayed,
    progress.missed,
    progress.pending,
    weekly,
    monthly,
    messageSeed,
  ]);

  const weekKeys = useMemo(() => lastNDayKeys(todayKey, 7), [todayKey]);

  const dayChips = useMemo(() => {
    const keys: string[] = [];
    for (let i = HISTORY_DAYS - 1; i >= 0; i--) {
      keys.push(dayjs(todayKey).subtract(i, 'day').format('YYYY-MM-DD'));
    }
    return keys;
  }, [todayKey]);

  const nextSalah = useMemo(() => {
    if (!todayTimings || selectedKey !== todayKey) return null;
    return getNextSalahFromTodayTimings(new Date(), todayTimings);
  }, [todayTimings, selectedKey, todayKey]);

  const suggestedPrayer = useMemo(() => {
    if (!todayTimings || selectedKey !== todayKey) return null;
    return getSuggestedLogPrayer(new Date(), todayTimings);
  }, [todayTimings, selectedKey, todayKey]);

  const syncReminders = useCallback(async () => {
    try {
      if (!todayTimings || !masterEnabled) {
        await cancelAllAdhanReminders();
        return;
      }
      await rescheduleAdhanReminders(todayTimings);
    } catch {
      /* native module / permission */
    }
  }, [todayTimings, masterEnabled]);

  useFocusEffect(
    useCallback(() => {
      setPrayerSyncUser(uid);
      if (uid) void pullAndMergePrayer(uid);
      syncReminders();
    }, [syncReminders, uid]),
  );

  useEffect(() => {
    syncReminders();
  }, [syncReminders]);

  const onMark = (prayer: FiveDailyPrayer, status: PrayerMark) => {
    const cur = selectedLog?.[prayer];
    if (cur === status) {
      hapticLight();
      markPrayer(selectedKey, prayer, 'clear');
    } else {
      if (status === 'prayed') {
        hapticSuccess();
        setNoorKey(k => k + 1);
        // Perfect-day celebration: this mark completes all five for the day.
        const prayedAfter = FIVE_DAILY_PRAYERS.reduce(
          (n, p) =>
            n + ((p === prayer ? 'prayed' : selectedLog?.[p]) === 'prayed' ? 1 : 0),
          0,
        );
        if (prayedAfter === PRAYERS_PER_DAY) {
          setPerfectKey(k => k + 1);
          if (!reduceMotion) {
            perfectGlow.value = withSequence(
              withTiming(1, { duration: 280 }),
              withTiming(0, { duration: 1100 }),
            );
          }
        }
      } else hapticLight();
      markPrayer(selectedKey, prayer, status);
    }
  };

  const isPerfectDay = progress.prayed === PRAYERS_PER_DAY;

  const onResetDay = () => {
    const label = dayjs(selectedKey).format('MMM D');
    AppAlert.show(
      `Reset ${label}?`,
      'Clears all ✓ / ✗ marks for this day.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => resetDay(selectedKey),
        },
      ],
      { variant: 'confirmation' }
    );
  };

  const yesterdayKey = dayjs(todayKey).subtract(1, 'day').format('YYYY-MM-DD');
  const sectionTitle =
    selectedKey === todayKey
      ? 'Today'
      : selectedKey === yesterdayKey
        ? 'Yesterday'
        : dayjs(selectedKey).format('MMM D');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {noorKey > 0 ? (
        <View pointerEvents="none" style={styles.noorOverlay}>
          <NoorRing key={noorKey} playKey={noorKey} size={220} />
        </View>
      ) : null}
      <LottieBurst trigger={perfectKey} source={CELEBRATE} size={300} />

      <View style={styles.pad}>
        <ToolsSubheader title="Prayer tracker" subtitle="Log · streaks · reminders · history" />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScroll}
          style={styles.chipBar}>
          {dayChips.map(key => {
            const sel = key === selectedKey;
            const isToday = key === todayKey;
            return (
              <PressableScale
                key={key}
                to={0.93}
                onPress={() => setSelectedKey(key)}
                style={[styles.dayChip, sel && styles.dayChipSel]}
                accessibilityRole="button"
                accessibilityState={{ selected: sel }}
                accessibilityLabel={dayjs(key).format('MMMM D')}>
                <SazdaText
                  variant="caption"
                  color={sel ? 'onSecondaryContainer' : 'onSurfaceVariant'}
                  style={styles.dayChipDow}>
                  {dayjs(key).format('ddd')}
                </SazdaText>
                <SazdaText variant="titleSm" color={sel ? 'onSecondaryContainer' : 'primary'} style={styles.dayChipNum}>
                  {dayjs(key).date()}
                </SazdaText>
                {isToday ? (
                  <SazdaText variant="caption" color={sel ? 'onSecondaryContainer' : 'secondary'} style={styles.todayTag}>
                    Now
                  </SazdaText>
                ) : null}
              </PressableScale>
            );
          })}
        </ScrollView>

        <Pressable
          onPress={() => setCalendarOpen(true)}
          style={({ pressed }) => [styles.calendarLink, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Open calendar">
          <CalendarDays size={20} color={c.primary} strokeWidth={2} />
          <SazdaText variant="bodyMedium" color="primary" style={styles.calendarLinkText}>
            Calendar · jump to any day
          </SazdaText>
          <ChevronRight size={18} color={c.primary} />
        </Pressable>

        <MonthCalendarModal
          visible={calendarOpen}
          onClose={() => setCalendarOpen(false)}
          selectedKey={selectedKey}
          maxKey={todayKey}
          minKey={minHistoryKey}
          onSelectDate={setSelectedKey}
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <Animated.View entering={reduceMotion ? undefined : FadeInUp.duration(420)} style={styles.heroCard}>
            <View style={styles.heroWatermark} pointerEvents="none">
              <Flame size={150} color={heroOnFill} strokeWidth={1} />
            </View>
            <View style={styles.heroTop}>
              <View style={styles.streakBlock}>
                <View style={styles.flameWrap}>
                  <Animated.View style={[styles.flameGlow, flameGlowStyle]} pointerEvents="none" />
                  <Animated.View style={flameStyle}>
                    <Flame size={30} color={c.secondaryContainer} fill={c.secondaryContainer} />
                  </Animated.View>
                </View>
                <AnimatedCounter
                  value={streak}
                  durationMs={700}
                  color={heroOnFill}
                  style={styles.streakNum}
                />
                <SazdaText variant="label" color={heroOnFill} style={styles.streakLabel}>
                  day streak
                </SazdaText>
              </View>
              <View style={styles.heroMessageWrap}>
                <SazdaText variant="bodyMedium" color={heroOnFill} style={styles.heroMessage}>
                  {headline}
                </SazdaText>
              </View>
            </View>
            <SazdaText variant="caption" color={heroOnFill} style={styles.heroFoot}>
              Streak uses real today ({dayjs(todayKey).format('MMM D')}) — 5/5 prayed = perfect day.
            </SazdaText>
          </Animated.View>

          {selectedKey === todayKey && todayTimings ? (
            <View style={styles.nextCard}>
              <SazdaText variant="caption" color="onSurfaceVariant" style={styles.nextKicker}>
                Next salah (auto from your times)
              </SazdaText>
              {nextSalah ? (
                <>
                  <SazdaText variant="headlineMedium" color="primary" style={styles.nextTitle}>
                    {DISPLAY_NAMES[nextSalah.name]} · {nextSalah.label12h}
                  </SazdaText>
                  <SazdaText variant="bodyMedium" color="onSurfaceVariant" style={styles.nextSub}>
                    Log {DISPLAY_NAMES[nextSalah.name]} after you pray — tap ✓ when you&apos;re done.
                  </SazdaText>
                </>
              ) : (
                <SazdaText variant="bodyMedium" color="onSurfaceVariant">
                  Times loading…
                </SazdaText>
              )}
            </View>
          ) : selectedKey === todayKey && !coords ? (
            <View style={styles.nextCardMuted}>
              <SazdaText variant="bodyMedium" color="onSurfaceVariant">
                Enable location on Home for live next-salah hints here.
              </SazdaText>
            </View>
          ) : null}

          {selectedKey === todayKey && suggestedPrayer ? (
            <Text style={styles.suggestHint}>
              <Text style={styles.suggestHintMuted}>Suggested to log now: </Text>
              <Text style={styles.suggestHintBold}>{DISPLAY_NAMES[suggestedPrayer]}</Text>
            </Text>
          ) : null}

          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <ListChecks size={22} color={c.primary} strokeWidth={2} />
              <SazdaText variant="headlineMedium" color="primary" style={styles.sectionTitle}>
                {sectionTitle}
              </SazdaText>
            </View>
            <SazdaText variant="caption" color="onSurfaceVariant" style={styles.dateLine}>
              {dayjs(selectedKey).format('dddd, MMMM D, YYYY')}
            </SazdaText>
            <View style={styles.todayCard}>
              {FIVE_DAILY_PRAYERS.map((prayer, index) => {
                const status = selectedLog?.[prayer];
                const isLast = index === FIVE_DAILY_PRAYERS.length - 1;
                const suggest = selectedKey === todayKey && suggestedPrayer === prayer;
                return (
                  <View
                    key={prayer}
                    style={[
                      styles.prayerRow,
                      !isLast && styles.prayerRowBorder,
                      suggest && styles.prayerRowSuggest,
                    ]}>
                    <SazdaText variant="bodyMedium" color="onSurface" style={styles.prayerName}>
                      {DISPLAY_NAMES[prayer]}
                      {suggest ? ' · now' : ''}
                    </SazdaText>
                    <View style={styles.rowActions}>
                      <PressableScale
                        to={0.86}
                        onPress={() => onMark(prayer, 'prayed')}
                        style={[styles.markBtn, status === 'prayed' && styles.markBtnPrayed]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: status === 'prayed' }}
                        accessibilityLabel={`${DISPLAY_NAMES[prayer]} prayed`}>
                        <Check
                          size={20}
                          color={status === 'prayed' ? c.onSecondaryContainer : c.primary}
                          strokeWidth={2.75}
                        />
                      </PressableScale>
                      <PressableScale
                        to={0.86}
                        onPress={() => onMark(prayer, 'missed')}
                        style={[styles.markBtn, status === 'missed' && styles.markBtnMissed]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: status === 'missed' }}
                        accessibilityLabel={`${DISPLAY_NAMES[prayer]} missed`}>
                        <X
                          size={20}
                          color={status === 'missed' ? c.onPrimary : c.onSurfaceVariant}
                          strokeWidth={2.75}
                        />
                      </PressableScale>
                    </View>
                  </View>
                );
              })}
              <View style={styles.todaySummary}>
                <Animated.View
                  pointerEvents="none"
                  style={[styles.perfectGlowFill, perfectGlowStyle]}
                />
                <SazdaText variant="bodyMedium" color="onSurfaceVariant">
                  {progress.prayed}/{PRAYERS_PER_DAY} prayed
                  {progress.missed > 0 ? ` · ${progress.missed} missed` : ''}
                  {progress.pending > 0 ? ` · ${progress.pending} pending` : ''}
                </SazdaText>
                {isPerfectDay ? (
                  <SazdaText variant="caption" color="secondary" style={styles.perfectLabel}>
                    Perfect day — all five prayed
                  </SazdaText>
                ) : null}
              </View>
              <Pressable onPress={onResetDay} style={styles.resetLink} accessibilityRole="button">
                <SazdaText variant="caption" color="secondary" style={styles.resetLinkText}>
                  Reset this day
                </SazdaText>
              </Pressable>
            </View>
          </View>



          <View style={styles.section}>
            <SazdaText variant="headlineMedium" color="primary" style={styles.sectionTitleBare}>
              Last 7 days
            </SazdaText>
            <SazdaText variant="caption" color="onSurfaceVariant" style={styles.statsSub}>
              {weekly.perfectDays} perfect · {formatPercent(weekly.prayed, weekly.maxPrayers)} completion
            </SazdaText>
            <View style={styles.weekStrip}>
              {weekKeys.map(key => {
                const q = dayQuality(byDay[key]);
                const isToday = key === todayKey;
                const label = dayjs(key).format('ddd');
                return (
                  <View key={key} style={styles.weekCell}>
                    <SazdaText variant="caption" color="onSurfaceVariant" style={styles.weekDow}>
                      {label}
                    </SazdaText>
                    <View style={[styles.weekDotOuter, isToday && styles.weekDotOuterToday]}>
                      <View
                        style={[
                          styles.weekDot,
                          q === 'perfect' && styles.dotPerfect,
                          q === 'partial' && styles.dotPartial,
                          q === 'allMissed' && styles.dotMissed,
                          q === 'empty' && styles.dotEmpty,
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.statsCard}>
            <SazdaText variant="titleSm" color="primary" style={styles.statsCardTitle}>
              This week
            </SazdaText>
            <View style={styles.statsGrid}>
              <StatCell s={styles} label="Prayers logged" value={`${weekly.prayed} / ${weekly.maxPrayers}`} />
              <StatCell s={styles} label="Perfect days" value={String(weekly.perfectDays)} />
              <StatCell s={styles} label="Missed marks" value={String(weekly.missed)} />
              <StatCell s={styles} label="Completion" value={formatPercent(weekly.prayed, weekly.maxPrayers)} />
            </View>
          </View>

          <View style={styles.statsCard}>
            <SazdaText variant="titleSm" color="primary" style={styles.statsCardTitle}>
              Last 30 days
            </SazdaText>
            <View style={styles.statsGrid}>
              <StatCell s={styles} label="Prayers logged" value={`${monthly.prayed} / ${monthly.maxPrayers}`} />
              <StatCell s={styles} label="Perfect days" value={String(monthly.perfectDays)} />
              <StatCell s={styles} label="Days with logs" value={String(monthly.daysTouched)} />
              <StatCell s={styles} label="Completion" value={formatPercent(monthly.prayed, monthly.maxPrayers)} />
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function createPrayerTrackerStyles(c: AppPalette, scheme: ResolvedScheme) {
  const heroFill = scheme === 'dark' ? c.primaryContainer : c.primary;
  const hairline08 = scheme === 'dark' ? 'rgba(142,207,178,0.12)' : 'rgba(0, 53, 39, 0.08)';
  const hairline06 = scheme === 'dark' ? 'rgba(142,207,178,0.1)' : 'rgba(0, 53, 39, 0.06)';
  const suggestBg = scheme === 'dark' ? 'rgba(212,175,55,0.12)' : 'rgba(254, 214, 91, 0.18)';

  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.surface },
  noorOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  pad: { flex: 1, paddingHorizontal: spacing.lg },
  chipBar: { maxHeight: 88, marginBottom: spacing.sm },
  chipScroll: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingRight: spacing.lg,
  },
  dayChip: {
    width: 56,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: c.surfaceContainerLow,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dayChipSel: {
    backgroundColor: c.secondaryContainer,
    borderColor: 'rgba(115, 92, 0, 0.25)',
  },
  dayChipDow: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  dayChipNum: { fontWeight: '800', marginTop: 2 },
  todayTag: { fontSize: 8, fontWeight: '800', marginTop: 2 },
  calendarLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingVertical: spacing.xs,
  },
  calendarLinkText: { flex: 1, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: {
    paddingBottom: spacing.x3xl,
    gap: spacing.lg,
  },
  heroCard: {
    backgroundColor: heroFill,
    borderRadius: radius.md + 10,
    padding: spacing.xl,
    gap: spacing.md,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: scheme === 'dark' ? 'rgba(0,0,0,0.45)' : 'rgba(0, 53, 39, 0.28)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 28,
    elevation: 8,
  },
  heroWatermark: {
    position: 'absolute',
    right: -26,
    bottom: -30,
    opacity: 0.08,
  },
  heroTop: {
    flexDirection: 'row',
    gap: spacing.lg,
    alignItems: 'flex-start',
  },
  streakBlock: {
    alignItems: 'center',
    minWidth: 80,
  },
  flameWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 40,
  },
  flameGlow: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.secondaryContainer,
  },
  streakNum: {
    fontSize: 46,
    lineHeight: 52,
    fontWeight: '900',
    marginTop: spacing.xs,
    textAlign: 'center',
    letterSpacing: -1,
  },
  streakLabel: {
    opacity: 0.85,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontSize: 10,
    marginTop: 2,
  },
  heroMessageWrap: { flex: 1, minWidth: 0, justifyContent: 'center' },
  heroMessage: {
    lineHeight: 22,
    opacity: 0.95,
  },
  heroFoot: {
    opacity: 0.72,
    lineHeight: 16,
    fontSize: 11,
  },
  nextCard: {
    backgroundColor: c.surfaceContainerLow,
    borderRadius: radius.md + 6,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: hairline08,
    gap: spacing.xs,
  },
  nextCardMuted: {
    backgroundColor: c.surfaceContainerLow,
    borderRadius: radius.md + 6,
    padding: spacing.md,
  },
  nextKicker: {
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontSize: 10,
  },
  nextTitle: { fontWeight: '800', marginTop: spacing.xs },
  nextSub: { lineHeight: 20, marginTop: spacing.xs },
  suggestHint: { textAlign: 'center', marginTop: -spacing.sm, fontSize: 12 },
  suggestHintMuted: { color: c.secondary, fontWeight: '600' },
  suggestHintBold: { color: c.primary, fontWeight: '800' },
  section: {
    gap: spacing.sm,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: { fontWeight: '800' },
  sectionTitleBare: { fontWeight: '800' },
  dateLine: {
    marginBottom: spacing.xs,
    opacity: 0.88,
  },
  todayCard: {
    backgroundColor: c.surfaceContainerLow,
    borderRadius: radius.md + 6,
    borderWidth: 1,
    borderColor: hairline06,
    overflow: 'hidden',
  },
  prayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  prayerRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: hairline08,
  },
  prayerRowSuggest: {
    backgroundColor: suggestBg,
  },
  prayerName: { fontWeight: '700', flex: 1 },
  rowActions: { flexDirection: 'row', gap: spacing.sm },
  markBtn: {
    width: 46,
    height: 46,
    borderRadius: radius.md + 2,
    backgroundColor: c.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  markBtnPrayed: {
    backgroundColor: c.secondaryContainer,
    borderColor: 'rgba(115, 92, 0, 0.3)',
    shadowColor: c.secondary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: scheme === 'dark' ? 0.5 : 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  markBtnMissed: {
    backgroundColor: c.error,
    borderColor: 'rgba(186, 26, 26, 0.35)',
  },
  pressed: { opacity: 0.88 },
  todaySummary: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    overflow: 'hidden',
  },
  perfectGlowFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: c.secondaryContainer,
    opacity: 0,
  },
  perfectLabel: {
    fontWeight: '800',
    letterSpacing: 0.3,
    marginTop: 4,
  },
  resetLink: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    alignSelf: 'flex-start',
  },
  resetLinkText: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  reminderCard: {
    backgroundColor: c.surfaceContainerLow,
    borderRadius: radius.md + 8,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: hairline06,
    gap: spacing.md,
  },
  reminderHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reminderTitle: { flex: 1, fontWeight: '800' },
  reminderSub: { lineHeight: 18, opacity: 0.9 },
  leadLabel: { fontWeight: '700', marginTop: spacing.xs },
  leadRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  leadChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: 'rgba(0, 53, 39, 0.1)',
  },
  leadChipOn: {
    backgroundColor: c.secondaryContainer,
    borderColor: 'rgba(115, 92, 0, 0.3)',
  },
  leadChipText: { fontWeight: '800' },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: hairline08,
  },
  reminderPrayer: { fontWeight: '600' },
  statsSub: { marginBottom: spacing.sm },
  weekStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: c.surfaceContainerLow,
    borderRadius: radius.md + 4,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: hairline06,
  },
  weekCell: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  weekDow: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  weekDotOuter: {
    padding: 2,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  weekDotOuterToday: {
    borderColor: c.primary,
  },
  weekDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  dotPerfect: {
    backgroundColor: c.secondaryContainer,
    borderWidth: 2,
    borderColor: c.secondary,
  },
  dotPartial: {
    backgroundColor: 'rgba(6, 78, 59, 0.2)',
    borderWidth: 2,
    borderColor: c.primaryContainer,
  },
  dotMissed: {
    backgroundColor: 'rgba(186, 26, 26, 0.25)',
    borderWidth: 2,
    borderColor: c.error,
  },
  dotEmpty: {
    backgroundColor: c.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: scheme === 'dark' ? 'rgba(142,207,178,0.18)' : 'rgba(0, 53, 39, 0.12)',
  },
  statsCard: {
    backgroundColor: c.surfaceContainerLow,
    borderRadius: radius.md + 8,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: hairline06,
    gap: spacing.md,
  },
  statsCardTitle: { fontWeight: '800' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCell: {
    width: '47%',
    minWidth: 140,
    backgroundColor: c.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    opacity: 0.85,
  },
  statValue: {
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});
}

type TrackerStyles = ReturnType<typeof createPrayerTrackerStyles>;

function StatCell({ s, label, value }: { s: TrackerStyles; label: string; value: string }) {
  return (
    <View style={s.statCell}>
      <SazdaText variant="caption" color="onSurfaceVariant" style={s.statLabel}>
        {label}
      </SazdaText>
      <SazdaText variant="titleSm" color="primary" style={s.statValue}>
        {value}
      </SazdaText>
    </View>
  );
}

