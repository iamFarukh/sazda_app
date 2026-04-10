import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react-native';
import { SazdaText } from '../../components/atoms/SazdaText/SazdaText';
import { ToolsSubheader } from '../../components/molecules/ToolsSubheader/ToolsSubheader';
import {
  buildIslamicEventsFromMonth,
  fetchGregorianToHijri,
  fetchHijriMonth,
  type HijriDayInfo,
  type IslamicEventRow,
} from '../../services/hijriCalendarApi';
import { dayjs } from '../../utils/dayjs';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import type { AppPalette } from '../../theme/useThemePalette';
import type { ResolvedScheme } from '../../theme/useThemePalette';
import { useThemePalette } from '../../theme/useThemePalette';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MAX_EVENTS = 18;

function leadPaddingDays(firstGregorianDdMmYyyy: string): number {
  const [d, m, y] = firstGregorianDdMmYyyy.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

export function HijriCalendarScreen() {
  const { colors: c, scheme } = useThemePalette();
  const styles = useMemo(() => createStyles(c, scheme), [c, scheme]);

  const [tick, setTick] = useState(0);
  const todayDdMmYyyy = useMemo(() => dayjs().format('DD-MM-YYYY'), [tick]);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const {
    data: todayInfo,
    isError: todayErr,
    refetch: refetchToday,
    isFetching: todayFetching,
  } = useQuery({
    queryKey: ['hijri', 'today', todayDdMmYyyy],
    queryFn: () => fetchGregorianToHijri(todayDdMmYyyy),
    staleTime: 60_000,
    refetchInterval: 300_000,
  });

  const [cursor, setCursor] = useState<{ m: number; y: number } | null>(null);

  useEffect(() => {
    if (todayInfo && cursor === null) {
      setCursor({ m: todayInfo.hijriMonth, y: todayInfo.hijriYear });
    }
  }, [todayInfo, cursor]);

  useEffect(() => {
    if (todayErr && cursor === null) {
      setCursor({ m: 9, y: 1447 });
    }
  }, [todayErr, cursor]);

  const {
    data: monthDays,
    isPending,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['hijri', 'month', cursor?.m, cursor?.y],
    queryFn: () => fetchHijriMonth(cursor!.m, cursor!.y),
    enabled: cursor !== null,
    staleTime: 1000 * 60 * 60 * 6,
  });

  const goPrev = useCallback(() => {
    setCursor(prev => {
      if (!prev) return prev;
      if (prev.m <= 1) return { m: 12, y: prev.y - 1 };
      return { m: prev.m - 1, y: prev.y };
    });
  }, []);

  const goNext = useCallback(() => {
    setCursor(prev => {
      if (!prev) return prev;
      if (prev.m >= 12) return { m: 1, y: prev.y + 1 };
      return { m: prev.m + 1, y: prev.y };
    });
  }, []);

  const goThisMonth = useCallback(() => {
    if (todayInfo)
      setCursor({ m: todayInfo.hijriMonth, y: todayInfo.hijriYear });
  }, [todayInfo]);

  const headerTitle = monthDays?.[0]?.hijriMonthEn ?? '…';
  const headerYear = monthDays?.[0]?.hijriYear ?? '';

  const gridCells = useMemo(() => {
    if (!monthDays?.length) return { lead: 0, cells: [] as HijriDayInfo[] };
    const lead = leadPaddingDays(monthDays[0].gregorianDdMmYyyy);
    return { lead, cells: monthDays };
  }, [monthDays]);

  const events = useMemo(() => {
    if (!monthDays?.length) return [];
    return buildIslamicEventsFromMonth(monthDays, todayDdMmYyyy).slice(
      0,
      MAX_EVENTS,
    );
  }, [monthDays, todayDdMmYyyy]);

  const isViewingCurrentMonth =
    todayInfo &&
    cursor &&
    cursor.m === todayInfo.hijriMonth &&
    cursor.y === todayInfo.hijriYear;

  const subheaderSubtitle = todayErr
    ? 'Could not load today — showing a sample month. Pull to refresh when online.'
    : todayInfo
    ? `Today · ${todayInfo.hijriDay} ${todayInfo.hijriMonthEn} ${todayInfo.hijriYear} AH · ${todayInfo.gregorianReadable}`
    : 'Live Hijri & Gregorian · Aladhan';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.padH}>
        <ToolsSubheader title="Hijri calendar" subtitle={subheaderSubtitle} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={todayFetching || (!!cursor && isFetching)}
            onRefresh={() => {
              void refetchToday();
              void refetch();
            }}
            tintColor={c.primary}
          />
        }
      >
        {todayErr ? (
          <Pressable onPress={() => refetchToday()} style={styles.errorBanner}>
            <SazdaText variant="bodyMedium" color="error" align="center">
              Could not refresh today’s date. Tap to retry.
            </SazdaText>
          </Pressable>
        ) : null}

        <View style={styles.heroRow}>
          <View style={styles.heroText}>
            <SazdaText
              variant="headlineLarge"
              color="primary"
              style={styles.heroMonth}
            >
              {isPending && !monthDays ? '…' : headerTitle}
            </SazdaText>
            <SazdaText
              variant="headlineMedium"
              color="secondary"
              style={styles.heroYear}
            >
              {headerYear ? `${headerYear} AH` : ''}
            </SazdaText>
          </View>
          <View style={styles.heroNav}>
            <Pressable
              onPress={goPrev}
              style={({ pressed }) => [
                styles.navBtn,
                pressed && styles.navBtnPressed,
              ]}
              accessibilityLabel="Previous Hijri month"
            >
              <ChevronLeft size={22} color={c.primary} strokeWidth={2.25} />
            </Pressable>
            <Pressable
              onPress={goNext}
              style={({ pressed }) => [
                styles.navBtn,
                pressed && styles.navBtnPressed,
              ]}
              accessibilityLabel="Next Hijri month"
            >
              <ChevronRight size={22} color={c.primary} strokeWidth={2.25} />
            </Pressable>
          </View>
        </View>

        {!isViewingCurrentMonth && todayInfo ? (
          <Pressable onPress={goThisMonth} style={styles.jumpToday}>
            <SazdaText
              variant="caption"
              color="secondary"
              style={styles.jumpTodayText}
            >
              Jump to this month
            </SazdaText>
          </Pressable>
        ) : null}

        <View style={styles.bleed} pointerEvents="none" />

        {!cursor || isPending ? (
          <ActivityIndicator
            style={styles.loader}
            color={c.primary}
            size="large"
          />
        ) : isError ? (
          <Pressable onPress={() => refetch()} style={styles.errorBanner}>
            <SazdaText variant="bodyMedium" color="error" align="center">
              Could not load this Hijri month. Tap to retry.
            </SazdaText>
          </Pressable>
        ) : (
          <Animated.View
            key={`${cursor?.m}-${cursor?.y}`}
            entering={FadeIn.duration(320)}
          >
            <View style={styles.gridCard}>
              <View style={styles.weekRow}>
                {WEEKDAYS.map(w => (
                  <View key={w} style={styles.weekCell}>
                    <SazdaText
                      variant="label"
                      color="primary"
                      style={styles.weekLabel}
                    >
                      {w}
                    </SazdaText>
                  </View>
                ))}
              </View>
              <View style={styles.daysGrid}>
                {Array.from({ length: gridCells.lead }).map((_, i) => (
                  <View key={`e-${i}`} style={styles.dayCell} />
                ))}
                {gridCells.cells.map(d => (
                  <DayCell
                    key={d.gregorianDdMmYyyy}
                    day={d}
                    todayDdMmYyyy={todayDdMmYyyy}
                    styles={styles}
                    scheme={scheme}
                    colors={c}
                  />
                ))}
              </View>
            </View>
          </Animated.View>
        )}

        <View style={styles.eventsHeader}>
          <SazdaText variant="titleSm" color="primary">
            Islamic events
          </SazdaText>
          <SazdaText
            variant="caption"
            color="secondary"
            style={styles.eventsKicker}
          >
            This month · API
          </SazdaText>
        </View>

        {events.length === 0 && monthDays?.length ? (
          <SazdaText
            variant="bodyMedium"
            color="onSurfaceVariant"
            style={styles.emptyEvents}
          >
            No marked holidays this month on the Umm al-Qura calendar.
          </SazdaText>
        ) : (
          <View style={styles.eventList}>
            {events.map(ev => (
              <EventCard key={ev.id} ev={ev} styles={styles} colors={c} />
            ))}
          </View>
        )}

        <View style={styles.quoteCard}>
          <Quote
            size={28}
            color={c.secondaryContainer}
            strokeWidth={1.75}
            style={styles.quoteIcon}
          />
          <SazdaText
            variant="bodyMedium"
            color="onPrimaryContainer"
            style={styles.quoteText}
          >
            “The best among you are those who have the best manners and
            character.”
          </SazdaText>
          <View style={styles.quoteRule} />
          <View style={styles.quoteDeco} pointerEvents="none" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function DayCell({
  day,
  todayDdMmYyyy,
  styles,
  scheme,
  colors,
}: {
  day: HijriDayInfo;
  todayDdMmYyyy: string;
  styles: ReturnType<typeof createStyles>;
  scheme: ResolvedScheme;
  colors: AppPalette;
}) {
  const isToday = day.gregorianDdMmYyyy === todayDdMmYyyy;
  const sub = useMemo(() => {
    const [d, m] = day.gregorianDdMmYyyy.split('-').map(Number);
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return `${d} ${months[m - 1] ?? ''}`;
  }, [day.gregorianDdMmYyyy]);

  return (
    <View style={styles.dayCell}>
      <View
        style={[
          styles.dayInner,
          isToday && {
            backgroundColor: colors.secondaryContainer,
            shadowColor: scheme === 'dark' ? '#000' : 'rgba(115, 92, 0, 0.2)',
            shadowOpacity: isToday ? 1 : 0,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 },
            elevation: isToday ? 3 : 0,
          },
        ]}
      >
        <SazdaText
          variant="titleSm"
          color={isToday ? 'onSecondaryContainer' : 'primary'}
          style={styles.dayNum}
        >
          {day.hijriDay}
        </SazdaText>
        <SazdaText
          variant="caption"
          color={isToday ? 'onSecondaryContainer' : 'outline'}
          style={[styles.daySub, isToday && { opacity: 0.85 }]}
        >
          {sub}
        </SazdaText>
      </View>
    </View>
  );
}

