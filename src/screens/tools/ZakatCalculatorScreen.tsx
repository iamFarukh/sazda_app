import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TextInput } from '../../components/atoms/TextInput/TextInput';
import { SazdaText } from '../../components/atoms/SazdaText/SazdaText';
import {
  formatInrPaise,
  parseRupeesInput,
  rupeesToPaise,
  ZAKAT_RATE,
} from '../../features/zakat';
import type { ToolsStackParamList } from '../../navigation/types';
import { useZakatStore } from '../../store/zakatStore';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import type { AppPalette } from '../../theme/useThemePalette';
import type { ResolvedScheme } from '../../theme/useThemePalette';
import { useThemePalette } from '../../theme/useThemePalette';
import { AppAlert } from '../../components/organisms/AppAlert/AppAlert';

type Nav = NativeStackNavigationProp<ToolsStackParamList, 'ZakatCalculator'>;

export function ZakatCalculatorScreen() {
  const navigation = useNavigation<Nav>();
  const [raw, setRaw] = useState('');
  const { colors: c, scheme } = useThemePalette();
  const styles = useMemo(() => createZakatStyles(c, scheme), [c, scheme]);

  const updateCycle = useZakatStore(s => s.updateCycle);
  const activeCycleId = useZakatStore(s => s.activeCycleId);
  const cyclesById = useZakatStore(s => s.cyclesById);

  const rupees = useMemo(() => parseRupeesInput(raw), [raw]);
  const wealthPaise = rupees != null ? rupeesToPaise(rupees) : null;
  const zakatPaise = wealthPaise != null ? Math.round(wealthPaise * ZAKAT_RATE) : null;

  const applyToCycle = () => {
    if (!activeCycleId || !cyclesById[activeCycleId]) {
      AppAlert.show('No active cycle', 'Open Zakat from Tools and pick a cycle first.', undefined, { variant: 'info' });
      return;
    }
    if (zakatPaise == null || zakatPaise < 0) {
      AppAlert.show('Enter wealth', 'Enter a valid zakatable amount in ₹.', undefined, { variant: 'info' });
      return;
    }
    const cid = activeCycleId;
    AppAlert.show(
      'Update zakat for this cycle?',
      `Set obligation to ${formatInrPaise(zakatPaise)} (2.5% of ${formatInrPaise(wealthPaise!)}). Past payments stay the same; remaining balance updates automatically.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: () => {
            updateCycle(cid, {
              totalZakatPaise: zakatPaise,
              zakatableWealthPaise: wealthPaise,
            });
            navigation.goBack();
          },
        },
      ],
      { variant: 'confirmation' }
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.pad} showsVerticalScrollIndicator={false}>
        <SazdaText variant="headlineMedium" color="primary" style={styles.heading}>
          Zakat calculator
        </SazdaText>
        <SazdaText variant="bodyMedium" color="onSurfaceVariant" style={styles.disclaimer}>
          Enter zakatable wealth in ₹. We apply 2.5% — same rate as before. You can apply the result
          to your active cycle; previous payments are never changed.
        </SazdaText>

        <Text style={[styles.inrLabel, { color: c.onSurfaceVariant }]}>Amount (₹)</Text>
        <TextInput
          value={raw}
          onChangeText={setRaw}
          placeholder="e.g. 500000"
          keyboardType="decimal-pad"
          containerStyle={styles.input}
        />

        <View style={styles.resultCard}>
          <SazdaText variant="caption" color="onSurfaceVariant">
            Estimated zakāt (2.5%)
          </SazdaText>
          <SazdaText variant="headlineLarge" color="primary" style={styles.resultMain}>
            {zakatPaise != null ? formatInrPaise(zakatPaise) : '—'}
          </SazdaText>
          {rupees != null ? (
            <SazdaText variant="bodyMedium" color="onSurfaceVariant">
              On {formatInrPaise(rupeesToPaise(rupees))} entered
            </SazdaText>
          ) : (
            <SazdaText variant="bodyMedium" color="onSurfaceVariant">
              Enter zakatable amount in rupees
            </SazdaText>
          )}
        </View>

        <Pressable
          onPress={applyToCycle}
          style={({ pressed }) => [
            styles.applyBtn,
            { backgroundColor: c.primaryContainer },
            pressed && { opacity: 0.9 },
          ]}>
          <Text style={[styles.applyBtnText, { color: c.onPrimary }]}>Apply to active cycle</Text>
        </Pressable>

        <Pressable
          onPress={() => setRaw('')}
          style={({ pressed }) => [styles.clearBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Clear amount">
          <SazdaText variant="label" color="primary">
            Clear
          </SazdaText>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function createZakatStyles(c: AppPalette, scheme: ResolvedScheme) {
  const border = scheme === 'dark' ? 'rgba(142,207,178,0.12)' : 'rgba(0, 53, 39, 0.06)';
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.surface },
    pad: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.x3xl,
      gap: spacing.lg,
    },
    heading: { marginTop: spacing.sm },
    disclaimer: {
      lineHeight: 22,
      opacity: 0.9,
    },
    inrLabel: {
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    input: {
      marginTop: spacing.xs,
    },
    resultCard: {
      backgroundColor: c.surfaceContainerLow,
      borderRadius: radius.md + 6,
      padding: spacing.xl,
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: border,
    },
    resultMain: {
      marginVertical: spacing.xs,
    },
    applyBtn: {
      minHeight: 48,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    applyBtnText: { fontSize: 16, fontWeight: '800' },
    clearBtn: {
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      backgroundColor: c.surfaceContainerHighest,
    },
    pressed: { opacity: 0.88 },
  });
}
