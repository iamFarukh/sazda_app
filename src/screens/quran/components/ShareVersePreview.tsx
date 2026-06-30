import { memo, useCallback } from 'react';
import { Modal, Pressable, Share, StyleSheet, Text } from 'react-native';
import { ShareVerseCard } from '../../../components/atoms/ShareVerseCard/ShareVerseCard';
import { buildShareText, type ShareVerseInput } from '../../../services/quran/readerLogic';
import { spacing } from '../../../theme/spacing';
import { radius } from '../../../theme/radius';
import { typography } from '../../../theme/typography';
import { hapticSelection } from '../../../utils/appHaptics';
import type { ReadingThemePalette } from '../../../theme/readingThemes';

type Props = {
  palette: ReadingThemePalette;
  visible: boolean;
  verse: ShareVerseInput | null;
  onClose: () => void;
};

/**
 * Verse share preview. Shows the Sazda ShareVerseCard and shares plain text via RN's built-in
 * Share. Image-capture share is a deferred follow-up (needs react-native-view-shot).
 */
export const ShareVersePreview = memo(function ShareVersePreview({ palette: p, visible, verse, onClose }: Props) {
  const onShareText = useCallback(() => {
    if (!verse) return;
    hapticSelection();
    void Share.share({ message: buildShareText(verse) }).catch(() => {});
    onClose();
  }, [verse, onClose]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
          {verse ? (
            <ShareVerseCard palette={p} arabic={verse.arabic} translation={verse.translation}
              surahEnglishName={verse.surahEnglishName} surahNumber={verse.surahNumber} ayahNumber={verse.ayahNumber} />
          ) : null}
          <Pressable testID="share-text-btn" onPress={onShareText}
            style={[styles.cta, { backgroundColor: p.accent }]} accessibilityLabel="Share as text">
            <Text style={[styles.ctaText, { color: p.surface }]}>Share text</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.xl },
  sheet: { gap: spacing.lg },
  cta: { borderRadius: radius.full, paddingVertical: spacing.md, alignItems: 'center' },
  ctaText: { ...typography.titleSm },
});
