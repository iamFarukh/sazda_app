import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TextInput } from '../../../components/atoms/TextInput/TextInput';
import {
  formatInrPaise,
  parseRupeesInput,
  rupeesToPaise,
} from '../../../features/zakat';
import { PAYMENT_CATEGORIES, PAYMENT_CATEGORY_LABEL } from '../../../features/zakat/uiLabels';
import type { ZakatPaymentCategory } from '../../../features/zakat/types';
import type { ToolsStackParamList } from '../../../navigation/types';
import { useZakatStore } from '../../../store/zakatStore';
import { radius } from '../../../theme/radius';
import { spacing } from '../../../theme/spacing';
import { fontFamilies } from '../../../theme/typography';
import { useThemePalette } from '../../../theme/useThemePalette';
import { AppAlert } from '../../../components/organisms/AppAlert/AppAlert';

type Nav = NativeStackNavigationProp<ToolsStackParamList, 'ZakatAddPayment'>;
type R = RouteProp<ToolsStackParamList, 'ZakatAddPayment'>;

export function ZakatAddPaymentScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const { colors: c } = useThemePalette();

  const addPayment = useZakatStore(s => s.addPayment);
  const activeCycleId = useZakatStore(s => s.activeCycleId);
  const cyclesById = useZakatStore(s => s.cyclesById);

  const cycleId = route.params?.cycleId ?? activeCycleId ?? '';
  const cycle = cyclesById[cycleId];

  const [rawAmount, setRawAmount] = useState('');
  const [category, setCategory] = useState<ZakatPaymentCategory>('masjid');
  const [note, setNote] = useState('');
  const [paidDay, setPaidDay] = useState(() => new Date().toISOString().slice(0, 10));

  const rupees = useMemo(() => parseRupeesInput(rawAmount), [rawAmount]);
  const paise = rupees != null ? rupeesToPaise(rupees) : null;

  const save = () => {
    if (!cycle) {
      AppAlert.show('No cycle', 'Select a zakat cycle first.', undefined, { variant: 'info' });
      return;
    }
    if (paise == null) {
      AppAlert.show('Amount', 'Enter a valid amount in ₹.', undefined, { variant: 'info' });
      return;
    }
    const res = addPayment({
      cycleId: cycle.id,
      amountPaise: paise,
      category,
      paidAtIso: paidDay,
      note,
    });
    if (!res.ok) {
      AppAlert.show('Cannot save', res.error, undefined, { variant: 'destructive' });
      return;
    }
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.surface }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: c.primary }]}>Add payment</Text>
        {cycle ? (
          <Text style={[styles.sub, { color: c.onSurfaceVariant }]}>
            {cycle.label} · amounts in ₹
          </Text>
        ) : (
          <Text style={[styles.err, { color: c.error }]}>No cycle selected.</Text>
        )}

        <Text style={[styles.label, { color: c.onSurfaceVariant }]}>Amount (₹)</Text>
        <TextInput
          value={rawAmount}
          onChangeText={setRawAmount}
          placeholder="e.g. 5000"
          keyboardType="decimal-pad"
          containerStyle={styles.input}
        />
        {paise != null ? (
          <Text style={[styles.preview, { color: c.onSurfaceVariant }]}>
            {formatInrPaise(paise)}
          </Text>
        ) : null}

        <Text style={[styles.label, { color: c.onSurfaceVariant }]}>Category</Text>
        <View style={styles.catRow}>
          {PAYMENT_CATEGORIES.map(cat => (
            <Pressable
              key={cat}
              onPress={() => setCategory(cat)}
              style={[
                styles.catChip,
                {
                  backgroundColor: category === cat ? c.primaryContainer : c.surfaceContainerLow,
                  borderColor: category === cat ? c.primary : c.outlineVariant,
                },
              ]}>
              <Text
                style={[
                  styles.catChipText,
                  { color: category === cat ? c.onPrimary : c.onSurface },
                ]}>
                {PAYMENT_CATEGORY_LABEL[cat]}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { color: c.onSurfaceVariant }]}>Date (YYYY-MM-DD)</Text>
        <TextInput
          value={paidDay}
          onChangeText={setPaidDay}
          placeholder="2026-04-04"
          containerStyle={styles.input}
        />

        <Text style={[styles.label, { color: c.onSurfaceVariant }]}>Note (optional)</Text>
        <TextInput value={note} onChangeText={setNote} placeholder="e.g. Masjid donation" containerStyle={styles.input} />

        <Pressable
          onPress={save}
          disabled={!cycle}
          style={({ pressed }) => [
            styles.saveBtn,
            { backgroundColor: c.primaryContainer },
            (!cycle || pressed) && { opacity: cycle ? 0.9 : 0.4 },
          ]}>
          <Text style={[styles.saveBtnText, { color: c.onPrimary }]}>Save payment</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  pad: { padding: spacing.lg, paddingBottom: spacing.x3xl, gap: spacing.md },
  title: { fontFamily: fontFamilies.headline, fontSize: 24, fontWeight: '800' },
  sub: { fontSize: 14, fontWeight: '600' },
  err: { fontSize: 14, fontWeight: '700' },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  input: { marginTop: 4 },
  preview: { fontSize: 13, fontWeight: '600' },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  catChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  catChipText: { fontSize: 13, fontWeight: '700' },
  saveBtn: {
    marginTop: spacing.lg,
    minHeight: 50,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { fontSize: 16, fontWeight: '800' },
});