function EventCard({
  ev,
  styles,
  colors,
}: {
  ev: IslamicEventRow;
  styles: ReturnType<typeof createStyles>;
  colors: AppPalette;
}) {
  const borderColor =
    ev.accent === 'muted'
      ? `${colors.outline}55`
      : ev.accent === 'secondary'
      ? colors.secondary
      : colors.primary;
  const muted = ev.accent === 'muted';

  return (
    <View
      style={[
        styles.eventCard,
        { borderLeftColor: borderColor },
        muted && styles.eventCardMuted,
      ]}
    >
      <View style={[styles.eventBadge, muted && { opacity: 0.65 }]}>
        <SazdaText
          variant="caption"
          color="secondary"
          style={styles.eventBadgeDay}
        >
          {ev.hijriLabel.split(' ')[0]}
        </SazdaText>
        <SazdaText
          variant="label"
          color="secondary"
          style={styles.eventBadgeMon}
        >
          {ev.hijriLabel.split(' ').slice(1).join(' ') || ' '}
        </SazdaText>
      </View>
      <View style={styles.eventMid}>
        <SazdaText
          variant="titleSm"
          color="primary"
          style={muted ? { opacity: 0.62 } : undefined}
          numberOfLines={3}
        >
          {ev.title}
        </SazdaText>
        <SazdaText variant="caption" color="onSurfaceVariant" numberOfLines={2}>
          {ev.description}
        </SazdaText>
      </View>
      <View style={styles.eventRight}>
        <SazdaText
          variant="caption"
          color="primary"
          style={muted ? { opacity: 0.55 } : undefined}
        >
          {ev.gregorianLine}
        </SazdaText>
        <SazdaText variant="caption" color="outline" style={{ fontSize: 10 }}>
          {ev.weekdayLine}
        </SazdaText>
      </View>
    </View>
  );
}

