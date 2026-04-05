import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { computeInsights, formatInrPaise, paymentsForCycle } from '../../../features/zakat';
import { PAYMENT_CATEGORY_LABEL } from '../../../features/zakat/uiLabels';
import type { ToolsStackParamList } from '../../../navigation/types';
import { useZakatStore } from '../../../store/zakatStore';
import { radius } from '../../../theme/radius';
import { spacing } from '../../../theme/spacing';
import { fontFamilies } from '../../../theme/typography';
import { useThemePalette } from '../../../theme/useThemePalette';

type R = RouteProp<ToolsStackParamList, 'ZakatInsights'>;

export function ZakatInsightsScreen() {
  const route = useRoute<R>();
  const { colors: c } = useThemePalette();

  const paymentsById = useZakatStore(s => s.paymentsById);
  const activeCycleId = useZakatStore(s => s.activeCycleId);
  const cyclesById = useZakatStore(s => s.cyclesById);

  const cycleId = route.params?.cycleId ?? activeCycleId ?? '';
  const cycle = cyclesById[cycleId];

  const payments = useMemo(
    () => (cycle ? paymentsForCycle(paymentsById, cycle.id) : []),
    [cycle, paymentsById],
  );

  const insights = useMemo(() => computeInsights(payments), [payments]);

  const maxCat = useMemo(
    () => Math.max(1, ...insights.byCategory.map(x => x.totalPaise)),
    [insights.byCategory],
  );

  const months = useMemo(() => {
    return Object.entries(insights.byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6);
  }, [insights.byMonth]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.surface }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={[styles.title, { color: c.primary }]}>Insights</Text>
        {cycle ? (
          <Text style={[styles.sub, { color: c.onSurfaceVariant }]}>{cycle.label}</Text>
        ) : (
          <Text style={[styles.sub, { color: c.error }]}>No cycle selected</Text>
        )}

        <View style={[styles.card, { backgroundColor: c.surfaceContainerLow }]}>
          <Text style={[styles.cardTitle, { color: c.onSurface }]}>Summary</Text>
          <Text style={[styles.line, { color: c.onSurfaceVariant }]}>
            Payments recorded: {insights.paymentCount}
          </Text>
          {insights.largestPayment ? (
            <Text style={[styles.line, { color: c.onSurfaceVariant }]}>
              Largest: {formatInrPaise(insights.largestPayment.amountPaise)} (
              {PAYMENT_CATEGORY_LABEL[insights.largestPayment.category]})
            </Text>
          ) : null}
          {insights.mostFrequentCategory ? (
            <Text style={[styles.line, { color: c.onSurfaceVariant }]}>
              Most frequent category: {PAYMENT_CATEGORY_LABEL[insights.mostFrequentCategory]}
            </Text>
          ) : null}
        </View>

        <Text style={[styles.section, { color: c.primary }]}>By category</Text>
        {insights.byCategory.length === 0 ? (
          <Text style={{ color: c.onSurfaceVariant }}>No data yet.</Text>
        ) : (
          insights.byCategory.map(row => (
            <View key={row.category} style={styles.barBlock}>
              <View style={styles.barHead}>
                <Text style={[styles.barLabel, { color: c.onSurface }]}>
                  {PAYMENT_CATEGORY_LABEL[row.category]}
                </Text>
                <Text style={[styles.barVal, { color: c.secondary }]}>{formatInrPaise(row.totalPaise)}</Text>
              </View>
              <View style={[styles.track, { backgroundColor: c.surfaceContainerHighest }]}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${Math.round((row.totalPaise / maxCat) * 100)}%`,
                      backgroundColor: c.primaryContainer,
                    },
                  ]}
                />
              </View>
            </View>
          ))
        )}

        <Text style={[styles.section, { color: c.primary }]}>Recent months</Text>
        {months.length === 0 ? (
          <Text style={{ color: c.onSurfaceVariant }}>No monthly data yet.</Text>
        ) : (
          months.map(([m, paise]) => (
            <View key={m} style={styles.monthRow}>
              <Text style={[styles.monthKey, { color: c.onSurface }]}>{m}</Text>
              <Text style={[styles.monthVal, { color: c.primary }]}>{formatInrPaise(paise)}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  pad: { padding: spacing.lg, paddingBottom: spacing.x3xl, gap: spacing.md },
  title: { fontFamily: fontFamilies.headline, fontSize: 24, fontWeight: '800' },
  sub: { fontSize: 14, fontWeight: '600' },
  card: { borderRadius: radius.md, padding: spacing.lg, gap: spacing.xs },
  cardTitle: { fontSize: 16, fontWeight: '800', marginBottom: spacing.xs },
  line: { fontSize: 14 },
  section: { fontSize: 16, fontWeight: '800', marginTop: spacing.lg },
  barBlock: { marginTop: spacing.sm, gap: 6 },
  barHead: { flexDirection: 'row', justifyContent: 'space-between' },
  barLabel: { fontSize: 14, fontWeight: '700' },
  barVal: { fontSize: 13, fontWeight: '700' },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  monthKey: { fontSize: 14, fontWeight: '600' },
  monthVal: { fontSize: 14, fontWeight: '800' },
});
