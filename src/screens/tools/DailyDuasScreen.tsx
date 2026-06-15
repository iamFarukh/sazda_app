import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { BookOpenText, Languages, Settings, X } from 'lucide-react-native';
import { IconButton } from '../../components/atoms/IconButton/IconButton';
import { SazdaText } from '../../components/atoms/SazdaText/SazdaText';
import { ToolsSubheader } from '../../components/molecules/ToolsSubheader/ToolsSubheader';
import type { DailyDua } from '../../data/dailyDuas';
import { DAILY_DUAS } from '../../data/dailyDuas';
import { useTrueSheetOpenSync } from '../../hooks/useTrueSheetOpenSync';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import type { AppPalette } from '../../theme/useThemePalette';
import type { ResolvedScheme } from '../../theme/useThemePalette';
import { useThemePalette } from '../../theme/useThemePalette';

/** Matches `SurahReaderScreen` list padding and ayah separators for visual consistency. */
function createDuasStyles(c: AppPalette, _scheme: ResolvedScheme, sheetBottomInset: number) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.surface },
    body: { flex: 1 },
    sheet: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: Math.max(sheetBottomInset, spacing.md),
    },
    sheetHandle: {
      alignSelf: 'center',
      width: 44,
      height: 5,
      borderRadius: 3,
      marginBottom: spacing.md,
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    sheetCloseHit: { padding: spacing.sm },
    sheetTitle: { fontWeight: '900' },
    sheetSubtitle: { opacity: 0.9, marginBottom: spacing.md },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      paddingVertical: spacing.sm,
    },
    toggleLeft: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    toggleIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surfaceContainerHighest,
    },
    toggleLabels: { flex: 1, minWidth: 0, gap: 2 },
    toggleHint: { opacity: 0.85, lineHeight: 17 },
    toggleSwitch: {
      transform: [{ scale: Platform.OS === 'ios' ? 0.88 : 0.95 }],
    },
    listContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.x3xl + 72,
      paddingTop: spacing.xs,
    },
    duaRow: {
      paddingVertical: spacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: 'rgba(191, 201, 195, 0.35)',
      gap: spacing.sm,
    },
    title: {
      marginBottom: spacing.xs,
    },
    /** Slightly larger than `SurahReaderScreen` ayah (22) — duas are short blocks. */
    arabic: {
      fontSize: 24,
      lineHeight: 40,
    },
    hindiBlock: {
      marginTop: spacing.xs,
      lineHeight: 24,
      fontSize: 15,
    },
    hindiLabel: {
      marginTop: spacing.sm,
      opacity: 0.75,
      fontSize: 10,
      letterSpacing: 1,
    },
    fabWrap: {
      position: 'absolute',
      right: spacing.lg,
      bottom: spacing.lg,
    },
  });
}

type DuasStyles = ReturnType<typeof createDuasStyles>;

type RowProps = {
  item: DailyDua;
  showTransliteration: boolean;
  showMeaning: boolean;
  styles: DuasStyles;
};

const DuaRow = memo(function DuaRow({ item, showTransliteration, showMeaning, styles: s }: RowProps) {
  return (
    <View style={s.duaRow}>
      <SazdaText variant="titleSm" color="primary" style={s.title}>
        {item.title}
      </SazdaText>
      <SazdaText variant="verse" color="primary" align="right" rtl style={s.arabic}>
        {item.arabic}
      </SazdaText>
      {showTransliteration ? (
        <>
          <SazdaText variant="label" color="onSurfaceVariant" style={s.hindiLabel}>
            Transliteration (Hindi)
          </SazdaText>
          <SazdaText variant="bodyMedium" color="onSurfaceVariant" style={s.hindiBlock}>
            {item.transliteration}
          </SazdaText>
        </>
      ) : null}
      {showMeaning ? (
        <>
          <SazdaText variant="label" color="onSurfaceVariant" style={s.hindiLabel}>
            Meaning (Hindi)
          </SazdaText>
          <SazdaText variant="bodyMedium" color="onSurface" style={s.hindiBlock}>
            {item.meaning}
          </SazdaText>
        </>
      ) : null}
    </View>
  );
});

