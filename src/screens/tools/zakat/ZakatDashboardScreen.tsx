import { useCallback, useMemo, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Circle } from 'react-native-svg';
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
import { radius } from '../../../theme/radius';
import { spacing } from '../../../theme/spacing';
import { fontFamilies } from '../../../theme/typography';
import { useThemePalette } from '../../../theme/useThemePalette';

type Nav = NativeStackNavigationProp<ToolsStackParamList, 'ZakatHome'>;

function Ring({ progress, color, track }: { progress: number; color: string; track: string }) {
  const size = 100;
  const sw = 8;
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * Math.min(1, Math.max(0, progress));
  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={sw} fill="none" />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={sw}
        fill="none"
        strokeDasharray={`${dash} ${c}`}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function ZakatDashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { colors: c } = useThemePalette();
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

        <Pressable
          onPress={() => navigation.navigate('ZakatCycleManage')}
          style={[styles.cycleCard, { backgroundColor: c.surfaceContainerLow }]}>
          <Text style={[styles.cycleCardTitle, { color: c.onSurface }]}>Zakat cycle</Text>
          <Text style={[styles.cycleCardHint, { color: c.onSurfaceVariant }]}>
            Switch year / manage cycles
          </Text>
          <ChevronRight size={20} color={c.onSurfaceVariant} style={styles.cycleChevron} />
        </Pressable>

        {derived && active ? (
          <View style={[styles.hero, { backgroundColor: c.surfaceContainerLowest }]}>
            <View style={styles.ringCol}>
              <Ring
                progress={derived.progress01}
                color={c.primary}
                track={c.surfaceContainerHighest}
              />
              <Text style={[styles.pct, { color: c.primary }]}>
                {Math.round(derived.progress01 * 100)}%
              </Text>
            </View>
            <View style={styles.stats}>
              <Row label="Due (total)" value={formatInrPaise(derived.totalPaise)} c={c} />
              <Row label="Paid" value={formatInrPaise(derived.paidPaise)} c={c} />
              <Row label="Remaining" value={formatInrPaise(derived.remainingPaise)} c={c} />
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
          <Pressable
            onPress={() => navigation.navigate('ZakatAddPayment', { cycleId: active?.id })}
            style={[styles.primaryBtn, { backgroundColor: c.primaryContainer }]}>
            <Plus size={22} color={c.onPrimary} strokeWidth={2.25} />
            <Text style={[styles.primaryBtnText, { color: c.onPrimary }]}>Add payment</Text>
          </Pressable>

          <View style={styles.row2}>
            <MiniTile
              icon={<Calculator size={20} color={c.primary} />}
              label="Calculator"
              onPress={() => navigation.navigate('ZakatCalculator')}
              c={c}
            />
            <MiniTile
              icon={<History size={20} color={c.primary} />}
              label="History"
              onPress={() => navigation.navigate('ZakatPaymentHistory', { cycleId: active?.id })}
              c={c}
            />
          </View>
          <View style={styles.row2}>
            <MiniTile
              icon={<PieChart size={20} color={c.secondary} />}
              label="Insights"
              onPress={() => navigation.navigate('ZakatInsights', { cycleId: active?.id })}
              c={c}
            />
            <MiniTile
              icon={<LayoutList size={20} color={c.secondary} />}
              label="Cycles"
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
  onPress,
  c,
}: {
  icon: ReactNode;
  label: string;
  onPress: () => void;
  c: ReturnType<typeof useThemePalette>['colors'];
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.miniTile,
        { backgroundColor: c.surfaceContainerLow, borderColor: 'rgba(0,53,39,0.08)' },
        pressed && { opacity: 0.92 },
      ]}>
      {icon}
      <Text style={[styles.miniLabel, { color: c.onSurface }]}>{label}</Text>
    </Pressable>
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
    position: 'relative',
  },
  cycleCardTitle: { fontSize: 16, fontWeight: '800' },
  cycleCardHint: { fontSize: 12, marginTop: 4 },
  cycleChevron: { position: 'absolute', right: spacing.lg, top: '50%', marginTop: -10 },
  hero: {
    flexDirection: 'row',
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.lg,
    marginTop: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,53,39,0.06)',
  },
  ringCol: { alignItems: 'center', justifyContent: 'center' },
  pct: { marginTop: 6, fontSize: 16, fontWeight: '800' },
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
    minHeight: 52,
    borderRadius: radius.full,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '800' },
  row2: { flexDirection: 'row', gap: spacing.sm },
  miniTile: {
    flex: 1,
    minHeight: 88,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
  },
  miniLabel: { fontSize: 14, fontWeight: '700' },
  disclaimer: { fontSize: 12, lineHeight: 18, marginTop: spacing.lg },
});
