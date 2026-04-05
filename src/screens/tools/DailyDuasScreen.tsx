import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SazdaText } from '../../components/atoms/SazdaText/SazdaText';
import { ToolsSubheader } from '../../components/molecules/ToolsSubheader/ToolsSubheader';
import type { DailyDua } from '../../data/dailyDuas';
import { DAILY_DUAS } from '../../data/dailyDuas';
import { spacing } from '../../theme/spacing';
import type { AppPalette } from '../../theme/useThemePalette';
import type { ResolvedScheme } from '../../theme/useThemePalette';
import { useThemePalette } from '../../theme/useThemePalette';

/** Matches `SurahReaderScreen` list padding and ayah separators for visual consistency. */
function createDuasStyles(c: AppPalette, _scheme: ResolvedScheme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.surface },
    body: { flex: 1 },
    toggleCard: {
      marginHorizontal: spacing.lg,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 12,
      backgroundColor: c.surfaceContainerLow,
      gap: spacing.xs,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      paddingVertical: spacing.xs,
    },
    toggleLabels: { flex: 1, minWidth: 0, gap: 2 },
    toggleHint: { opacity: 0.85, lineHeight: 17 },
    listContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.x3xl,
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
  const styles = useMemo(() => createDuasStyles(c, scheme), [c, scheme]);
  const [showTransliteration, setShowTransliteration] = useState(false);
  const [showMeaning, setShowMeaning] = useState(false);

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

  const ListHeader = useMemo(
    () => (
      <View style={styles.toggleCard}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleLabels}>
            <SazdaText variant="bodyMedium" color="onSurface">
              Show transliteration (Hindi)
            </SazdaText>
            <SazdaText variant="caption" color="onSurfaceVariant" style={styles.toggleHint}>
              Devanagari-style reading help under the Arabic.
            </SazdaText>
          </View>
          <Switch
            value={showTransliteration}
            onValueChange={setShowTransliteration}
            trackColor={{ false: c.outlineVariant, true: c.primaryContainer }}
            thumbColor={showTransliteration ? c.secondaryContainer : c.surfaceContainerHighest}
          />
        </View>
        <View style={styles.toggleRow}>
          <View style={styles.toggleLabels}>
            <SazdaText variant="bodyMedium" color="onSurface">
              Show meaning (Hindi)
            </SazdaText>
            <SazdaText variant="caption" color="onSurfaceVariant" style={styles.toggleHint}>
              Short explanation under the Arabic.
            </SazdaText>
          </View>
          <Switch
            value={showMeaning}
            onValueChange={setShowMeaning}
            trackColor={{ false: c.outlineVariant, true: c.primaryContainer }}
            thumbColor={showMeaning ? c.secondaryContainer : c.surfaceContainerHighest}
          />
        </View>
      </View>
    ),
    [c, showMeaning, showTransliteration, styles],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={{ paddingHorizontal: spacing.md }}>
        <ToolsSubheader title="Daily duas" subtitle="Essential supplications · same reading style as Quran" />
      </View>
      <FlatList
        data={DAILY_DUAS}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        windowSize={7}
        removeClippedSubviews
      />
    </SafeAreaView>
  );
}
