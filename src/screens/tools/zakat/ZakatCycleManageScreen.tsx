import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { FlatList, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  Archive,
  ArchiveRestore,
  CalendarRange,
  Check,
  LayoutList,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react-native';
import { TextInput } from '../../../components/atoms/TextInput/TextInput';
import { SazdaText } from '../../../components/atoms/SazdaText/SazdaText';
import { PressableScale } from '../../../components/atoms/PressableScale/PressableScale';
import { EmptyState } from '../../../components/molecules/EmptyState/EmptyState';
import { useTrueSheetOpenSync } from '../../../hooks/useTrueSheetOpenSync';
import { useReduceMotion } from '../../../hooks/useReduceMotion';
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
import { elevation } from '../../../theme/elevation';
import { motionDurations, motionEasing } from '../../../theme/motion';
import { radius } from '../../../theme/radius';
import { spacing } from '../../../theme/spacing';
import { useThemePalette } from '../../../theme/useThemePalette';
import { hapticLight, hapticMedium, hapticSuccess } from '../../../utils/appHaptics';
import { AppAlert } from '../../../components/organisms/AppAlert/AppAlert';

type Nav = NativeStackNavigationProp<ToolsStackParamList, 'ZakatCycleManage'>;

const SHEET_NAME = 'zakat-cycle-due-edit';

function ActionChip({
  icon,
  label,
  color,
  background,
  onPress,
  accessibilityLabel,
}: {
  icon: ReactNode;
  label: string;
  color: string;
  background?: string;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <PressableScale
      to={0.92}
      pressedOpacity={0.85}
      onPress={onPress}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.actionChip, background ? { backgroundColor: background } : null]}>
      {icon}
      <SazdaText variant="caption" color={color} style={styles.actionChipLabel}>
        {label}
      </SazdaText>
    </PressableScale>
  );
}

