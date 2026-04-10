import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import {
  ArrowLeft,
  Bookmark,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Languages,
  Settings,
  Type,
} from 'lucide-react-native';
import type { QuranStackParamList } from '../../navigation/types';
import {
  assertPageMappingValid,
  findPageForAyah,
  getPageStart,
  MUSHAF_TOTAL_PAGES,
} from '../../services/mushaf/mushafPageMap';
import { prefetchMushafPages } from '../../services/mushaf/mushafPageContent';
import { juzForMushafPage } from '../../services/mushaf/mushafJuz';
import { getMushafPalette } from '../../services/mushaf/mushafTheme';
import type { MushafTheme } from '../../services/mushaf/mushafTheme';
import { toArabicIndicDigits } from '../../services/mushaf/arabicNumerals';
import { useMushafReaderStore } from '../../store/mushafReaderStore';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { MushafPageSlide } from './mushaf/MushafPageSlide';

type Nav = NativeStackNavigationProp<QuranStackParamList, 'MushafReader'>;
type R = RouteProp<QuranStackParamList, 'MushafReader'>;

const PAGES = Array.from({ length: MUSHAF_TOTAL_PAGES }, (_, i) => i + 1);
const AUTO_HIDE_MS = 2800;

export function MushafReaderScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const listRef = useRef<FlatList<number>>(null);

  /** Space reserved above tab bar for corner FABs (page + quick settings). */
  const fabStripHeight = 52;
  /** Room for floating back control (same row as safe area). */
  const topBackRow = 44;
  const contentTopPad = insets.top + topBackRow + spacing.sm;
  const contentBottomPad = tabBarHeight + fabStripHeight + spacing.md;

  const initialPage = useMemo(() => {
    const p = route.params?.initialPage;
    const sn = route.params?.surahNumber;
    const an = route.params?.ayahNumber ?? 1;
    if (typeof p === 'number' && p >= 1 && p <= MUSHAF_TOTAL_PAGES) return p;
    if (typeof sn === 'number' && sn >= 1 && sn <= 114) {
      return findPageForAyah(sn, an);
    }
    return useMushafReaderStore.getState().lastReadPage;
  }, [route.params]);

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const theme = useMushafReaderStore(s => s.theme);
  const fontScale = useMushafReaderStore(s => s.fontScale);
  const showTranslation = useMushafReaderStore(s => s.showTranslation);
  const setLastReadPage = useMushafReaderStore(s => s.setLastReadPage);
  const setFontScale = useMushafReaderStore(s => s.setFontScale);
  const setTheme = useMushafReaderStore(s => s.setTheme);
  const setShowTranslation = useMushafReaderStore(s => s.setShowTranslation);
  const addBookmark = useMushafReaderStore(s => s.addBookmark);
  const removeBookmark = useMushafReaderStore(s => s.removeBookmark);
  const bookmarks = useMushafReaderStore(s => s.bookmarks);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [jumpOpen, setJumpOpen] = useState(false);
  const [jumpText, setJumpText] = useState(String(initialPage));

  const palette = useMemo(() => getMushafPalette(theme), [theme]);

  useEffect(() => {
    if (__DEV__) {
      try {
        assertPageMappingValid();
      } catch (e) {
        console.warn('[Mushaf]', e);
      }
    }
  }, []);

  useEffect(() => {
    setLastReadPage(currentPage);
    prefetchMushafPages([currentPage - 1, currentPage + 1].filter(p => p >= 1 && p <= MUSHAF_TOTAL_PAGES));
  }, [currentPage, setLastReadPage]);

  useEffect(() => {
    // Wait for navigation transition to settle, then scroll
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const idx = initialPage - 1;
        listRef.current?.scrollToIndex({ index: idx, animated: false });
      });
    });
  }, [initialPage]);

  const showOverlay = useCallback(() => {
    setOverlayVisible(true);
    requestAnimationFrame(() => {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();
    });
  }, [opacity]);

  const hideOverlay = useCallback(() => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setOverlayVisible(false));
  }, [opacity]);

  const scheduleAutoHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      hideOverlay();
    }, AUTO_HIDE_MS);
  }, [hideOverlay]);

  const toggleOverlay = useCallback(() => {
    if (overlayVisible) {
      hideOverlay();
      if (hideTimer.current) clearTimeout(hideTimer.current);
    } else {
      showOverlay();
      scheduleAutoHide();
    }
  }, [overlayVisible, hideOverlay, showOverlay, scheduleAutoHide]);

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const page = Math.round(x / Math.max(1, width)) + 1;
      if (page >= 1 && page <= MUSHAF_TOTAL_PAGES) {
        setCurrentPage(page);
      }
    },
    [width],
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: width,
      offset: width * index,
      index,
    }),
    [width],
  );

  const renderItem = useCallback(
    ({ item }: { item: number }) => (
      <MushafPageSlide
        page={item}
        width={width}
        height={height}
        paddingTop={contentTopPad}
        paddingBottom={contentBottomPad}
        palette={palette}
        fontScale={fontScale}
        showTranslation={showTranslation}
      />
    ),
    [width, height, contentTopPad, contentBottomPad, palette, fontScale, showTranslation],
  );

  const juz = juzForMushafPage(currentPage);
  const bookmarkOnPage = bookmarks.find(b => b.page === currentPage);

  const applyJump = () => {
    const n = parseInt(jumpText, 10);
    if (!Number.isFinite(n) || n < 1 || n > MUSHAF_TOTAL_PAGES) return;
    setJumpOpen(false);
    setCurrentPage(n);
    listRef.current?.scrollToIndex({ index: n - 1, animated: true });
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
      />
      <Pressable
        onPress={() => navigation.goBack()}
        style={[
          styles.backFab,
          {
            top: insets.top + spacing.xs,
            left: spacing.md,
            backgroundColor: palette.surface,
            borderColor: palette.textMuted,
          },
        ]}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Back to Quran">
        <ArrowLeft size={22} color={palette.text} strokeWidth={2.5} />
      </Pressable>
      <FlatList
        style={styles.list}
        ref={listRef}
        data={PAGES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={String}
        initialScrollIndex={initialPage - 1}
        getItemLayout={getItemLayout}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={3}
        removeClippedSubviews
        renderItem={renderItem}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onScrollToIndexFailed={info => {
          setTimeout(() => {
            listRef.current?.scrollToIndex({
              index: info.index,
              animated: false,
            });
          }, 120);
        }}
        extraData={{ width, fontScale, theme, showTranslation }}
      />

      {/* Corner controls: page + settings — above tab bar, never over verse text */}
      {!overlayVisible ? (
        <View
          pointerEvents="box-none"
          style={[
            styles.fabRow,
            {
              bottom: tabBarHeight + Math.max(insets.bottom, spacing.xs),
              zIndex: 40,
              elevation: 40,
            },
          ]}>
          <Pressable
            onPress={toggleOverlay}
            style={[styles.pagePill, { backgroundColor: palette.surface }]}
            accessibilityLabel="Page and tools">
            <Text style={[styles.pagePillText, { color: palette.text }]}>
              {toArabicIndicDigits(currentPage)}
            </Text>
            <View style={[styles.dot, { backgroundColor: palette.accent }]} />
          </Pressable>
          <Pressable
            onPress={() => setSettingsOpen(true)}
            style={[styles.settingsFab, { backgroundColor: palette.primaryChip }]}
            accessibilityLabel="Appearance and text size">
            <Settings size={22} color={palette.onPrimaryChip} strokeWidth={2} />
          </Pressable>
        </View>
      ) : null}

      <Animated.View
        pointerEvents={overlayVisible ? 'auto' : 'none'}
        style={[
          StyleSheet.absoluteFill,
          { opacity, paddingTop: insets.top, zIndex: 30, elevation: 30 },
        ]}>
        <View style={[styles.topBar, { backgroundColor: palette.overlayBar }]}>
          <View style={styles.iconBtn} />
          <View style={styles.topCenter}>
            <View style={[styles.pageChip, { backgroundColor: palette.primaryChip }]}>
              <Text style={[styles.pageChipText, { color: palette.onPrimaryChip }]}>
                Page {currentPage}
              </Text>
            </View>
            <Text style={[styles.juzHint, { color: palette.textMuted }]}>
              Juz {juz} · {MUSHAF_TOTAL_PAGES} pages
            </Text>
          </View>
          <View style={styles.topRight}>
            <Pressable
              onPress={() => {
                setSettingsOpen(true);
                scheduleAutoHide();
              }}
              style={styles.iconBtn}
              accessibilityLabel="Settings">
              <Settings size={22} color={palette.text} strokeWidth={2} />
            </Pressable>
          </View>
        </View>

        <View style={styles.spacer} />

        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md, backgroundColor: palette.overlayBar }]}>
          <View style={styles.bottomInner}>
            <Pressable
              style={styles.bottomItem}
              onPress={() => {
                setShowTranslation(!showTranslation);
                scheduleAutoHide();
              }}>
              <Languages size={24} color={showTranslation ? palette.accent : palette.textMuted} strokeWidth={2} />
              <Text style={[styles.bottomLabel, { color: palette.textMuted }]}>Translate</Text>
            </Pressable>

            <Pressable
              style={[styles.jumpFab, { backgroundColor: palette.primaryChip }]}
              onPress={() => {
                setJumpText(String(currentPage));
                setJumpOpen(true);
                scheduleAutoHide();
              }}>
              <BookOpen size={24} color={palette.onPrimaryChip} strokeWidth={2} />
            </Pressable>

            <Pressable style={styles.bottomItem} onPress={() => setSettingsOpen(true)}>
              <Type size={24} color={palette.textMuted} strokeWidth={2} />
              <Text style={[styles.bottomLabel, { color: palette.textMuted }]}>Appearance</Text>
            </Pressable>

            <Pressable
              style={styles.bottomItem}
              onPress={() => {
                if (bookmarkOnPage) {
                  removeBookmark(bookmarkOnPage.page, bookmarkOnPage.surah, bookmarkOnPage.ayah);
                } else {
                  const st = getPageStart(currentPage);
                  addBookmark({ page: currentPage, surah: st.surah, ayah: st.ayah });
                }
                scheduleAutoHide();
              }}>
              <Bookmark
                size={24}
                color={bookmarkOnPage ? palette.accent : palette.textMuted}
                fill={bookmarkOnPage ? palette.accent : 'transparent'}
                strokeWidth={2}
              />
              <Text style={[styles.bottomLabel, { color: palette.textMuted }]}>Save</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>

      <Modal visible={settingsOpen} transparent animationType="fade" onRequestClose={() => setSettingsOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSettingsOpen(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: palette.surface }]} onPress={e => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: palette.text }]}>Mushaf appearance</Text>
            <Text style={[styles.modalSub, { color: palette.textMuted }]}>Theme</Text>
            <View style={styles.themeRow}>
              {(['light', 'sepia', 'dark'] as MushafTheme[]).map(t => (
                <Pressable
                  key={t}
                  onPress={() => setTheme(t)}
                  style={[
                    styles.themeChip,
                    theme === t && { borderColor: palette.accent, borderWidth: 2 },
                    { backgroundColor: palette.background },
                  ]}>
                  <Text style={{ color: palette.text }}>{t[0].toUpperCase() + t.slice(1)}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.modalSub, { color: palette.textMuted }]}>Text size</Text>
            <View style={styles.sizeRow}>
              <Pressable
                onPress={() => setFontScale(fontScale - 0.08)}
                style={styles.sizeBtn}>
                <ChevronDown size={22} color={palette.text} />
              </Pressable>
              <Text style={{ color: palette.text }}>{Math.round(fontScale * 100)}%</Text>
              <Pressable
                onPress={() => setFontScale(fontScale + 0.08)}
                style={styles.sizeBtn}>
                <ChevronUp size={22} color={palette.text} />
              </Pressable>
            </View>
            <Pressable style={styles.modalClose} onPress={() => setSettingsOpen(false)}>
              <Text style={{ color: palette.accent, fontWeight: '700' }}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={jumpOpen} transparent animationType="fade" onRequestClose={() => setJumpOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setJumpOpen(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: palette.surface }]} onPress={e => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: palette.text }]}>Jump to page</Text>
            <TextInput
              value={jumpText}
              onChangeText={setJumpText}
              keyboardType="number-pad"
              placeholder="1–604"
              placeholderTextColor={palette.textMuted}
              style={[styles.input, { color: palette.text, borderColor: palette.textMuted }]}
            />
            <Pressable style={styles.modalClose} onPress={applyJump}>
              <Text style={{ color: palette.accent, fontWeight: '700' }}>Go</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { flex: 1 },
  backFab: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    zIndex: 50,
    elevation: 50,
    shadowColor: 'rgba(0,0,0,0.12)',
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  fabRow: {
    position: 'absolute',
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    shadowColor: 'rgba(0,0,0,0.12)',
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  settingsFab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0,0,0,0.15)',
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  pagePillText: {
    fontSize: 16,
    fontWeight: '800',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    opacity: 0.5,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  topCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  pageChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  pageChipText: {
    fontWeight: '800',
    fontSize: 13,
  },
  juzHint: {
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  topRight: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacer: { flex: 1 },
  bottomBar: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  bottomInner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  bottomItem: {
    alignItems: 'center',
    gap: 4,
    minWidth: 72,
  },
  bottomLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  jumpFab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    shadowColor: 'rgba(0,0,0,0.15)',
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    borderRadius: radius.md,
    padding: spacing.xl,
    gap: spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  themeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  themeChip: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  sizeBtn: {
    padding: spacing.sm,
  },
  modalClose: {
    alignSelf: 'flex-end',
    paddingVertical: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
  },
});
