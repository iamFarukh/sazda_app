import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, type RouteProp } from '@react-navigation/native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { HandCoins, PieChart } from 'lucide-react-native';
import { computeInsights, formatInrPaise, paymentsForCycle } from '../../../features/zakat';
import { PAYMENT_CATEGORY_LABEL } from '../../../features/zakat/uiLabels';
import type { ToolsStackParamList } from '../../../navigation/types';
import { useZakatStore } from '../../../store/zakatStore';
import { SazdaText } from '../../../components/atoms/SazdaText/SazdaText';
import { Skeleton } from '../../../components/atoms/Skeleton/Skeleton';
import { EmptyState } from '../../../components/molecules/EmptyState/EmptyState';
import { useReduceMotion } from '../../../hooks/useReduceMotion';
import { elevation } from '../../../theme/elevation';
import { motionDurations, motionEasing } from '../../../theme/motion';
import { radius } from '../../../theme/radius';
import { spacing } from '../../../theme/spacing';
import { useThemePalette } from '../../../theme/useThemePalette';

type R = RouteProp<ToolsStackParamList, 'ZakatInsights'>;

type Palette = ReturnType<typeof useThemePalette>['colors'];

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** "2026-03" → "Mar 2026" (display only). */
function formatMonthKey(key: string): string {
  const [year, month] = key.split('-');
  const name = MONTH_NAMES[Number(month) - 1];
  return name ? `${name} ${year}` : key;
}

function CategoryBar({
  label,
  value,
  fraction,
  delayMs,
  fillColor,
  c,
}: {
  label: string;
  value: string;
  /** 0..1 share of the largest category (drives the fill width). */
  fraction: number;
  delayMs: number;
  fillColor: string;
  c: Palette;
}) {
  const reduce = useReduceMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    const target = Math.min(1, Math.max(0, fraction));
    if (reduce) {
      progress.value = target;
      return;
    }
    progress.value = withDelay(
      delayMs,
      withTiming(target, {
        duration: motionDurations.slower,
        easing: motionEasing.emphasizedOut,
      }),
    );
  }, [fraction, reduce, delayMs, progress]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <View accessible accessibilityLabel={`${label}: ${value}`} style={styles.barBlock}>
      <View style={styles.barHead}>
        <SazdaText variant="titleSm" color="onSurface" numberOfLines={1} style={styles.barLabel}>
          {label}
        </SazdaText>
        <SazdaText variant="titleSm" color="secondary" style={styles.tabular}>
          {value}
        </SazdaText>
      </View>
      <View style={[styles.track, { backgroundColor: c.surfaceContainerHighest }]}>
        <Animated.View style={[styles.fill, { backgroundColor: fillColor }, fillStyle]} />
      </View>
    </View>
  );
}

function InsightsSkeleton() {
  return (
    <View style={styles.pad}>
      <View style={styles.header}>
        <Skeleton width={92} height={12} radius={6} />
        <Skeleton width={200} height={24} radius={8} />
      </View>
      <Skeleton height={116} radius={radius.md} />
      <View style={styles.row2}>
        <Skeleton height={92} radius={radius.md} style={styles.rowHalf} />
        <Skeleton height={92} radius={radius.md} style={styles.rowHalf} />
      </View>
      <Skeleton width={140} height={18} radius={6} style={styles.sectionGap} />
      <Skeleton height={180} radius={radius.md} />
      <Skeleton width={150} height={18} radius={6} style={styles.sectionGap} />
      <Skeleton height={140} radius={radius.md} />
    </View>
  );
}

