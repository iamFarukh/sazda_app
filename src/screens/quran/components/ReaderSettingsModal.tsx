import { memo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { getReadingTheme, READING_THEMES, type ReadingTheme } from '../../../theme/readingThemes';
import { clampFontScale } from '../../../services/quran/readerLogic';
import { spacing } from '../../../theme/spacing';
import { radius } from '../../../theme/radius';
import { typography } from '../../../theme/typography';
import { hapticSelection } from '../../../utils/appHaptics';

type Props = {
  visible: boolean;
  theme: ReadingTheme;
  fontScale: number;
  onClose: () => void;
  onSetTheme: (t: ReadingTheme) => void;
  onSetFontScale: (n: number) => void;
};

const STEP = 0.06;

export const ReaderSettingsModal = memo(function ReaderSettingsModal({
  visible, theme, fontScale, onClose, onSetTheme, onSetFontScale,
}: Props) {
  const p = getReadingTheme(theme);
  const adjust = (delta: number) => { hapticSelection(); onSetFontScale(clampFontScale(fontScale + delta)); };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.card, { backgroundColor: p.surface }]} onPress={e => e.stopPropagation()}>
          <Text style={[styles.title, { color: p.text }]}>Reader appearance</Text>
          <Text style={[styles.sub, { color: p.textMuted }]}>Theme</Text>
          <View style={styles.themeRow}>
            {READING_THEMES.map(t => {
              const tp = getReadingTheme(t);
              const selected = theme === t;
              return (
                <Pressable key={t} testID={`theme-${t}`}
                  onPress={() => { hapticSelection(); onSetTheme(t); }}
                  style={[styles.themeChip, { backgroundColor: tp.background, borderColor: selected ? p.accent : tp.divider }, selected && styles.themeChipSelected]}>
                  <Text style={{ color: tp.text }}>{t[0].toUpperCase() + t.slice(1)}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.sub, { color: p.textMuted }]}>Text size</Text>
          <View style={styles.sizeRow}>
            <Pressable testID="size-dec" onPress={() => adjust(-STEP)} style={styles.sizeBtn}><ChevronDown size={22} color={p.text} /></Pressable>
            <Text style={{ color: p.text }}>{Math.round(fontScale * 100)}%</Text>
            <Pressable testID="size-inc" onPress={() => adjust(STEP)} style={styles.sizeBtn}><ChevronUp size={22} color={p.text} /></Pressable>
          </View>
          <Pressable style={styles.close} onPress={onClose}><Text style={[styles.closeText, { color: p.accent }]}>Done</Text></Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: spacing.xl },
  card: { borderRadius: radius.md, padding: spacing.xl, gap: spacing.md },
  title: { ...typography.headlineMedium },
  sub: { ...typography.label },
  themeRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  themeChip: { padding: spacing.md, borderRadius: radius.sm, borderWidth: 1 },
  themeChipSelected: { borderWidth: 2 },
  sizeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  sizeBtn: { padding: spacing.sm },
  close: { alignSelf: 'flex-end', paddingVertical: spacing.sm },
  closeText: { ...typography.titleSm },
});
