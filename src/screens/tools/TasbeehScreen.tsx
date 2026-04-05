import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { RefreshCw, Vibrate, VibrateOff } from 'lucide-react-native';
import { TasbeehGeometricBackground } from '../../components/organisms/TasbeehCounter/TasbeehGeometricBackground';
import { TasbeehTapOrb } from '../../components/organisms/TasbeehCounter/TasbeehTapOrb';
import { SazdaText } from '../../components/atoms/SazdaText/SazdaText';
import { ToolsSubheader } from '../../components/molecules/ToolsSubheader/ToolsSubheader';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { fontFamilies } from '../../theme/typography';
import type { AppPalette } from '../../theme/useThemePalette';
import type { ResolvedScheme } from '../../theme/useThemePalette';
import { useThemePalette } from '../../theme/useThemePalette';
import {
  PHASE_ORDER,
  TASBEEH_DISPLAY_TITLE,
  TASBEEH_EN_SUBTITLE,
  type TasbeehGoalMode,
  useTasbeehStore,
} from '../../store/tasbeehStore';
import {
  tasbeehCycleComplete,
  tasbeehPhraseComplete,
  tasbeehTapLight,
} from '../../utils/tasbeehHaptics';

const GOAL_MODES_ROW: { mode: TasbeehGoalMode; label: string }[] = [
  { mode: 'traditional33', label: '33' },
  { mode: 'single100', label: '100' },
  { mode: 'custom', label: 'Custom' },
];