export function ZakatCycleManageScreen() {
  const navigation = useNavigation<Nav>();
  const { colors: c, scheme } = useThemePalette();
  const reduced = useReduceMotion();
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

  const shadowSm = useMemo(() => elevation('sm', scheme), [scheme]);
  const shadowMd = useMemo(() => elevation('md', scheme), [scheme]);

  const itemEntering = useCallback(
    (index: number) =>
      reduced
        ? undefined
        : FadeInDown.delay(Math.min(index, 6) * 60)
            .duration(motionDurations.slow)
            .easing(motionEasing.standardOut),
    [reduced],
  );

  const openEditDue = useCallback((item: ZakatCycle) => {
    hapticLight();
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
    hapticSuccess();
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
    hapticSuccess();
    setShowNew(false);
    setLabel('');
    navigation.navigate('ZakatHome');
  };

  const toggleArchive = (item: ZakatCycle) => {
    hapticLight();
    updateCycle(item.id, { archived: !item.archived });
  };

  const removeCycle = (item: ZakatCycle) => {
    hapticMedium();
    AppAlert.show(
      'Delete cycle?',
      'Deletes this cycle and all its payments from this device and cloud.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteCycle(item.id, uid);
          },
        },
      ],
      { variant: 'destructive' }
    );
  };

  const header = (
    <View style={styles.header}>
      <Animated.View entering={itemEntering(0)} style={styles.headerText}>
        <SazdaText variant="headlineMedium" color="primary">
          Zakat cycles
        </SazdaText>
        <SazdaText variant="bodySmall" color="onSurfaceVariant" style={styles.sub}>
          Each year (or period) has its own due total and payments. Tap a cycle to set it active;
          use Edit due to fix a wrong obligation — payments stay unchanged.
        </SazdaText>
      </Animated.View>

      <Animated.View entering={itemEntering(1)} style={styles.headerBtnWrap}>
        <PressableScale
          to={0.96}
          onPress={() => {
            hapticLight();
            setShowNew(v => !v);
          }}
          accessibilityRole="button"
          accessibilityLabel={showNew ? 'Cancel creating a new cycle' : 'Create a new cycle'}
          style={[
            styles.newBtn,
            { backgroundColor: showNew ? c.surfaceContainer : c.secondaryContainer },
            shadowSm,
          ]}>
          {showNew ? (
            <X size={16} color={c.onSurface} strokeWidth={2.5} />
          ) : (
            <Plus size={16} color={c.onSecondaryContainer} strokeWidth={2.5} />
          )}
          <SazdaText variant="titleSm" color={showNew ? 'onSurface' : 'onSecondaryContainer'}>
            {showNew ? 'Cancel' : 'New cycle'}
          </SazdaText>
        </PressableScale>
      </Animated.View>

      {showNew ? (
        <Animated.View
          entering={
            reduced
              ? undefined
              : FadeInDown.duration(motionDurations.base).easing(motionEasing.standardOut)
          }
          style={[styles.form, { backgroundColor: c.surfaceContainerLow }, shadowSm]}>
          <SazdaText variant="label" color="onSurfaceVariant">
            Label
          </SazdaText>
          <TextInput
            value={label}
            onChangeText={setLabel}
            placeholder="Ramadan 2026"
            accessibilityLabel="Cycle label"
          />
          <SazdaText variant="label" color="onSurfaceVariant">
            Year
          </SazdaText>
          <TextInput
            value={yearStr}
            onChangeText={setYearStr}
            keyboardType="number-pad"
            accessibilityLabel="Cycle year"
          />
          <SazdaText variant="label" color="onSurfaceVariant">
            Start date
          </SazdaText>
          <TextInput
            value={startIso}
            onChangeText={setStartIso}
            placeholder="YYYY-MM-DD"
            accessibilityLabel="Cycle start date"
          />
          <PressableScale
            to={0.97}
            onPress={submitNew}
            accessibilityRole="button"
            accessibilityLabel="Create cycle"
            style={[styles.createBtn, { backgroundColor: c.primaryContainer }, shadowMd]}>
            <SazdaText variant="titleLarge" color="onPrimary">
              Create
            </SazdaText>
          </PressableScale>
        </Animated.View>
      ) : null}
    </View>
  );

  return (
    <>
    <SafeAreaView style={[styles.safe, { backgroundColor: c.surface }]} edges={['bottom']}>
      <FlatList
        data={list}
        keyExtractor={item => item.id}
        extraData={activeCycleId}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <EmptyState
            compact
            icon={<LayoutList size={36} color={c.onSurfaceVariant} />}
            title="No cycles yet"
            message="Create a cycle for each zakat year to track its due and payments separately."
            actionLabel="New cycle"
            onAction={() => setShowNew(true)}
          />
        }
        renderItem={({ item, index }) => {
          const active = item.id === activeCycleId;
          return (
            <Animated.View entering={itemEntering(index + 2)}>
              <PressableScale
                to={0.98}
                onPress={() => {
                  hapticMedium();
                  setActiveCycle(item.id);
                  navigation.navigate('ZakatHome');
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${item.label}, ${item.year}, due ${formatInrPaise(item.totalZakatPaise)}${item.archived ? ', archived' : ''}${active ? ', active cycle' : ', double tap to set active'}`}
                style={[
                  styles.card,
                  {
                    backgroundColor: c.surfaceContainerLow,
                    borderColor: active ? c.primary : c.surfaceContainerLow,
                  },
                  active ? shadowMd : shadowSm,
                  item.archived && styles.cardArchived,
                ]}>
                <View style={styles.cardTop}>
                  <View
                    style={[
                      styles.cardIcon,
                      { backgroundColor: active ? c.primaryContainer : c.surfaceContainerHighest },
                    ]}>
                    <CalendarRange
                      size={20}
                      color={active ? c.onPrimary : c.onSurfaceVariant}
                      strokeWidth={2.25}
                    />
                  </View>
                  <View style={styles.cardText}>
                    <View style={styles.cardTitleRow}>
                      <SazdaText
                        variant="titleLarge"
                        color="onSurface"
                        numberOfLines={1}
                        style={styles.cardTitle}>
                        {item.label}
                      </SazdaText>
                      {active ? (
                        <View style={[styles.activeBadge, { backgroundColor: c.primaryContainer }]}>
                          <Check size={11} color={c.onPrimary} strokeWidth={3} />
                          <SazdaText variant="label" color="onPrimary">
                            Active
                          </SazdaText>
                        </View>
                      ) : null}
                    </View>
                    <SazdaText variant="caption" color="onSurfaceVariant" style={styles.cardMeta}>
                      Due {formatInrPaise(item.totalZakatPaise)} · {item.year} ·{' '}
                      {item.archived ? 'Archived' : 'Open'}
                    </SazdaText>
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: c.outlineVariant }]} />

                <View style={styles.cardActions}>
                  <ActionChip
                    icon={<Pencil size={14} color={c.primary} strokeWidth={2.25} />}
                    label="Edit due"
                    color={c.primary}
                    background={c.surfaceContainer}
                    onPress={() => openEditDue(item)}
                    accessibilityLabel={`Edit due amount for ${item.label}`}
                  />
                  <ActionChip
                    icon={
                      item.archived ? (
                        <ArchiveRestore size={14} color={c.secondary} strokeWidth={2.25} />
                      ) : (
                        <Archive size={14} color={c.secondary} strokeWidth={2.25} />
                      )
                    }
                    label={item.archived ? 'Unarchive' : 'Archive'}
                    color={c.secondary}
                    background={c.surfaceContainer}
                    onPress={() => toggleArchive(item)}
                    accessibilityLabel={`${item.archived ? 'Unarchive' : 'Archive'} ${item.label}`}
                  />
                  <View style={styles.actionSpacer} />
                  <ActionChip
                    icon={<Trash2 size={14} color={c.error} strokeWidth={2.25} />}
                    label="Delete"
                    color={c.error}
                    onPress={() => removeCycle(item)}
                    accessibilityLabel={`Delete ${item.label} and all its payments`}
                  />
                </View>
              </PressableScale>
            </Animated.View>
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
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        contentContainerStyle={styles.sheetScroll}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.sheetHandle, { backgroundColor: c.surfaceContainerHighest }]} />
        <SazdaText variant="headlineMedium" color="primary">
          Edit due for cycle
        </SazdaText>
        {editingDue ? (
          <SazdaText variant="bodySmall" color="onSurfaceVariant" style={styles.modalSub}>
            {editingDue.label}
          </SazdaText>
        ) : null}
        <SazdaText variant="label" color="onSurfaceVariant">
          Total zakat due (₹)
        </SazdaText>
        <TextInput
          value={editDueTotal}
          onChangeText={setEditDueTotal}
          keyboardType="decimal-pad"
          placeholder="e.g. 25000"
          accessibilityLabel="Total zakat due in rupees"
        />
        <SazdaText variant="label" color="onSurfaceVariant">
          Zakatable wealth (₹, optional)
        </SazdaText>
        <TextInput
          value={editDueWealth}
          onChangeText={setEditDueWealth}
          keyboardType="decimal-pad"
          placeholder="Leave blank to clear"
          accessibilityLabel="Zakatable wealth in rupees, optional"
        />
        <SazdaText variant="caption" color="onSurfaceVariant" style={styles.modalHint}>
          Changing the due does not alter recorded payments. Remaining balance updates
          automatically.
        </SazdaText>
        <View style={styles.modalBtns}>
          <PressableScale
            to={0.96}
            onPress={() => {
              dueSheetRef.current?.dismiss();
            }}
            accessibilityRole="button"
            accessibilityLabel="Cancel editing due"
            style={styles.modalBtn}>
            <SazdaText variant="titleSm" color="onSurfaceVariant">
              Cancel
            </SazdaText>
          </PressableScale>
          <PressableScale
            to={0.96}
            onPress={saveEditDue}
            accessibilityRole="button"
            accessibilityLabel="Save due amount"
            style={[styles.modalBtn, { backgroundColor: c.primaryContainer }, shadowSm]}>
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
    paddingTop: spacing.sm,
    paddingBottom: spacing.x3xl,
    gap: spacing.sm,
  },
  header: { marginBottom: spacing.xs },
  headerText: { gap: spacing.xs },
  sub: { marginBottom: spacing.md },
  headerBtnWrap: { alignSelf: 'flex-start' },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs - 2,
    paddingHorizontal: spacing.lg,
    minHeight: 44,
    borderRadius: radius.full,
    marginBottom: spacing.md,
  },
  form: {
    padding: spacing.lg,
    borderRadius: radius.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  createBtn: {
    marginTop: spacing.md,
    minHeight: 52,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    padding: spacing.md,
  },
  cardArchived: { opacity: 0.75 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.sm + 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1, minWidth: 0 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  cardTitle: { flexShrink: 1 },
  cardMeta: { marginTop: 2 },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.full,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  actionSpacer: { flex: 1 },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 32,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
  },
  actionChipLabel: { fontWeight: '700' },
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
  modalSub: { marginBottom: spacing.sm },
  modalHint: { marginTop: spacing.sm },
  modalBtns: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  modalBtn: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
