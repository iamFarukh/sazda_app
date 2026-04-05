import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { TextInput } from '../../../components/atoms/TextInput/TextInput';
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
import { radius } from '../../../theme/radius';
import { spacing } from '../../../theme/spacing';
import { fontFamilies } from '../../../theme/typography';
import { useThemePalette } from '../../../theme/useThemePalette';

type R = RouteProp<ToolsStackParamList, 'ZakatPaymentHistory'>;

const SHEET_NAME = 'zakat-payment-edit';

export function ZakatPaymentHistoryScreen() {
  const route = useRoute<R>();
  const { colors: c } = useThemePalette();
  const uid = useAuthStore(s => s.firebaseUser?.uid ?? null);

  const paymentsById = useZakatStore(s => s.paymentsById);
  const activeCycleId = useZakatStore(s => s.activeCycleId);
  const cyclesById = useZakatStore(s => s.cyclesById);
  const updatePayment = useZakatStore(s => s.updatePayment);
  const deletePayment = useZakatStore(s => s.deletePayment);

  const cycleId = route.params?.cycleId ?? activeCycleId ?? '';
  const cycle = cyclesById[cycleId];

  const list = useMemo(
    () => (cycle ? paymentsForCycle(paymentsById, cycle.id) : []),
    [cycle, paymentsById],
  );

  const [editing, setEditing] = useState<ZakatPayment | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editCat, setEditCat] = useState<ZakatPaymentCategory>('other');
  const [editDay, setEditDay] = useState('');
  const [editNote, setEditNote] = useState('');

  const sheetRef = useRef<TrueSheet>(null);
  const closeEditSheet = useCallback(() => setEditing(null), []);
  const onSheetDidDismiss = useTrueSheetOpenSync(sheetRef, !!editing, closeEditSheet);

  const openEdit = useCallback((p: ZakatPayment) => {
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
      Alert.alert('Invalid amount');
      return;
    }
    const res = updatePayment(editing.id, {
      amountPaise: rupeesToPaise(r),
      category: editCat,
      paidAtIso: editDay,
      note: editNote,
    });
    if (!res.ok) Alert.alert('Error', res.error);
    else setEditing(null);
  };

  const confirmDelete = (p: ZakatPayment) => {
    Alert.alert('Delete payment?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void deletePayment(p.id, uid) },
    ]);
  };

  return (
    <>
    <SafeAreaView style={[styles.safe, { backgroundColor: c.surface }]} edges={['bottom']}>
      <Text style={[styles.title, { color: c.primary }]}>Payment history</Text>
      {cycle ? (
        <Text style={[styles.sub, { color: c.onSurfaceVariant }]}>{cycle.label}</Text>
      ) : (
        <Text style={[styles.sub, { color: c.error }]}>No cycle</Text>
      )}

      <FlatList
        data={list}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: c.onSurfaceVariant }]}>No payments yet.</Text>
        }
        renderItem={({ item }) => (
          <View style={[styles.row, { borderColor: c.outlineVariant }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.amt, { color: c.primary }]}>{formatInrPaise(item.amountPaise)}</Text>
              <Text style={[styles.meta, { color: c.onSurfaceVariant }]}>
                {PAYMENT_CATEGORY_LABEL[item.category]} · {item.paidAtIso}
              </Text>
              {item.note ? (
                <Text style={[styles.note, { color: c.onSurfaceVariant }]}>{item.note}</Text>
              ) : null}
            </View>
            <View style={styles.rowActions}>
              <Pressable onPress={() => openEdit(item)} hitSlop={8}>
                <Text style={[styles.link, { color: c.secondary }]}>Edit</Text>
              </Pressable>
              <Pressable onPress={() => confirmDelete(item)} hitSlop={8}>
                <Text style={[styles.link, { color: c.error }]}>Delete</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
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
        contentContainerStyle={styles.sheetScroll}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.sheetHandle, { backgroundColor: c.surfaceContainerHighest }]} />
        <Text style={[styles.modalTitle, { color: c.primary }]}>Edit payment</Text>
        <Text style={[styles.label, { color: c.onSurfaceVariant }]}>Amount ₹</Text>
        <TextInput value={editAmount} onChangeText={setEditAmount} keyboardType="decimal-pad" />
        <Text style={[styles.label, { color: c.onSurfaceVariant }]}>Category</Text>
        <View style={styles.catWrap}>
          {PAYMENT_CATEGORIES.map(cat => (
            <Pressable
              key={cat}
              onPress={() => setEditCat(cat)}
              style={[
                styles.miniChip,
                editCat === cat && { backgroundColor: c.primaryContainer },
              ]}>
              <Text style={{ color: editCat === cat ? c.onPrimary : c.onSurface, fontWeight: '700' }}>
                {PAYMENT_CATEGORY_LABEL[cat]}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={[styles.label, { color: c.onSurfaceVariant }]}>Date</Text>
        <TextInput value={editDay} onChangeText={setEditDay} />
        <Text style={[styles.label, { color: c.onSurfaceVariant }]}>Note</Text>
        <TextInput value={editNote} onChangeText={setEditNote} />
        <View style={styles.modalBtns}>
          <Pressable onPress={() => void sheetRef.current?.dismiss()} style={styles.modalBtn}>
            <Text style={{ color: c.onSurfaceVariant, fontWeight: '700' }}>Cancel</Text>
          </Pressable>
          <Pressable onPress={saveEdit} style={[styles.modalBtn, { backgroundColor: c.primaryContainer }]}>
            <Text style={{ color: c.onPrimary, fontWeight: '800' }}>Save</Text>
          </Pressable>
        </View>
      </ScrollView>
    </TrueSheet>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: spacing.lg },
  title: { fontFamily: fontFamilies.headline, fontSize: 22, fontWeight: '800', marginTop: spacing.sm },
  sub: { fontSize: 14, marginBottom: spacing.md },
  list: { paddingBottom: spacing.x3xl, gap: spacing.sm },
  empty: { textAlign: 'center', marginTop: spacing.x3xl },
  row: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'flex-start',
  },
  amt: { fontSize: 18, fontWeight: '800' },
  meta: { fontSize: 12, marginTop: 4 },
  note: { fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  rowActions: { gap: spacing.sm, alignItems: 'flex-end' },
  link: { fontSize: 14, fontWeight: '700' },
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
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: spacing.sm },
  label: { fontSize: 11, fontWeight: '800', marginTop: spacing.sm },
  catWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  miniChip: { paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.full },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.lg },
  modalBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.full },
});