export function TasbeehScreen() {
  const { colors: c, scheme } = useThemePalette();
  const styles = useMemo(() => createTasbeehStyles(c, scheme), [c, scheme]);

  const phase = useTasbeehStore(s => PHASE_ORDER[s.phaseIndex] ?? 'subhan');
  const currentCount = useTasbeehStore(s => s.currentCount);
  const cycles = useTasbeehStore(s => s.cycles);
  const goalMode = useTasbeehStore(s => s.goalMode);
  const customTarget = useTasbeehStore(s => s.customTarget);
  const hapticsEnabled = useTasbeehStore(s => s.hapticsEnabled);
  const setHapticsEnabled = useTasbeehStore(s => s.setHapticsEnabled);
  const setGoalMode = useTasbeehStore(s => s.setGoalMode);
  const applyCustomGoal = useTasbeehStore(s => s.applyCustomGoal);
  const getTarget = useTasbeehStore(s => s.getTarget);
  const tap = useTasbeehStore(s => s.tap);
  const resetPhase = useTasbeehStore(s => s.resetPhase);
  const resetAll = useTasbeehStore(s => s.resetAll);

  const [tapTick, setTapTick] = useState(0);
  const [resetSpin, setResetSpin] = useState(0);
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customDraft, setCustomDraft] = useState(String(customTarget));

  const target = getTarget();

  const titleSubtitle = useMemo(() => {
    if (goalMode === 'traditional33') {
      return {
        title: TASBEEH_DISPLAY_TITLE[phase],
        subtitle: TASBEEH_EN_SUBTITLE[phase],
      };
    }
    if (goalMode === 'single100') {
      return { title: 'Dhikr', subtitle: 'Count up to 100' };
    }
    return { title: 'Dhikr', subtitle: `Custom goal · ${customTarget} taps` };
  }, [goalMode, phase, customTarget]);

  const onOrbPress = useCallback(() => {
    const before = useTasbeehStore.getState();
    const beforeCycles = before.cycles;
    const beforePhase = before.phaseIndex;
    const beforeMode = before.goalMode;

    tap();
    setTapTick(t => t + 1);

    const after = useTasbeehStore.getState();
    const h = after.hapticsEnabled;
    if (after.cycles > beforeCycles) {
      tasbeehCycleComplete(h);
    } else if (beforeMode === 'traditional33' && after.phaseIndex !== beforePhase) {
      tasbeehPhraseComplete(h);
    } else {
      tasbeehTapLight(h);
    }
  }, [tap]);

  const onResetPhrase = useCallback(() => {
    resetPhase();
    setResetSpin(s => s + 1);
  }, [resetPhase]);

  const openCustomModal = useCallback(() => {
    setCustomDraft(String(useTasbeehStore.getState().customTarget));
    setCustomModalOpen(true);
  }, []);

  const onSelectGoal = useCallback(
    (mode: TasbeehGoalMode) => {
      if (mode === 'custom') {
        openCustomModal();
        return;
      }
      setGoalMode(mode);
    },
    [openCustomModal, setGoalMode],
  );

  const onSaveCustom = useCallback(() => {
    const n = parseInt(customDraft.replace(/\D/g, ''), 10);
    applyCustomGoal(Number.isFinite(n) ? n : 33);
    setCustomModalOpen(false);
  }, [applyCustomGoal, customDraft]);

  /** Cream droplets on the green orb (reference). */
  const orbIconColor = scheme === 'dark' ? 'rgba(251,251,226,0.94)' : c.surface;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TasbeehGeometricBackground palette={c} scheme={scheme} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <ToolsSubheader title="Tasbeeh" />

        <View style={styles.hero}>
          <View style={styles.badge}>
            <SazdaText variant="caption" color="secondary" style={styles.badgeText}>
              Currently reciting
            </SazdaText>
          </View>

          <View style={styles.titleBlock}>
            <SazdaText variant="headlineLarge" color="primary" style={styles.displayTitle}>
              {titleSubtitle.title}
            </SazdaText>
            <SazdaText variant="bodyMedium" color="onSurfaceVariant" style={styles.subtitle}>
              {titleSubtitle.subtitle}
            </SazdaText>
          </View>

          <View style={styles.countRow}>
            <SazdaText
              variant="displayLg"
              color={scheme === 'dark' ? c.primary : c.primaryContainer}
              style={styles.bigCount}>
              {currentCount}
            </SazdaText>
            <SazdaText variant="headlineLarge" color="onSurfaceVariant" style={styles.countSlash}>
              {' '}
              / {target}
            </SazdaText>
          </View>

          <View style={styles.orbSection}>
            <TasbeehTapOrb
              primary={c.primary}
              primaryContainer={c.primaryContainer}
              iconColor={orbIconColor}
              tapTick={tapTick}
              onPress={onOrbPress}
              scheme={scheme}
            />
          </View>

          <View style={styles.goalTrack} accessibilityRole="tablist">
            {GOAL_MODES_ROW.map(({ mode, label }) => {
              const active = goalMode === mode;
              return (
                <Pressable
                  key={mode}
                  onPress={() => onSelectGoal(mode)}
                  style={({ pressed }) => [
                    styles.goalSegment,
                    active && styles.goalSegmentActive,
                    pressed && styles.goalSegmentPressed,
                  ]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={
                    mode === 'custom'
                      ? 'Custom goal, opens editor'
                      : mode === 'single100'
                        ? 'Goal 100 taps per cycle'
                        : 'Classic 33, 33, and 34 phrase cycle'
                  }>
                  <SazdaText
                    variant="label"
                    color="secondary"
                    style={[styles.goalSegmentText, active && styles.goalSegmentTextActive]}>
                    {label}
                    {mode === 'custom' && goalMode === 'custom' ? ` (${customTarget})` : ''}
                  </SazdaText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.bento}>
          <Pressable
            onPress={onResetPhrase}
            style={({ pressed }) => [styles.bentoCard, pressed && styles.bentoPressed]}
            accessibilityRole="button"
            accessibilityLabel="Reset current phrase">
            <ResetIcon spin={resetSpin} />
            <SazdaText variant="label" color="onSurface" style={styles.bentoLabel}>
              Reset phrase
            </SazdaText>
          </Pressable>

          <View style={styles.hapticCard}>
            <Pressable
              onPress={() => setHapticsEnabled(true)}
              style={({ pressed }) => [
                styles.hapticHalf,
                hapticsEnabled && styles.hapticHalfActive,
                pressed && styles.hapticHalfPressed,
              ]}
              accessibilityRole="radio"
              accessibilityState={{ checked: hapticsEnabled }}
              accessibilityLabel="Haptic on">
              <Vibrate size={28} color={hapticsEnabled ? c.primary : c.onSurfaceVariant} strokeWidth={2.1} />
              <SazdaText
                variant="label"
                color={hapticsEnabled ? 'primary' : 'onSurfaceVariant'}
                style={styles.hapticHalfLabel}>
                Haptic on
              </SazdaText>
            </Pressable>
            <View style={[styles.hapticDivider, { backgroundColor: c.outlineVariant }]} />
            <Pressable
              onPress={() => setHapticsEnabled(false)}
              style={({ pressed }) => [
                styles.hapticHalf,
                !hapticsEnabled && styles.hapticHalfActive,
                pressed && styles.hapticHalfPressed,
              ]}
              accessibilityRole="radio"
              accessibilityState={{ checked: !hapticsEnabled }}
              accessibilityLabel="Haptic off">
              <VibrateOff size={28} color={!hapticsEnabled ? c.primary : c.onSurfaceVariant} strokeWidth={2.1} />
              <SazdaText
                variant="label"
                color={!hapticsEnabled ? 'primary' : 'onSurfaceVariant'}
                style={styles.hapticHalfLabel}>
                Haptic off
              </SazdaText>
            </Pressable>
          </View>

          <Pressable
            onPress={resetAll}
            style={({ pressed }) => [styles.bentoWide, pressed && styles.bentoPressed]}
            accessibilityRole="button"
            accessibilityLabel="Reset full tasbeeh">
            <SazdaText variant="label" color="onPrimary" style={styles.resetAllText}>
              Reset all (start over)
            </SazdaText>
          </Pressable>
        </View>

        <SazdaText variant="caption" color="onSurfaceVariant" align="center" style={styles.cycles}>
          Completed cycles: {cycles}
        </SazdaText>
      </ScrollView>

      <Modal
        visible={customModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCustomModalOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setCustomModalOpen(false)} />
          <View style={[styles.modalCard, { backgroundColor: c.surfaceContainerLow }]}>
            <SazdaText variant="titleSm" color="primary" style={styles.modalTitle}>
              Custom goal
            </SazdaText>
            <SazdaText variant="caption" color="onSurfaceVariant" style={styles.modalHint}>
              Enter how many taps per cycle (1–9999).
            </SazdaText>
            <TextInput
              value={customDraft}
              onChangeText={setCustomDraft}
              keyboardType="number-pad"
              placeholder="e.g. 99"
              placeholderTextColor={c.onSurfaceVariant}
              style={[
                styles.modalInput,
                {
                  color: c.onSurface,
                  borderColor: c.outlineVariant,
                  backgroundColor: c.surfaceContainerHighest,
                },
              ]}
            />
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setCustomModalOpen(false)}
                style={({ pressed }) => [styles.modalBtn, pressed && styles.bentoPressed]}>
                <SazdaText variant="label" color="onSurface">
                  Cancel
                </SazdaText>
              </Pressable>
              <Pressable
                onPress={onSaveCustom}
                style={({ pressed }) => [
                  styles.modalBtnPrimary,
                  { backgroundColor: c.primary },
                  pressed && styles.bentoPressed,
                ]}>
                <SazdaText variant="label" color="onPrimary">
                  Save
                </SazdaText>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function ResetIcon({ spin }: { spin: number }) {
  const { colors: c } = useThemePalette();
  const rot = useSharedValue(0);

  useEffect(() => {
    if (spin === 0) return;
    rot.value = 0;
    rot.value = withTiming(360, { duration: 480, easing: Easing.out(Easing.cubic) });
  }, [spin, rot]);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot.value}deg` }],
  }));

  return (
    <Animated.View style={style}>
      <RefreshCw size={26} color={c.primary} strokeWidth={2} />
    </Animated.View>
  );
}

function createTasbeehStyles(c: AppPalette, scheme: ResolvedScheme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.surface },
    scroll: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.x3xl,
      flexGrow: 1,
    },
    hero: {
      alignItems: 'center',
      width: '100%',
      maxWidth: 420,
      alignSelf: 'center',
    },
    badge: {
      alignSelf: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: 7,
      borderRadius: radius.full,
      backgroundColor: scheme === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.72)',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: scheme === 'dark' ? 'rgba(142,207,178,0.14)' : 'rgba(0,53,39,0.07)',
      marginBottom: spacing.lg,
    },
    badgeText: {
      fontWeight: '800',
      letterSpacing: 2.4,
      textTransform: 'uppercase',
      fontSize: 10,
    },
    titleBlock: {
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    displayTitle: {
      fontSize: 32,
      fontWeight: '800',
      letterSpacing: -0.8,
      textAlign: 'center',
    },
    subtitle: {
      marginTop: spacing.sm,
      textAlign: 'center',
      opacity: 0.9,
      fontWeight: '500',
      fontSize: 15,
    },
    countRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    bigCount: {
      fontSize: 80,
      lineHeight: 86,
      fontWeight: '900',
      letterSpacing: -3,
      fontFamily: fontFamilies.headline,
    },
    countSlash: {
      fontSize: 26,
      opacity: 0.38,
      fontWeight: '700',
      fontFamily: fontFamilies.headline,
    },
    orbSection: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.sm,
      marginBottom: spacing.xl,
    },
    goalTrack: {
      flexDirection: 'row',
      alignSelf: 'stretch',
      backgroundColor: c.primaryContainer,
      borderRadius: radius.full,
      padding: 6,
      gap: 6,
      marginBottom: spacing.xl,
    },
    goalSegment: {
      flex: 1,
      paddingVertical: spacing.sm + 6,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 0,
    },
    goalSegmentActive: {
      backgroundColor:
        scheme === 'dark' ? 'rgba(255,255,255,0.18)' : 'rgba(251,251,226,0.32)',
    },
    goalSegmentPressed: {
      opacity: 0.88,
    },
    goalSegmentText: {
      fontWeight: '800',
      fontSize: 12,
      letterSpacing: 0.4,
      opacity: 0.75,
    },
    goalSegmentTextActive: {
      opacity: 1,
      fontSize: 13,
    },
    bento: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
      alignSelf: 'stretch',
      width: '100%',
    },
    bentoCard: {
      flex: 1,
      minWidth: '42%',
      backgroundColor: c.surfaceContainerLow,
      borderRadius: radius.md + 4,
      paddingVertical: spacing.lg + 2,
      paddingHorizontal: spacing.md,
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: scheme === 'dark' ? 'rgba(142,207,178,0.12)' : 'rgba(0,53,39,0.06)',
    },
    hapticCard: {
      flex: 1,
      minWidth: '42%',
      flexDirection: 'row',
      alignItems: 'stretch',
      backgroundColor: c.surfaceContainerLow,
      borderRadius: radius.md + 4,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: scheme === 'dark' ? 'rgba(142,207,178,0.12)' : 'rgba(0,53,39,0.06)',
      overflow: 'hidden',
    },
    hapticHalf: {
      flex: 1,
      paddingVertical: spacing.md + 4,
      paddingHorizontal: spacing.xs,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    hapticHalfActive: {
      backgroundColor: scheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,53,39,0.05)',
    },
    hapticHalfPressed: {
      opacity: 0.9,
    },
    hapticHalfLabel: {
      fontWeight: '800',
      letterSpacing: 1,
      textTransform: 'uppercase',
      fontSize: 9,
      textAlign: 'center',
    },
    hapticDivider: {
      width: StyleSheet.hairlineWidth,
      alignSelf: 'stretch',
    },
    bentoWide: {
      width: '100%',
      backgroundColor: c.primary,
      borderRadius: radius.full,
      paddingVertical: spacing.md + 4,
      alignItems: 'center',
    },
    bentoLabel: {
      fontWeight: '700',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      fontSize: 10,
    },
    bentoPressed: {
      opacity: 0.92,
    },
    resetAllText: {
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    cycles: {
      marginTop: spacing.xl,
      opacity: 0.85,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    modalCard: {
      borderRadius: radius.md + 4,
      padding: spacing.lg,
      gap: spacing.md,
    },
    modalTitle: {
      fontWeight: '800',
    },
    modalHint: {
      marginTop: -spacing.xs,
    },
    modalInput: {
      borderWidth: 1,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      fontSize: 18,
      fontFamily: fontFamilies.headline,
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: spacing.md,
      marginTop: spacing.sm,
    },
    modalBtn: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    modalBtnPrimary: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.full,
    },
  });
}