export function DailyDuasScreen() {
  const { colors: c, scheme } = useThemePalette();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createDuasStyles(c, scheme, Math.max(insets.bottom, spacing.md)), [c, scheme, insets.bottom]);
  const [showTransliteration, setShowTransliteration] = useState(false);
  const [showMeaning, setShowMeaning] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const sheetRef = useRef<TrueSheet>(null);

  const renderItem = useCallback(
    ({ item }: { item: DailyDua }) => (
      <DuaRow
        item={item}
        showTransliteration={showTransliteration}
        showMeaning={showMeaning}
        styles={styles}
      />
    ),
    [showTransliteration, showMeaning, styles],
  );

  const keyExtractor = useCallback((item: DailyDua) => item.id, []);

  const onDidDismiss = useTrueSheetOpenSync(sheetRef, settingsOpen, () => setSettingsOpen(false));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={{ paddingHorizontal: spacing.md }}>
        <ToolsSubheader title="Daily duas" subtitle="Essential supplications · same reading style as Quran" />
      </View>
      <FlatList
        data={DAILY_DUAS}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        windowSize={7}
        removeClippedSubviews
      />

      <View style={[styles.fabWrap, { bottom: Math.max(insets.bottom, spacing.md) + spacing.lg }]}>
        <IconButton
          variant="solid"
          size="lg"
          accessibilityLabel="Open dua display settings"
          onPress={() => setSettingsOpen(true)}
          icon={<Settings size={22} color={c.onPrimaryContainer} strokeWidth={2.2} />}
        />
      </View>

      <TrueSheet
        ref={sheetRef}
        name="daily-duas-settings"
        detents={['auto']}
        cornerRadius={radius.md + 14}
        backgroundColor={c.surface}
        dimmed
        grabber={false}
        draggable
        dismissible
        onDidDismiss={onDidDismiss}>
        <View style={styles.sheet}>
          <View style={[styles.sheetHandle, { backgroundColor: c.surfaceContainerHighest }]} />
          <View style={styles.sheetHeader}>
            <SazdaText variant="headlineMedium" color="primary" style={styles.sheetTitle}>
              Display settings
            </SazdaText>
            <Pressable
              onPress={() => void sheetRef.current?.dismiss()}
              style={styles.sheetCloseHit}
              accessibilityRole="button"
              accessibilityLabel="Close settings">
              <X size={24} color={c.primary} strokeWidth={2.2} />
            </Pressable>
          </View>
          <SazdaText variant="bodyMedium" color="onSurfaceVariant" style={styles.sheetSubtitle}>
            Choose what appears under the Arabic.
          </SazdaText>

          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <View style={styles.toggleIcon}>
                <Languages size={18} color={c.onSurfaceVariant} strokeWidth={2.2} />
              </View>
              <View style={styles.toggleLabels}>
                <SazdaText variant="bodyMedium" color="onSurface">
                  Show transliteration (Hindi)
                </SazdaText>
                <SazdaText variant="caption" color="onSurfaceVariant" style={styles.toggleHint}>
                  Devanagari-style reading help under the Arabic.
                </SazdaText>
              </View>
            </View>
            <Switch
              value={showTransliteration}
              onValueChange={setShowTransliteration}
              trackColor={{ false: c.outlineVariant, true: c.primaryContainer }}
              thumbColor={showTransliteration ? c.secondaryContainer : c.surfaceContainerHighest}
              style={styles.toggleSwitch}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <View style={styles.toggleIcon}>
                <BookOpenText size={18} color={c.onSurfaceVariant} strokeWidth={2.2} />
              </View>
              <View style={styles.toggleLabels}>
                <SazdaText variant="bodyMedium" color="onSurface">
                  Show meaning (Hindi)
                </SazdaText>
                <SazdaText variant="caption" color="onSurfaceVariant" style={styles.toggleHint}>
                  Short explanation under the Arabic.
                </SazdaText>
              </View>
            </View>
            <Switch
              value={showMeaning}
              onValueChange={setShowMeaning}
              trackColor={{ false: c.outlineVariant, true: c.primaryContainer }}
              thumbColor={showMeaning ? c.secondaryContainer : c.surfaceContainerHighest}
              style={styles.toggleSwitch}
            />
          </View>
        </View>
      </TrueSheet>
    </SafeAreaView>
  );
}