export function ZakatInsightsScreen() {
  const route = useRoute<R>();
  const { colors: c, scheme } = useThemePalette();
  const reduce = useReduceMotion();

  const paymentsById = useZakatStore(s => s.paymentsById);
  const activeCycleId = useZakatStore(s => s.activeCycleId);
  const cyclesById = useZakatStore(s => s.cyclesById);

  const [hydrated, setHydrated] = useState(() => useZakatStore.persist.hasHydrated());
  useEffect(() => {
    return useZakatStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  const cycleId = route.params?.cycleId ?? activeCycleId ?? '';
  const cycle = cyclesById[cycleId];

  const payments = useMemo(
    () => (cycle ? paymentsForCycle(paymentsById, cycle.id) : []),
    [cycle, paymentsById],
  );

  const insights = useMemo(() => computeInsights(payments), [payments]);

  const totalPaise = useMemo(
    () => insights.byCategory.reduce((sum, row) => sum + row.totalPaise, 0),
    [insights.byCategory],
  );

  const maxCat = useMemo(
    () => Math.max(1, ...insights.byCategory.map(x => x.totalPaise)),
    [insights.byCategory],
  );

  const months = useMemo(() => {
    return Object.entries(insights.byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6);
  }, [insights.byMonth]);

  const heroStyle = useMemo(
    () => [styles.heroCard, { backgroundColor: c.secondaryContainer }, elevation('md', scheme)],
    [c, scheme],
  );
  const statCardStyle = useMemo(
    () => [
      styles.statCard,
      { backgroundColor: c.surfaceContainerLowest, borderColor: c.outlineVariant },
      elevation('sm', scheme),
    ],
    [c, scheme],
  );
  const panelStyle = useMemo(
    () => [
      styles.panel,
      { backgroundColor: c.surfaceContainerLowest, borderColor: c.outlineVariant },
      elevation('sm', scheme),
    ],
    [c, scheme],
  );

  const entering = (index: number) =>
    reduce
      ? undefined
      : FadeInDown.delay(index * 70)
          .duration(motionDurations.slow)
          .easing(motionEasing.standardOut);

  if (!hydrated) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.surface }]} edges={['bottom']}>
        <InsightsSkeleton />
      </SafeAreaView>
    );
  }

  if (!cycle) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.surface }]} edges={['bottom']}>
        <View style={styles.centerFill}>
          <EmptyState
            icon={<PieChart size={32} color={c.onSurfaceVariant} />}
            title="No cycle selected"
            message="Pick or create a zakat cycle from the dashboard to see your giving insights."
          />
        </View>
      </SafeAreaView>
    );
  }

  const hasData = insights.paymentCount > 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.surface }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.pad} showsVerticalScrollIndicator={false}>
        <Animated.View entering={entering(0)} style={styles.header}>
          <SazdaText variant="label" color="onSurfaceVariant">
            Zakat cycle
          </SazdaText>
          <SazdaText variant="headlineMedium" color="primary">
            {cycle.label}
          </SazdaText>
        </Animated.View>

        {!hasData ? (
          <Animated.View entering={entering(1)}>
            <EmptyState
              compact
              icon={<HandCoins size={32} color={c.onSurfaceVariant} />}
              title="No insights yet"
              message="Record a payment in this cycle and your giving breakdown will appear here."
            />
          </Animated.View>
        ) : (
          <>
            <Animated.View
              entering={entering(1)}
              accessible
              accessibilityRole="text"
              accessibilityLabel={`Total given: ${formatInrPaise(totalPaise)}, across ${insights.paymentCount} payments`}
              style={heroStyle}>
              <View style={styles.heroTopRow}>
                <SazdaText variant="label" color="onSecondaryContainer">
                  Total given
                </SazdaText>
                <HandCoins size={18} color={c.onSecondaryContainer} />
              </View>
              <SazdaText
                variant="headlineLarge"
                color="onSecondaryContainer"
                style={styles.tabular}>
                {formatInrPaise(totalPaise)}
              </SazdaText>
              <SazdaText variant="caption" color="onSecondaryContainer">
                across this cycle
              </SazdaText>
            </Animated.View>

            <Animated.View entering={entering(2)} style={styles.row2}>
              <View
                accessible
                accessibilityRole="text"
                accessibilityLabel={`Payments recorded: ${insights.paymentCount}`}
                style={statCardStyle}>
                <SazdaText variant="label" color="onSurfaceVariant">
                  Payments
                </SazdaText>
                <SazdaText variant="headlineMedium" color="primary" style={styles.tabular}>
                  {insights.paymentCount}
                </SazdaText>
                <SazdaText variant="caption" color="onSurfaceVariant">
                  recorded
                </SazdaText>
              </View>
              {insights.largestPayment ? (
                <View
                  accessible
                  accessibilityRole="text"
                  accessibilityLabel={`Largest payment: ${formatInrPaise(insights.largestPayment.amountPaise)}, ${PAYMENT_CATEGORY_LABEL[insights.largestPayment.category]}`}
                  style={statCardStyle}>
                  <SazdaText variant="label" color="onSurfaceVariant">
                    Largest
                  </SazdaText>
                  <SazdaText
                    variant="headlineMedium"
                    color="primary"
                    numberOfLines={1}
                    style={styles.tabular}>
                    {formatInrPaise(insights.largestPayment.amountPaise)}
                  </SazdaText>
                  <SazdaText variant="caption" color="onSurfaceVariant" numberOfLines={1}>
                    {PAYMENT_CATEGORY_LABEL[insights.largestPayment.category]}
                  </SazdaText>
                </View>
              ) : null}
            </Animated.View>

            {insights.mostFrequentCategory ? (
              <Animated.View
                entering={entering(3)}
                accessible
                accessibilityRole="text"
                accessibilityLabel={`Most frequent category: ${PAYMENT_CATEGORY_LABEL[insights.mostFrequentCategory]}`}
                style={[statCardStyle, styles.wideCard]}>
                <View style={styles.wideCardText}>
                  <SazdaText variant="label" color="onSurfaceVariant">
                    Top category
                  </SazdaText>
                  <SazdaText variant="titleLarge" color="onSurface" numberOfLines={1}>
                    {PAYMENT_CATEGORY_LABEL[insights.mostFrequentCategory]}
                  </SazdaText>
                </View>
                <View style={[styles.freqChip, { backgroundColor: c.surfaceContainerHighest }]}>
                  <SazdaText variant="caption" color="onSurfaceVariant">
                    most frequent
                  </SazdaText>
                </View>
              </Animated.View>
            ) : null}

            <Animated.View entering={entering(4)} style={styles.sectionGap}>
              <SazdaText variant="titleLarge" color="primary" style={styles.sectionTitle}>
                By category
              </SazdaText>
              <View style={panelStyle}>
                {insights.byCategory.map((row, i) => (
                  <CategoryBar
                    key={row.category}
                    label={PAYMENT_CATEGORY_LABEL[row.category]}
                    value={formatInrPaise(row.totalPaise)}
                    fraction={row.totalPaise / maxCat}
                    delayMs={200 + i * 90}
                    fillColor={i === 0 ? c.gold : c.primary}
                    c={c}
                  />
                ))}
              </View>
            </Animated.View>

            <Animated.View entering={entering(5)} style={styles.sectionGap}>
              <SazdaText variant="titleLarge" color="primary" style={styles.sectionTitle}>
                Recent months
              </SazdaText>
              {months.length === 0 ? (
                <SazdaText variant="bodySmall" color="onSurfaceVariant">
                  No monthly data yet.
                </SazdaText>
              ) : (
                <View style={[panelStyle, styles.monthPanel]}>
                  {months.map(([m, paise], i) => (
                    <View
                      key={m}
                      accessible
                      accessibilityRole="text"
                      accessibilityLabel={`${formatMonthKey(m)}: ${formatInrPaise(paise)}`}
                      style={[
                        styles.monthRow,
                        i < months.length - 1 && [
                          styles.monthRowDivider,
                          { borderBottomColor: c.outlineVariant },
                        ],
                      ]}>
                      <SazdaText variant="bodySmall" color="onSurface">
                        {formatMonthKey(m)}
                      </SazdaText>
                      <SazdaText variant="titleSm" color="primary" style={styles.tabular}>
                        {formatInrPaise(paise)}
                      </SazdaText>
                    </View>
                  ))}
                </View>
              )}
            </Animated.View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  pad: { padding: spacing.lg, paddingBottom: spacing.x3xl, gap: spacing.md },
  centerFill: { flex: 1, justifyContent: 'center' },
  header: { gap: spacing.xxs },
  heroCard: {
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.xxs,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  row2: { flexDirection: 'row', gap: spacing.sm },
  rowHalf: { flex: 1 },
  statCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xxs,
    borderWidth: StyleSheet.hairlineWidth,
  },
  wideCard: {
    flex: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  wideCardText: { flex: 1, minWidth: 0, gap: spacing.xxs },
  freqChip: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  sectionGap: { marginTop: spacing.sm },
  sectionTitle: { marginBottom: spacing.sm },
  panel: {
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  barBlock: { gap: spacing.xs },
  barHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  barLabel: { flex: 1, minWidth: 0 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  monthPanel: { gap: 0, paddingVertical: spacing.xs },
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  monthRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth },
  tabular: { fontVariant: ['tabular-nums'] },
});