function createStyles(c: AppPalette, scheme: ResolvedScheme) {
  const hairline =
    scheme === 'dark' ? 'rgba(142,207,178,0.12)' : 'rgba(0, 53, 39, 0.06)';
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.surface },
    padH: { paddingHorizontal: spacing.md },
    scroll: { flex: 1 },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.x3xl,
    },
    heroRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
      marginTop: spacing.sm,
    },
    heroText: { flex: 1, minWidth: 0, paddingRight: spacing.sm },
    heroMonth: {
      letterSpacing: -0.8,
      fontSize: 40,
      lineHeight: 44,
    },
    heroYear: { marginTop: 4, opacity: 0.88 },
    heroNav: { flexDirection: 'row', gap: spacing.sm, marginBottom: 4 },
    navBtn: {
      width: 40,
      height: 40,
      borderRadius: radius.full,
      backgroundColor: c.surfaceContainerLow,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navBtnPressed: { opacity: 0.88 },
    jumpToday: {
      alignSelf: 'flex-start',
      marginBottom: spacing.sm,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
    },
    jumpTodayText: { fontWeight: '700' },
    bleed: {
      position: 'absolute',
      right: -48,
      top: 96,
      width: 128,
      height: 128,
      borderRadius: 64,
      backgroundColor: c.primary,
      opacity: 0.05,
    },
    loader: { marginVertical: spacing.xl },
    errorBanner: { padding: spacing.lg, marginBottom: spacing.md },
    gridCard: {
      backgroundColor: c.surfaceContainerLowest,
      borderRadius: radius.md + 4,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: hairline,
      marginBottom: spacing.xl,
      shadowColor: 'rgba(6, 78, 59, 0.06)',
      shadowOpacity: 1,
      shadowRadius: 40,
      shadowOffset: { width: 0, height: 12 },
      elevation: 4,
    },
    weekRow: {
      flexDirection: 'row',
      marginBottom: spacing.sm,
    },
    weekCell: { width: '14.285%', alignItems: 'center' },
    weekLabel: { opacity: 0.4, fontSize: 10, letterSpacing: 1.2 },
    daysGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    dayCell: {
      width: '14.285%',
      paddingVertical: spacing.sm,
      alignItems: 'center',
    },
    dayInner: {
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 44,
      minHeight: 52,
      paddingVertical: spacing.xs,
      borderRadius: radius.full,
    },
    dayNum: { fontSize: 18 },
    daySub: { fontSize: 10, marginTop: 2 },
    eventsHeader: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    eventsKicker: { letterSpacing: 1.4, fontWeight: '700' },
    emptyEvents: { marginBottom: spacing.lg, opacity: 0.85 },
    eventList: { gap: spacing.md },
    eventCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.lg,
      backgroundColor: c.surfaceContainerLow,
      borderRadius: radius.md,
      borderLeftWidth: 4,
      gap: spacing.md,
    },
    eventCardMuted: { opacity: 0.72 },
    eventBadge: {
      width: 48,
      height: 48,
      borderRadius: radius.full,
      backgroundColor: `${c.secondaryContainer}33`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    eventBadgeDay: { fontWeight: '800' },
    eventBadgeMon: { fontSize: 8, marginTop: 2 },
    eventMid: { flex: 1, minWidth: 0, gap: 4 },
    eventRight: { alignItems: 'flex-end', gap: 2 },
    quoteCard: {
      marginTop: spacing.xl,
      backgroundColor: c.primaryContainer,
      borderRadius: radius.md + 4,
      padding: spacing.xl,
      overflow: 'hidden',
      position: 'relative',
    },
    quoteIcon: { marginBottom: spacing.sm },
    quoteText: {
      fontStyle: 'italic',
      lineHeight: 26,
      opacity: 0.95,
      zIndex: 1,
    },
    quoteRule: {
      marginTop: spacing.lg,
      width: 48,
      height: StyleSheet.hairlineWidth,
      backgroundColor: `${c.secondaryContainer}66`,
      zIndex: 1,
    },
    quoteDeco: {
      position: 'absolute',
      bottom: -40,
      right: -40,
      width: 192,
      height: 192,
      borderRadius: 96,
      borderWidth: 12,
      borderColor: `${c.secondary}18`,
    },
  });
}
