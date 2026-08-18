import { useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  Calculator,
  ChevronRight,
  History,
  LayoutList,
  PieChart,
  Plus,
} from 'lucide-react-native';
import {
  deriveCycle,
  formatInrPaise,
  paymentsForCycle,
  pickActiveCycle,
} from '../../../features/zakat';
import { useZakatStore } from '../../../store/zakatStore';
import { useAuthStore } from '../../../store/authStore';
import { pullAndMergeZakat, setZakatSyncUser } from '../../../services/zakatCloudSync';
import type { ToolsStackParamList } from '../../../navigation/types';
import { PressableScale } from '../../../components/atoms/PressableScale/PressableScale';
import { AnimatedCounter } from '../../../components/atoms/AnimatedCounter/AnimatedCounter';
import { radius } from '../../../theme/radius';
import { spacing } from '../../../theme/spacing';
import { fontFamilies } from '../../../theme/typography';
import { motionEasing } from '../../../theme/motion';
import { useThemePalette } from '../../../theme/useThemePalette';

type Nav = NativeStackNavigationProp<ToolsStackParamList, 'ZakatHome'>;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const RING_SIZE = 108;
const RING_SW = 9;

function Ring({ progress, color, track }: { progress: number; color: string; track: string }) {
  const r = (RING_SIZE - RING_SW) / 2;
  const circ = 2 * Math.PI * r;
  const reduce = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    const target = Math.min(1, Math.max(0, progress));
    p.value = reduce ? target : withTiming(target, { duration: 950, easing: motionEasing.standardOut });
  }, [progress, reduce, p]);
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: circ * (1 - p.value) }));
  return (
    <Svg width={RING_SIZE} height={RING_SIZE} style={styles.ringSvg}>
      <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={r} stroke={track} strokeWidth={RING_SW} fill="none" />
      <AnimatedCircle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={r}
        stroke={color}
        strokeWidth={RING_SW}
        fill="none"
        strokeDasharray={circ}
        animatedProps={animatedProps}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function ZakatDashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { colors: c, scheme } = useThemePalette();
  const primaryTint = scheme === 'dark' ? 'rgba(146,226,200,0.14)' : 'rgba(6, 78, 59, 0.09)';
  const secondaryTint = scheme === 'dark' ? 'rgba(233,200,74,0.16)' : 'rgba(254, 214, 91, 0.32)';
  const uid = useAuthStore(s => s.firebaseUser?.uid ?? null);

  const cyclesById = useZakatStore(s => s.cyclesById);
  const cycleIds = useZakatStore(s => s.cycleIds);
  const activeCycleId = useZakatStore(s => s.activeCycleId);
  const paymentsById = useZakatStore(s => s.paymentsById);
  const ensureDefaultCycle = useZakatStore(s => s.ensureDefaultCycle);

  useFocusEffect(
    useCallback(() => {
      setZakatSyncUser(uid);
      ensureDefaultCycle();
      if (uid) void pullAndMergeZakat(uid);
    }, [uid, ensureDefaultCycle]),
  );

  const active = useMemo(
    () => pickActiveCycle(cyclesById, cycleIds, activeCycleId),
    [cyclesById, cycleIds, activeCycleId],
  );

  const plist = useMemo(
    () => (active ? paymentsForCycle(paymentsById, active.id) : []),
    [active, paymentsById],
  );

  const derived = useMemo(
    () => (active ? deriveCycle(active, plist) : null),
    [active, plist],
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.surface }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: c.primary }]}>{active?.label ?? 'Zakat'}</Text>
        {active ? (
          <Text style={[styles.sub, { color: c.onSurfaceVariant }]}>
            {active.archived ? 'Archived cycle' : 'Active cycle'}
          </Text>
        ) : null}

        <PressableScale
          to={0.98}
          onPress={() => navigation.navigate('ZakatCycleManage')}
          style={[styles.cycleCard, { backgroundColor: c.surfaceContainerLow }]}>
          <View style={styles.cycleCardTextContainer}>
            <Text style={[styles.cycleCardTitle, { color: c.onSurface }]}>Zakat cycle</Text>
            <Text style={[styles.cycleCardHint, { color: c.onSurfaceVariant }]}>
              Switch year / manage cycles
            </Text>
          </View>
          <ChevronRight size={20} color={c.onSurfaceVariant} style={styles.cycleChevron} />
        </PressableScale>

        {derived && active ? (
          <View style={[styles.hero, { backgroundColor: c.surfaceContainerLowest }]}>
            <View style={styles.ringCol}>
              <View style={[styles.ringGlow, { backgroundColor: c.primary }]} pointerEvents="none" />
              <Ring
                progress={derived.progress01}
                color={c.primary}
                track={c.surfaceContainerHighest}
              />
              <View style={styles.ringCenter} pointerEvents="none">
                <AnimatedCounter
                  value={Math.round(derived.progress01 * 100)}
                  suffix="%"
                  durationMs={950}
                  color={c.primary}
                  style={styles.pct}
                />
                <Text style={[styles.pctLabel, { color: c.onSurfaceVariant }]}>paid</Text>
              </View>
            </View>
            <View style={styles.stats}>
              <Row label="Due (total)" value={formatInrPaise(derived.totalPaise)} c={c} />
              <Row label="Paid" value={formatInrPaise(derived.paidPaise)} c={c} />
              <Row label="Remaining" value={formatInrPaise(derived.remainingPaise)} c={c} accent={c.primary} />
              {derived.overpayPaise > 0 ? (
                <Row
                  label="Overpaid"
                  value={formatInrPaise(derived.overpayPaise)}
                  c={c}
                  accent={c.secondary}
                />
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={styles.actions}>
          <PressableScale
            to={0.97}
            onPress={() => navigation.navigate('ZakatAddPayment', { cycleId: active?.id })}
            style={[styles.primaryBtn, { backgroundColor: c.primaryContainer }]}>
            <Plus size={22} color={c.onPrimary} strokeWidth={2.25} />
            <Text style={[styles.primaryBtnText, { color: c.onPrimary }]}>Add payment</Text>
          </PressableScale>

          <View style={styles.row2}>
            <MiniTile
              icon={<Calculator size={20} color={c.primary} />}
              label="Calculator"
              tint={primaryTint}
              onPress={() => navigation.navigate('ZakatCalculator')}
              c={c}
            />
            <MiniTile
              icon={<History size={20} color={c.primary} />}
              label="History"
              tint={primaryTint}
              onPress={() => navigation.navigate('ZakatPaymentHistory', { cycleId: active?.id })}
              c={c}
            />
          </View>
          <View style={styles.row2}>
            <MiniTile
              icon={<PieChart size={20} color={c.secondary} />}
              label="Insights"
              tint={secondaryTint}
              onPress={() => navigation.navigate('ZakatInsights', { cycleId: active?.id })}
              c={c}
            />
            <MiniTile
              icon={<LayoutList size={20} color={c.secondary} />}
              label="Cycles"
              tint={secondaryTint}
              onPress={() => navigation.navigate('ZakatCycleManage')}
              c={c}
            />
          </View>
        </View>

        <Text style={[styles.disclaimer, { color: c.onSurfaceVariant }]}>
          All amounts in Indian Rupees (₹). Estimates are not a fatwa — consult a scholar for nisāb,
          debts, and gold/silver rules. Fix a wrong due amount under Cycles (edit due) or use the
          calculator; edit individual payments from History.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  label,
  value,
  c,
  accent,
}: {
  label: string;
  value: string;
  c: ReturnType<typeof useThemePalette>['colors'];
  accent?: string;
}) {
  return (
    <View style={styles.statRow}>
      <Text style={[styles.statLabel, { color: c.onSurfaceVariant }]}>{label}</Text>
      <Text style={[styles.statValue, { color: accent ?? c.primary }]}>{value}</Text>
    </View>
  );
}

function MiniTile({
  icon,
  label,
  tint,
  onPress,
  c,
}: {
  icon: ReactNode;
  label: string;
  tint: string;
  onPress: () => void;
  c: ReturnType<typeof useThemePalette>['colors'];
}) {
  return (
    <PressableScale
      to={0.96}
      onPress={onPress}
      style={[
        styles.miniTile,
        { backgroundColor: c.surfaceContainerLow, borderColor: 'rgba(0,53,39,0.08)' },
      ]}>
      <View style={[styles.miniIcon, { backgroundColor: tint }]}>{icon}</View>
      <Text style={[styles.miniLabel, { color: c.onSurface }]}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.x3xl,
    gap: spacing.md,
  },
  title: {
    fontFamily: fontFamilies.headline,
    fontSize: 28,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  sub: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  cycleCard: {
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cycleCardTextContainer: {
    flex: 1,
    minWidth: 0,
    paddingRight: spacing.md,
  },
  cycleCardTitle: { fontSize: 16, fontWeight: '800' },
  cycleCardHint: { fontSize: 12, marginTop: 4 },
  cycleChevron: {},
  hero: {
    flexDirection: 'row',
    borderRadius: radius.md + 6,
    padding: spacing.lg + 2,
    gap: spacing.lg,
    marginTop: spacing.sm,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,53,39,0.06)',
    shadowColor: 'rgba(0,53,39,0.18)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 4,
  },
  ringCol: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringSvg: { transform: [{ rotate: '-90deg' }] },
  ringGlow: {
    position: 'absolute',
    width: RING_SIZE - 24,
    height: RING_SIZE - 24,
    borderRadius: RING_SIZE,
    opacity: 0.12,
  },
  ringCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  pct: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5, textAlign: 'center' },
  pctLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginTop: -2 },
  stats: { flex: 1, gap: spacing.sm, justifyContent: 'center' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { fontSize: 13, fontWeight: '600' },
  statValue: { fontSize: 15, fontWeight: '800' },
  actions: { gap: spacing.md, marginTop: spacing.md },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 54,
    borderRadius: radius.full,
    shadowColor: 'rgba(0,53,39,0.3)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 5,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '800' },
  row2: { flexDirection: 'row', gap: spacing.sm },
  miniTile: {
    flex: 1,
    minHeight: 96,
    borderRadius: radius.md + 2,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
  },
  miniIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md - 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniLabel: { fontSize: 14, fontWeight: '700' },
  disclaimer: { fontSize: 12, lineHeight: 18, marginTop: spacing.lg },
});
