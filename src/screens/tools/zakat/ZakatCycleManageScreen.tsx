import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TextInput } from '../../../components/atoms/TextInput/TextInput';
import { useTrueSheetOpenSync } from '../../../hooks/useTrueSheetOpenSync';
import {
  formatInrPaise,
  orderedCycles,
  parseRupeesInput,
  rupeesToPaise,
  validateCycleTotalPaise,
} from '../../../features/zakat';
import type { ZakatCycle } from '../../../features/zakat/types';
import type { ToolsStackParamList } from '../../../navigation/types';
import { useZakatStore } from '../../../store/zakatStore';
import { useAuthStore } from '../../../store/authStore';
import { radius } from '../../../theme/radius';
import { spacing } from '../../../theme/spacing';
import { fontFamilies } from '../../../theme/typography';
import { useThemePalette } from '../../../theme/useThemePalette';
import { AppAlert } from '../../../components/organisms/AppAlert/AppAlert';

type Nav = NativeStackNavigationProp<ToolsStackParamList, 'ZakatCycleManage'>;

const SHEET_NAME = 'zakat-cycle-due-edit';

export function ZakatCycleManageScreen() {
  const navigation = useNavigation<Nav>();
  const { colors: c } = useThemePalette();
  const uid = useAuthStore(s => s.firebaseUser?.uid ?? null);

  const cyclesById = useZakatStore(s => s.cyclesById);
  const cycleIds = useZakatStore(s => s.cycleIds);
  const activeCycleId = useZakatStore(s => s.activeCycleId);
  const createCycle = useZakatStore(s => s.createCycle);
  const setActiveCycle = useZakatStore(s => s.setActiveCycle);
  const updateCycle = useZakatStore(s => s.updateCycle);
  const deleteCycle = useZakatStore(s => s.deleteCycle);

  const [showNew, setShowNew] = useState(false);
  const [label, setLabel] = useState('');
  const [yearStr, setYearStr] = useState(String(new Date().getFullYear()));
  const [startIso, setStartIso] = useState(new Date().toISOString().slice(0, 10));

  const [editingDue, setEditingDue] = useState<ZakatCycle | null>(null);
  const [editDueTotal, setEditDueTotal] = useState('');
  const [editDueWealth, setEditDueWealth] = useState('');

  const dueSheetRef = useRef<TrueSheet>(null);
  const closeDueSheet = useCallback(() => setEditingDue(null), []);
  const onDueSheetDidDismiss = useTrueSheetOpenSync(dueSheetRef, !!editingDue, closeDueSheet);

  const list = useMemo(() => orderedCycles(cyclesById, cycleIds), [cyclesById, cycleIds]);

  const openEditDue = useCallback((item: ZakatCycle) => {
    setEditingDue(item);
    setEditDueTotal((item.totalZakatPaise / 100).toFixed(0));
    setEditDueWealth(
      item.zakatableWealthPaise != null ? (item.zakatableWealthPaise / 100).toFixed(0) : '',
    );
  }, []);

  const saveEditDue = () => {
    if (!editingDue) return;
    const rupees = parseRupeesInput(editDueTotal);
    if (rupees == null) {
      AppAlert.show('Due amount', 'Enter a valid total zakat due in ₹.', undefined, { variant: 'info' });
      return;
    }
    const totalPaise = rupeesToPaise(rupees);
    const v = validateCycleTotalPaise(totalPaise);
    if (v) {
      AppAlert.show('Due amount', v, undefined, { variant: 'info' });
      return;
    }
    let zakatableWealthPaise: number | null;
    const wRaw = editDueWealth.trim();
    if (!wRaw) {
      zakatableWealthPaise = null;
    } else {
      const w = parseRupeesInput(editDueWealth);
      if (w == null) {
        AppAlert.show('Wealth', 'Enter a valid zakatable wealth in ₹, or leave blank.', undefined, { variant: 'info' });
        return;
      }
      zakatableWealthPaise = rupeesToPaise(w);
    }
    updateCycle(editingDue.id, { totalZakatPaise: totalPaise, zakatableWealthPaise });
    setEditingDue(null);
  };

  const submitNew = () => {
    const y = Number.parseInt(yearStr, 10);
    if (!Number.isFinite(y)) {
      AppAlert.show('Year', 'Enter a valid year.', undefined, { variant: 'info' });
      return;
    }
    createCycle({
      label: label.trim() || `Zakat ${y}`,
      year: y,
      startDateIso: startIso,
      endDateIso: null,
      totalZakatPaise: 0,
      notes: '',
    });
    setShowNew(false);
    setLabel('');
    navigation.navigate('ZakatHome');
  };

  const toggleArchive = (item: ZakatCycle) => {
    updateCycle(item.id, { archived: !item.archived });
  };

  const removeCycle = (item: ZakatCycle) => {
    AppAlert.show(
      'Delete cycle?',
      'Deletes this cycle and all its payments from this device and cloud.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void deleteCycle(item.id, uid) },
      ],
      { variant: 'destructive' }
    );
  };

  return (
    <>
    <SafeAreaView style={[styles.safe, { backgroundColor: c.surface }]} edges={['bottom']}>
      <Text style={[styles.title, { color: c.primary }]}>Zakat cycles</Text>
      <Text style={[styles.sub, { color: c.onSurfaceVariant }]}>
        Each year (or period) has its own due total and payments. Tap a row to set active; use Edit due
        to fix a wrong obligation (payments are unchanged).
      </Text>

      <Pressable
        onPress={() => setShowNew(!showNew)}
        style={[styles.newBtn, { backgroundColor: c.secondaryContainer }]}>
        <Text style={[styles.newBtnText, { color: c.onSecondaryContainer }]}>
          {showNew ? 'Cancel' : '+ New cycle'}
        </Text>
      </Pressable>

      {showNew ? (
        <View style={[styles.form, { backgroundColor: c.surfaceContainerLow }]}>
          <Text style={[styles.label, { color: c.onSurfaceVariant }]}>Label</Text>
          <TextInput value={label} onChangeText={setLabel} placeholder="Ramadan 2026" />
          <Text style={[styles.label, { color: c.onSurfaceVariant }]}>Year</Text>
          <TextInput value={yearStr} onChangeText={setYearStr} keyboardType="number-pad" />
          <Text style={[styles.label, { color: c.onSurfaceVariant }]}>Start date</Text>
          <TextInput value={startIso} onChangeText={setStartIso} placeholder="YYYY-MM-DD" />
          <Pressable
            onPress={submitNew}
            style={[styles.createBtn, { backgroundColor: c.primaryContainer }]}>
            <Text style={[styles.createBtnText, { color: c.onPrimary }]}>Create</Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={list}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const active = item.id === activeCycleId;
          return (
            <View style={[styles.row, { borderColor: c.outlineVariant }]}>
              <Pressable
                style={{ flex: 1, minWidth: 0 }}
                onPress={() => {
                  setActiveCycle(item.id);
                  navigation.navigate('ZakatHome');
                }}>
                <Text style={[styles.rowTitle, { color: c.primary }]}>
                  {item.label} {active ? '· Active' : ''}
                </Text>
                <Text style={[styles.rowMeta, { color: c.onSurfaceVariant }]}>
                  Due {formatInrPaise(item.totalZakatPaise)} · {item.year} ·{' '}
                  {item.archived ? 'Archived' : 'Open'}
                </Text>
              </Pressable>
              <View style={[styles.actions, { flexShrink: 0 }]}>
                <Pressable onPress={() => openEditDue(item)} hitSlop={6}>
                  <Text style={[styles.link, { color: c.primary }]}>Edit due</Text>
                </Pressable>
                <Pressable onPress={() => toggleArchive(item)} hitSlop={6}>
                  <Text style={[styles.link, { color: c.secondary }]}>
                    {item.archived ? 'Unarchive' : 'Archive'}
                  </Text>
                </Pressable>
                <Pressable onPress={() => removeCycle(item)} hitSlop={6}>
                  <Text style={[styles.link, { color: c.error }]}>Delete</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>

    <TrueSheet
      ref={dueSheetRef}
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
      onDidDismiss={onDueSheetDidDismiss}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.sheetScroll}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.sheetHandle, { backgroundColor: c.surfaceContainerHighest }]} />
        <Text style={[styles.modalTitle, { color: c.primary }]}>Edit due for cycle</Text>
        {editingDue ? (
          <Text style={[styles.modalSub, { color: c.onSurfaceVariant }]}>{editingDue.label}</Text>
        ) : null}
        <Text style={[styles.label, { color: c.onSurfaceVariant }]}>Total zakat due (₹)</Text>
        <TextInput
          value={editDueTotal}
          onChangeText={setEditDueTotal}
          keyboardType="decimal-pad"
          placeholder="e.g. 25000"
        />
        <Text style={[styles.label, { color: c.onSurfaceVariant }]}>
          Zakatable wealth (₹, optional)
        </Text>
        <TextInput
          value={editDueWealth}
          onChangeText={setEditDueWealth}
          keyboardType="decimal-pad"
          placeholder="Leave blank to clear"
        />
        <Text style={[styles.modalHint, { color: c.onSurfaceVariant }]}>
          Changing the due does not alter recorded payments. Remaining balance updates automatically.
        </Text>
        <View style={styles.modalBtns}>
          <Pressable onPress={() => void dueSheetRef.current?.dismiss()} style={styles.modalBtn}>
            <Text style={{ color: c.onSurfaceVariant, fontWeight: '700' }}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={saveEditDue}
            style={[styles.modalBtn, { backgroundColor: c.primaryContainer }]}>
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
  title: { fontFamily: fontFamilies.headline, fontSize: 24, fontWeight: '800', marginTop: spacing.sm },
  sub: { fontSize: 13, lineHeight: 18, marginTop: spacing.xs, marginBottom: spacing.md },
  newBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    marginBottom: spacing.md,
  },
  newBtnText: { fontSize: 14, fontWeight: '800' },
  form: { padding: spacing.lg, borderRadius: radius.md, gap: spacing.sm, marginBottom: spacing.md },
  label: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  createBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    alignItems: 'center',
  },
  createBtnText: { fontSize: 16, fontWeight: '800' },
  list: { paddingBottom: spacing.x3xl, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowTitle: { fontSize: 16, fontWeight: '800' },
  rowMeta: { fontSize: 12, marginTop: 4 },
  actions: { gap: spacing.xs, alignItems: 'flex-end', justifyContent: 'center' },
  link: { fontSize: 13, fontWeight: '700' },
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
  modalTitle: { fontSize: 20, fontWeight: '800' },
  modalSub: { fontSize: 14, fontWeight: '600', marginBottom: spacing.sm },
  modalHint: { fontSize: 12, lineHeight: 18, marginTop: spacing.sm },
  modalBtns: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  modalBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.full },
});
