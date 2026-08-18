import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { FlatList, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { HandCoins, HeartHandshake, Landmark, Tag, Trash2, Users } from 'lucide-react-native';
import { TextInput } from '../../../components/atoms/TextInput/TextInput';
import { SazdaText } from '../../../components/atoms/SazdaText/SazdaText';
import { PressableScale } from '../../../components/atoms/PressableScale/PressableScale';
import { Skeleton } from '../../../components/atoms/Skeleton/Skeleton';
import { EmptyState } from '../../../components/molecules/EmptyState/EmptyState';
import { useReduceMotion } from '../../../hooks/useReduceMotion';
import { useTrueSheetOpenSync } from '../../../hooks/useTrueSheetOpenSync';
import {
  formatInrPaise,
  parseRupeesInput,
  paymentsForCycle,
  rupeesToPaise,
} from '../../../features/zakat';
import { PAYMENT_CATEGORIES, PAYMENT_CATEGORY_LABEL } from '../../../features/zakat/uiLabels';
import type { ZakatPayment, ZakatPaymentCategory } from '../../../features/zakat/types';
import type { ToolsStackParamList } from '../../../navigation/types';
import { useZakatStore } from '../../../store/zakatStore';
import { useAuthStore } from '../../../store/authStore';
import { elevation } from '../../../theme/elevation';
import { motionDurations, motionEasing } from '../../../theme/motion';
import { radius } from '../../../theme/radius';
import { spacing } from '../../../theme/spacing';
import { useThemePalette } from '../../../theme/useThemePalette';
import { hapticLight, hapticMedium, hapticSuccess } from '../../../utils/appHaptics';
import { AppAlert } from '../../../components/organisms/AppAlert/AppAlert';

type R = RouteProp<ToolsStackParamList, 'ZakatPaymentHistory'>;

const SHEET_NAME = 'zakat-payment-edit';

type IconComponent = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

const CATEGORY_ICON: Record<ZakatPaymentCategory, IconComponent> = {
  masjid: Landmark,
  poor: HeartHandshake,
  relative: Users,
  other: Tag,
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** "2026-04" -> "April 2026" (Intl-free; falls back for malformed keys). */
function formatMonthLabel(key: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(key);
  const idx = m ? Number(m[2]) - 1 : -1;
  if (!m || idx < 0 || idx > 11) return 'Undated';
  return `${MONTH_NAMES[idx]} ${m[1]}`;
}

/** "2026-04-04" -> "4 Apr 2026" (falls back to the raw string). */
function formatDayLabel(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  const idx = m ? Number(m[2]) - 1 : -1;
  if (!m || idx < 0 || idx > 11) return iso;
  return `${Number(m[3])} ${MONTH_NAMES[idx].slice(0, 3)} ${m[1]}`;
}

type HistoryRow =
  | { kind: 'month'; key: string; label: string; totalPaise: number }
  | { kind: 'payment'; key: string; payment: ZakatPayment };

/** Mirrors the summary + row shapes so content arrives without layout shift. */
function HistorySkeleton() {
  return (
    <View style={styles.skeletonWrap}>
      <Skeleton height={118} radius={radius.md} />
      <Skeleton width={150} height={12} radius={6} style={styles.skeletonMonth} />
      <Skeleton height={80} radius={radius.md} />
      <Skeleton height={80} radius={radius.md} />
      <Skeleton height={80} radius={radius.md} />
    </View>
  );
}

export function ZakatPaymentHistoryScreen() {
  const route = useRoute<R>();
  const { colors: c, scheme } = useThemePalette();
  const reduce = useReduceMotion();
  const uid = useAuthStore(s => s.firebaseUser?.uid ?? null);

  const paymentsById = useZakatStore(s => s.paymentsById);
  const activeCycleId = useZakatStore(s => s.activeCycleId);
  const cyclesById = useZakatStore(s => s.cyclesById);
  const updatePayment = useZakatStore(s => s.updatePayment);
  const deletePayment = useZakatStore(s => s.deletePayment);

  // Skeleton until the persisted store has rehydrated (same pattern as useSimpleGeolocation).
  const [hydrated, setHydrated] = useState(() => useZakatStore.persist.hasHydrated());
  useEffect(() => {
    if (hydrated) return;
    return useZakatStore.persist.onFinishHydration(() => setHydrated(true));
  }, [hydrated]);

  const cycleId = route.params?.cycleId ?? activeCycleId ?? '';
  const cycle = cyclesById[cycleId];

  const list = useMemo(
    () => (cycle ? paymentsForCycle(paymentsById, cycle.id) : []),
    [cycle, paymentsById],
  );

  const totalPaidPaise = useMemo(
    () => list.reduce((sum, p) => sum + Math.max(0, p.amountPaise), 0),
    [list],
  );

  // Flatten newest-first payments into month headers (with subtotals) + row items.
  const rows = useMemo<HistoryRow[]>(() => {
    const out: HistoryRow[] = [];
    let currentKey: string | null = null;
    let currentHeader: Extract<HistoryRow, { kind: 'month' }> | null = null;
    for (const p of list) {
      const monthKey = p.paidAtIso.slice(0, 7);
      if (monthKey !== currentKey || !currentHeader) {
        currentKey = monthKey;
        currentHeader = {
          kind: 'month',
          key: `month-${monthKey}-${out.length}`,
          label: formatMonthLabel(monthKey),
          totalPaise: 0,
        };
        out.push(currentHeader);
      }
      currentHeader.totalPaise += Math.max(0, p.amountPaise);
      out.push({ kind: 'payment', key: p.id, payment: p });
    }
    return out;
  }, [list]);

  const primaryTint = scheme === 'dark' ? 'rgba(146,226,200,0.14)' : 'rgba(6, 78, 59, 0.09)';
  const errorTint = scheme === 'dark' ? 'rgba(255,180,171,0.14)' : 'rgba(186, 26, 26, 0.08)';

  const [editing, setEditing] = useState<ZakatPayment | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editCat, setEditCat] = useState<ZakatPaymentCategory>('other');
  const [editDay, setEditDay] = useState('');
  const [editNote, setEditNote] = useState('');

  const sheetRef = useRef<TrueSheet>(null);
  const closeEditSheet = useCallback(() => setEditing(null), []);
  const onSheetDidDismiss = useTrueSheetOpenSync(sheetRef, !!editing, closeEditSheet);

  const openEdit = useCallback((p: ZakatPayment) => {
    hapticLight();
    setEditing(p);
    setEditAmount((p.amountPaise / 100).toFixed(0));
    setEditCat(p.category);
    setEditDay(p.paidAtIso);
    setEditNote(p.note);
  }, []);

  const saveEdit = () => {
    if (!editing) return;
    const r = parseRupeesInput(editAmount);
    if (r == null) {
      AppAlert.show('Invalid amount', undefined, undefined, { variant: 'info' });
      return;
    }
    const res = updatePayment(editing.id, {
      amountPaise: rupeesToPaise(r),
      category: editCat,
      paidAtIso: editDay,
      note: editNote,
    });
    if (!res.ok) {
      AppAlert.show('Error', res.error, undefined, { variant: 'destructive' });
    } else {
      hapticSuccess();
      setEditing(null);
    }
  };

  const confirmDelete = (p: ZakatPayment) => {
    hapticMedium();
    AppAlert.show('Delete payment?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deletePayment(p.id, uid).catch(() => undefined);
        },
      },
    ], { variant: 'destructive' });
  };

  const rowEntering = (index: number) =>
    reduce
      ? undefined
      : FadeInDown.delay(Math.min(index, 8) * 45)
          .duration(motionDurations.slow)
          .easing(motionEasing.standardOut);

  const listHeader =
    cycle && list.length > 0 ? (
      <Animated.View
        entering={
          reduce
            ? undefined
            : FadeInDown.duration(motionDurations.slow).easing(motionEasing.standardOut)
        }
        accessible
        accessibilityLabel={`Total recorded ${formatInrPaise(totalPaidPaise)}, ${list.length} ${
          list.length === 1 ? 'payment' : 'payments'
        }, ${cycle.label}`}
        style={[
          styles.summaryCard,
          { backgroundColor: c.surfaceContainerLowest, borderColor: c.outlineVariant },
          elevation('sm', scheme),
        ]}>
        <View style={styles.summaryText}>
          <SazdaText variant="label" color="onSurfaceVariant" style={styles.summaryLabel}>
            Total recorded
          </SazdaText>
          <SazdaText variant="headlineLarge" color="primary" numberOfLines={1}>
            {formatInrPaise(totalPaidPaise)}
          </SazdaText>
          <SazdaText variant="caption" color="onSurfaceVariant" style={styles.summaryMeta}>
            {list.length} {list.length === 1 ? 'payment' : 'payments'} · {cycle.label}
          </SazdaText>
        </View>
        <View style={[styles.summaryIcon, { backgroundColor: primaryTint }]}>
          <HandCoins size={22} color={c.primary} />
        </View>
      </Animated.View>
    ) : null;

  const renderRow = ({ item, index }: { item: HistoryRow; index: number }) => {
    if (item.kind === 'month') {
      return (
        <Animated.View
          entering={rowEntering(index)}
          style={[styles.monthHeader, index > 0 && styles.monthHeaderSpaced]}>
          <SazdaText variant="label" color="onSurfaceVariant" style={styles.monthLabel}>
            {item.label}
          </SazdaText>
          <SazdaText variant="caption" color="onSurfaceVariant">
            {formatInrPaise(item.totalPaise)}
          </SazdaText>
        </Animated.View>
      );
    }

    const p = item.payment;
    const Icon = CATEGORY_ICON[p.category];
    return (
      <Animated.View entering={rowEntering(index)}>
        <PressableScale
          to={0.98}
          onPress={() => openEdit(p)}
          accessibilityRole="button"
          accessibilityLabel={`${formatInrPaise(p.amountPaise)}, ${
            PAYMENT_CATEGORY_LABEL[p.category]
          }, ${formatDayLabel(p.paidAtIso)}${p.note ? `, note: ${p.note}` : ''}`}
          accessibilityHint="Opens the edit payment sheet"
          style={[
            styles.rowCard,
            { backgroundColor: c.surfaceContainerLow, borderColor: c.outlineVariant },
            elevation('sm', scheme),
          ]}>
          <View style={[styles.rowIcon, { backgroundColor: primaryTint }]}>
            <Icon size={18} color={c.primary} strokeWidth={2} />
          </View>
          <View style={styles.rowBody}>
            <SazdaText variant="titleLarge" color="onSurface" numberOfLines={1}>
              {formatInrPaise(p.amountPaise)}
            </SazdaText>
            <SazdaText variant="caption" color="onSurfaceVariant" style={styles.rowMeta}>
              {PAYMENT_CATEGORY_LABEL[p.category]} · {formatDayLabel(p.paidAtIso)}
            </SazdaText>
            {p.note ? (
              <SazdaText
                variant="caption"
                color="onSurfaceVariant"
                numberOfLines={2}
                style={styles.rowNote}>
                {p.note}
              </SazdaText>
            ) : null}
          </View>
          <PressableScale
            to={0.9}
            hitSlop={8}
            onPress={() => confirmDelete(p)}
            accessibilityRole="button"
            accessibilityLabel={`Delete payment of ${formatInrPaise(p.amountPaise)}`}
            style={[styles.deleteBtn, { backgroundColor: errorTint }]}>
            <Trash2 size={16} color={c.error} />
          </PressableScale>
        </PressableScale>
      </Animated.View>
    );
  };

  return (
    <>
    <SafeAreaView style={[styles.safe, { backgroundColor: c.surface }]} edges={['bottom']}>
      {!hydrated ? (
        <HistorySkeleton />
      ) : !cycle ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon={<HandCoins size={34} color={c.onSurfaceVariant} />}
            title="No cycle found"
            message="Create or choose a zakat cycle from the dashboard to view its payment history."
          />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={item => item.key}
          renderItem={renderRow}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.list, rows.length === 0 && styles.listEmpty]}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <EmptyState
              icon={<HandCoins size={34} color={c.onSurfaceVariant} />}
              title="No payments yet"
              message={`Payments you record for ${cycle.label} will appear here, grouped by month.`}
            />
          }
        />
      )}
    </SafeAreaView>

    <TrueSheet
      ref={sheetRef}
      name={SHEET_NAME}
      detents={['auto']}
      cornerRadius={radius.md + 14}
      backgroundColor={c.surface}
      dimmed
      grabber={false}
      draggable
      dismissible
      scrollable
      scrollableOptions={{ keyboardScrollOffset: 32 }}
      onDidDismiss={onSheetDidDismiss}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        contentContainerStyle={styles.sheetScroll}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.sheetHandle, { backgroundColor: c.surfaceContainerHighest }]} />
        <SazdaText variant="headlineMedium" color="primary" style={styles.sheetTitle}>
          Edit payment
        </SazdaText>
        <SazdaText variant="label" color="onSurfaceVariant" style={styles.sheetLabel}>
          Amount (₹)
        </SazdaText>
        <TextInput value={editAmount} onChangeText={setEditAmount} keyboardType="decimal-pad" />
        <SazdaText variant="label" color="onSurfaceVariant" style={styles.sheetLabel}>
          Category
        </SazdaText>
        <View style={styles.catWrap}>
          {PAYMENT_CATEGORIES.map(cat => {
            const selected = editCat === cat;
            return (
              <PressableScale
                key={cat}
                to={0.94}
                onPress={() => {
                  hapticLight();
                  setEditCat(cat);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={PAYMENT_CATEGORY_LABEL[cat]}
                style={[
                  styles.catChip,
                  {
                    backgroundColor: selected ? c.primaryContainer : c.surfaceContainerLow,
                    borderColor: selected ? c.primary : c.outlineVariant,
                  },
                ]}>
                <SazdaText variant="titleSm" color={selected ? 'onPrimary' : 'onSurface'}>
                  {PAYMENT_CATEGORY_LABEL[cat]}
                </SazdaText>
              </PressableScale>
            );
          })}
        </View>
        <SazdaText variant="label" color="onSurfaceVariant" style={styles.sheetLabel}>
          Date (YYYY-MM-DD)
        </SazdaText>
        <TextInput value={editDay} onChangeText={setEditDay} />
        <SazdaText variant="label" color="onSurfaceVariant" style={styles.sheetLabel}>
          Note
        </SazdaText>
        <TextInput value={editNote} onChangeText={setEditNote} />
        <View style={styles.sheetBtns}>
          <PressableScale
            to={0.96}
            onPress={() => {
              sheetRef.current?.dismiss().catch(() => undefined);
            }}
            accessibilityRole="button"
            accessibilityLabel="Cancel editing"
            style={styles.sheetBtn}>
            <SazdaText variant="titleSm" color="onSurfaceVariant">
              Cancel
            </SazdaText>
          </PressableScale>
          <PressableScale
            to={0.96}
            onPress={saveEdit}
            accessibilityRole="button"
            accessibilityLabel="Save payment changes"
            style={[styles.sheetBtn, { backgroundColor: c.primaryContainer }]}>
            <SazdaText variant="titleSm" color="onPrimary">
              Save
            </SazdaText>
          </PressableScale>
        </View>
      </ScrollView>
    </TrueSheet>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.x3xl,
    gap: spacing.sm,
  },
  listEmpty: { flexGrow: 1, justifyContent: 'center' },
  emptyWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg },

  skeletonWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  skeletonMonth: { marginTop: spacing.sm, marginLeft: spacing.xxs },

  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    marginBottom: spacing.xs,
  },
  summaryText: { flex: 1, minWidth: 0, paddingRight: spacing.md },
  summaryLabel: { letterSpacing: 1, textTransform: 'uppercase', marginBottom: spacing.xxs },
  summaryMeta: { marginTop: spacing.xxs },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },

  monthHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxs,
  },
  monthHeaderSpaced: { marginTop: spacing.sm },
  monthLabel: { letterSpacing: 0.8, textTransform: 'uppercase' },

  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowMeta: { marginTop: 2 },
  rowNote: { marginTop: 2, fontStyle: 'italic' },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sheetScroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.x3xl,
    gap: spacing.sm,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    marginBottom: spacing.md,
  },
  sheetTitle: { marginBottom: spacing.xs },
  sheetLabel: { letterSpacing: 0.6, textTransform: 'uppercase', marginTop: spacing.xs },
  catWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  catChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sheetBtns: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  sheetBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    minWidth: 96,
    alignItems: 'center',
  },
});
