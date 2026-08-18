# P2b — Continuous (Infinite) Multi-Surah Reading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement task-by-task. Steps use checkbox (`- [ ]`) syntax. Each task: failing test → run (cite expected fail) → implement → run (expected pass) → commit with the `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` trailer.

**Goal:** Turn the redesigned Surah reader (`src/screens/quran/SurahReaderScreen.tsx`) into a CONTINUOUS reading surface: open surah N, and as the reader nears the end, the next surah (N+1) auto-appends seamlessly (NO tap gate), chaining forward 1→2→3…→114. Earlier surahs stay mounted so the user can scroll back. Every existing behavior is preserved verbatim: offline-first load, pinch-to-zoom `liveScale`, per-ayah audio highlight, `playAyah` queue, bookmarks, share, translation toggle, settings modal, last-read/recents/engagement tracking, and initial + playback scroll-sync.

**Architecture:** Convert the reader body from a single-surah `FlatList` to a `SectionList` of surahs. State holds `sections: ReaderSection[]` (`{ key, surah, data }`), seeded with the opened surah. Pure, dependency-free helpers in a new `src/services/quran/continuousReading.ts` decide the whole append lifecycle (next surah number, whether to append, which surah is at the top of the viewport, section-key/section-shape building) and are unit-tested first. Two thin presentational components — `SurahTransition` (blessing/completion footer between surahs) and `StickySurahBar` (floating current-surah bar that cross-fades on change) — are render-smoke-tested. The screen orchestrates: React Query prefetch of N+1 in the background as soon as N resolves, guarded `onEndReached` append (no spinner — append only once data resolves), `renderSectionHeader` (non-sticky rich `SurahOpeningHeader` + optional `BismillahReveal` with an elegant enter animation for sections after the first), `renderSectionFooter` (`SurahTransition`), and `onViewableItemsChanged` that both (a) drives the sticky bar's current surah and (b) records last-read against the top visible item's surah+ayah. `renderItem` learns each item's surah number from `section.surah` (items now belong to different surahs), so audio active-highlight and share stay correct across the chain.

**Tech Stack:** React Native `SectionList`, TypeScript, react-native-reanimated (mocked in jest; `FadeInDown`/`Entering` + `motionPresets.enter`), react-native-gesture-handler pinch (unchanged), zustand + MMKV, @tanstack/react-query (`useQuery` for section 0, `queryClient.prefetchQuery`/`fetchQuery` for lookahead), Jest + react-test-renderer (`renderer.create`/`unmount` wrapped in `act`). No new native dependencies.

**Verified facts (grounded in repo):**
- `loadSurahReaderDataOfflineFirst(n)` → `Promise<{ surah: QuranApiSurah; ayahs: AyahReaderRow[] }>` (memory-cached; `src/services/offlineQuran/reader.ts`). `QuranApiSurah = { number, name, englishName, englishNameTranslation, numberOfAyahs, revelationType }`. `AyahReaderRow = { numberInSurah, arabic, translation?, audioUrl? }` (`src/services/quranApi.ts`).
- Query key in use: `['quran', 'reader', surahNumber, OFFLINE_QURAN_VERSION]`, `staleTime: 1000*60*60*6` (`OFFLINE_QURAN_VERSION` from `src/services/offlineQuran/constants`).
- `isActiveAyah(surahNumber, ayahNumber, currentSurahNumber, currentAyahNumber)` and `shouldShowBismillah(n)` already exist in `src/services/quran/readerLogic.ts`.
- `getReaderPalette(theme)` → `ReadingThemePalette` with keys `background, surface, text, textMuted, accent, divider, ayahHighlight, ayahMarkerBg, ayahMarkerBorder, ayahMarkerText` (`src/services/quran/readerTheme.ts`, `src/theme/readingThemes.ts`). NO hardcoded hex anywhere new.
- `SurahOpeningHeader` props: `{ palette, arabicName, englishName, translation, ayahCount, revelationType }` (exports `revealedLabel`). `BismillahReveal` props: `{ reduceMotion?, color?, fontSize? }`. `AyahBlock` takes `{ item, palette, showTranslation, bookmarked, liveScale, audio, onPlay, onTafsir, onToggleBookmark, onShare }` — **kept as-is**.
- `motionPresets.enter = { duration: 320 (slow), easing, translateY: 12 }`; `durationFor(d, reduceMotion)` → 0 when reduced (`src/theme/motionPresets.ts`). `useReduceMotion` re-exports reanimated `useReducedMotion` (`src/hooks`).
- Max surah = 114; `SURAH_AYAH_COUNTS` length 114 (`src/data/surahAyahCounts.ts`).
- Progress store (`src/store/quranProgressStore.ts`): `setLastRead(surah, ayah)`, `recordAyahEngagement(surah, ayah)`, `touchRecentSurah(surah)`. Audio store (`src/store/quranAudioStore.ts`): `playAyah(item, queue?)`, `QuranAudioQueueItem`.
- Tests live in `__tests__/foundations/*`, run with `npm test -- <path>`, import source via `../../src/...`. reanimated/svg/lottie/audio-store are mocked in `jest.setup.js`; the screen smoke test additionally mocks `@react-navigation/native`, `@react-navigation/bottom-tabs`, `react-native-safe-area-context`, and `../../src/services/offlineQuran/reader`.

**Existing features preserved (per task):** pinch-zoom `liveScale` → threaded into every `AyahBlock` across all sections (Task 6); audio active-ayah highlight across sections via `section.surah.number` (Tasks 3, 6); `playAyah` queue build (Task 7); bookmarks/share/tafsir/translation toggle (Task 6); `ReaderAudioPlayerSheet`/`ReaderSettingsModal`/`ShareVersePreview` mounted unchanged (Task 6); zoom toast (Task 6); last-read/recents/engagement extended to record the top visible item's surah (Task 8); initial scroll to opened ayah + playback scroll-sync (Task 9).

**Approved design decisions:** seamless auto-append (NO tap gate); forward-only infinite chain; keep earlier surahs mounted; non-sticky section headers (`stickySectionHeadersEnabled={false}`) replaced by a floating `StickySurahBar`; no visible loading spinners for appended surahs; prefetch next surah in the background.

**Risks & mitigations:**
- **`SectionList.scrollToLocation` reliability / initial-scroll timing.** Mitigation: attempt scroll on `onContentSizeChange` guarded by a `scrolledRef`; recover in `onScrollToIndexFailed` (SectionList forwards the underlying VirtualizedList `onScrollToIndexFailed`) by retrying after ~300ms; always target `{ sectionIndex: 0, itemIndex: idxOfOpenedAyah, viewPosition: 0.15, animated: false }`. Keep `viewPosition` and the retry identical to the current FlatList behavior.
- **`renderItem` must know each item's surah.** Mitigation: `SectionList` passes `{ item, section }` to `renderItem`; read `section.surah.number` / `section.surah.englishName` for active-highlight, share, and the audio queue — never assume a single `surahNumber`.
- **Double-append on rapid `onEndReached`.** Mitigation: `appendingRef` boolean guard + a `loadedRef` Set of loaded surah numbers; the pure `shouldAppendNext` helper is the single source of truth and is unit-tested for the guard/boundary (past 114 → no append).
- **Perf with many mounted surahs.** Mitigation: `removeClippedSubviews`, `windowSize={8}`, `initialNumToRender={12}`, `maxToRenderPerBatch={14}`; append only near end; prefetch (not render) the lookahead surah.
- **Enter animation vs reduce-motion.** Mitigation: section-header enter uses `FadeInDown.duration(durationFor(motionPresets.enter.duration, reduceMotion))`; when reduced, duration 0 = instant. First section never animates.

**Deferred (do NOT build here):** backward/previous-surah prepend; cross-surah continuous AUDIO auto-advance (audio queue stays per-surah as today); jump-to-surah menu from the sticky bar.

---

### Task 1: Pure helper — `nextSurahNumber`

**Files:** Create `src/services/quran/continuousReading.ts`; Test `__tests__/foundations/continuousReading.test.ts`.

- [ ] **Step 1 — failing test** `__tests__/foundations/continuousReading.test.ts`:
```ts
import { nextSurahNumber } from '../../src/services/quran/continuousReading';

describe('nextSurahNumber', () => {
  it('returns the following surah for ordinary numbers', () => {
    expect(nextSurahNumber(1)).toBe(2);
    expect(nextSurahNumber(113)).toBe(114);
  });
  it('returns null at and past the last surah (114)', () => {
    expect(nextSurahNumber(114)).toBeNull();
    expect(nextSurahNumber(200)).toBeNull();
  });
  it('returns null for invalid input', () => {
    expect(nextSurahNumber(0)).toBeNull();
    expect(nextSurahNumber(-3)).toBeNull();
    expect(nextSurahNumber(1.5)).toBeNull();
  });
});
```
- [ ] **Step 2 — run, expect FAIL** (module not found): `npm test -- __tests__/foundations/continuousReading.test.ts`
- [ ] **Step 3 — implement** `src/services/quran/continuousReading.ts`:
```ts
import type { AyahReaderRow, QuranApiSurah } from '../quranApi';

/** Total surahs in the mushaf. */
export const LAST_SURAH_NUMBER = 114;

/**
 * Next surah number in the forward chain, or null when there is no next surah
 * (current is the last surah, or the input is not a valid surah number).
 */
export function nextSurahNumber(current: number): number | null {
  if (!Number.isInteger(current) || current < 1 || current >= LAST_SURAH_NUMBER) {
    return null;
  }
  return current + 1;
}

/** One loaded surah section in the continuous reader. */
export type ReaderSection = {
  /** Stable list key, e.g. "surah-2". */
  key: string;
  surah: QuranApiSurah;
  data: AyahReaderRow[];
};
```
- [ ] **Step 4 — run, expect PASS.**
- [ ] **Step 5 — commit:** `git add -A && git commit -m "feat(quran): continuous-reading next-surah helper + ReaderSection type" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

### Task 2: Pure helpers — `buildSection` & `shouldAppendNext`

**Files:** Append to `src/services/quran/continuousReading.ts`; Test `__tests__/foundations/continuousReadingAppend.test.ts`.

- [ ] **Step 1 — failing test** `__tests__/foundations/continuousReadingAppend.test.ts`:
```ts
import {
  buildSection,
  shouldAppendNext,
} from '../../src/services/quran/continuousReading';
import type { QuranApiSurah } from '../../src/services/quranApi';

const surah2: QuranApiSurah = {
  number: 2, name: 'البقرة', englishName: 'Al-Baqarah',
  englishNameTranslation: 'The Cow', numberOfAyahs: 2, revelationType: 'Medinan',
};

describe('buildSection', () => {
  it('wraps surah data into a keyed section', () => {
    const s = buildSection({
      surah: surah2,
      ayahs: [{ numberInSurah: 1, arabic: 'A1' }, { numberInSurah: 2, arabic: 'A2' }],
    });
    expect(s.key).toBe('surah-2');
    expect(s.surah.number).toBe(2);
    expect(s.data).toHaveLength(2);
  });
});

describe('shouldAppendNext', () => {
  it('returns the next surah number to append when not loaded and not appending', () => {
    expect(shouldAppendNext(new Set([1]), 1, false)).toBe(2);
  });
  it('returns null while an append is already in flight', () => {
    expect(shouldAppendNext(new Set([1]), 1, true)).toBeNull();
  });
  it('returns null when the next surah is already loaded', () => {
    expect(shouldAppendNext(new Set([1, 2]), 2, false)).toBeNull();
  });
  it('returns null past the last surah', () => {
    expect(shouldAppendNext(new Set([114]), 114, false)).toBeNull();
  });
});
```
- [ ] **Step 2 — run, expect FAIL** (`buildSection`/`shouldAppendNext` not exported): `npm test -- __tests__/foundations/continuousReadingAppend.test.ts`
- [ ] **Step 3 — implement** (append to `src/services/quran/continuousReading.ts`):
```ts
/** Builds a keyed section from freshly-loaded surah reader data. */
export function buildSection(input: {
  surah: QuranApiSurah;
  ayahs: AyahReaderRow[];
}): ReaderSection {
  return { key: `surah-${input.surah.number}`, surah: input.surah, data: input.ayahs };
}

/**
 * Decides which surah (if any) to append next.
 * Returns the next surah number when: the highest loaded surah has a valid successor,
 * that successor is not already loaded, and no append is currently in flight.
 * Otherwise returns null.
 */
export function shouldAppendNext(
  loaded: Set<number>,
  maxLoaded: number,
  isAppending: boolean,
): number | null {
  if (isAppending) return null;
  const next = nextSurahNumber(maxLoaded);
  if (next == null) return null;
  if (loaded.has(next)) return null;
  return next;
}
```
- [ ] **Step 4 — run, expect PASS.**
- [ ] **Step 5 — commit:** `git add -A && git commit -m "feat(quran): buildSection + shouldAppendNext append-lifecycle helpers" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

### Task 3: Pure helper — `topVisibleSurah`

**Files:** Append to `src/services/quran/continuousReading.ts`; Test `__tests__/foundations/topVisibleSurah.test.ts`.

- [ ] **Step 1 — failing test** `__tests__/foundations/topVisibleSurah.test.ts`:
```ts
import { topVisibleSurah } from '../../src/services/quran/continuousReading';

// Minimal shape of SectionList ViewToken entries we rely on.
const tok = (surahNumber: number, ayah: number, isViewable = true) => ({
  isViewable,
  item: { numberInSurah: ayah },
  section: { surah: { number: surahNumber } },
});

describe('topVisibleSurah', () => {
  it('returns the surah + ayah of the first viewable item', () => {
    expect(topVisibleSurah([tok(2, 5), tok(2, 6)])).toEqual({ surahNumber: 2, ayahNumber: 5 });
  });
  it('skips non-viewable leading tokens', () => {
    expect(topVisibleSurah([tok(3, 1, false), tok(3, 2, true)])).toEqual({
      surahNumber: 3, ayahNumber: 2,
    });
  });
  it('returns null when nothing is viewable', () => {
    expect(topVisibleSurah([tok(2, 1, false)])).toBeNull();
    expect(topVisibleSurah([])).toBeNull();
  });
  it('returns null when the token lacks section/item data', () => {
    expect(topVisibleSurah([{ isViewable: true, item: null, section: null } as never])).toBeNull();
  });
});
```
- [ ] **Step 2 — run, expect FAIL:** `npm test -- __tests__/foundations/topVisibleSurah.test.ts`
- [ ] **Step 3 — implement** (append to `src/services/quran/continuousReading.ts`):
```ts
/** Loosely-typed SectionList viewable-item token (only the fields we read). */
export type ReaderViewToken = {
  isViewable: boolean;
  item?: { numberInSurah?: number } | null;
  section?: { surah?: { number?: number } } | null;
};

/**
 * Derives the surah + ayah of the top-most viewable item — used for both the sticky
 * current-surah bar and last-read tracking. Returns null when nothing usable is visible.
 */
export function topVisibleSurah(
  tokens: ReaderViewToken[],
): { surahNumber: number; ayahNumber: number } | null {
  const first = tokens.find(t => t.isViewable);
  const surahNumber = first?.section?.surah?.number;
  const ayahNumber = first?.item?.numberInSurah;
  if (typeof surahNumber !== 'number' || typeof ayahNumber !== 'number') return null;
  return { surahNumber, ayahNumber };
}
```
- [ ] **Step 4 — run, expect PASS.**
- [ ] **Step 5 — commit:** `git add -A && git commit -m "feat(quran): topVisibleSurah helper for sticky bar + last-read tracking" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

### Task 4: `SurahTransition` blessing/completion footer

**Files:** Create `src/screens/quran/components/SurahTransition.tsx`; Test `__tests__/foundations/SurahTransition.test.tsx`.

- [ ] **Step 1 — failing test** `__tests__/foundations/SurahTransition.test.tsx`:
```tsx
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import {
  SurahTransition,
  completionLine,
} from '../../src/screens/quran/components/SurahTransition';
import { getReadingTheme } from '../../src/theme/readingThemes';

describe('completionLine', () => {
  it('names the completed surah', () => {
    expect(completionLine('Al-Baqarah')).toBe("You've completed Surah Al-Baqarah");
  });
});

describe('SurahTransition', () => {
  it('renders across themes without crashing', () => {
    for (const t of ['light', 'sepia', 'dark'] as const) {
      let tree: renderer.ReactTestRenderer;
      act(() => {
        tree = renderer.create(
          <SurahTransition palette={getReadingTheme(t)} englishName="Al-Baqarah" />,
        );
      });
      expect(tree!.toJSON()).toBeTruthy();
      act(() => tree!.unmount());
    }
  });
});
```
- [ ] **Step 2 — run, expect FAIL:** `npm test -- __tests__/foundations/SurahTransition.test.tsx`
- [ ] **Step 3 — implement** `src/screens/quran/components/SurahTransition.tsx`:
```tsx
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { typography } from '../../../theme/typography';
import { spacing } from '../../../theme/spacing';
import type { ReadingThemePalette } from '../../../theme/readingThemes';

type Props = {
  palette: ReadingThemePalette;
  englishName: string;
};

/** Pure copy helper (unit-tested): the surah-completion sentence. */
export function completionLine(englishName: string): string {
  return `You've completed Surah ${englishName}`;
}

/**
 * Calm completion block shown at the end of each surah in the continuous reader:
 * a soft gold ornament divider, the completion line, and a blessing.
 */
export const SurahTransition = memo(function SurahTransition({ palette: p, englishName }: Props) {
  return (
    <View style={styles.wrap} accessibilityRole="summary">
      <View style={styles.ornamentRow}>
        <View style={[styles.rule, { backgroundColor: p.accent }]} />
        <Text style={[styles.diamond, { color: p.accent }]}>✦</Text>
        <View style={[styles.rule, { backgroundColor: p.accent }]} />
      </View>
      <Text style={[styles.done, { color: p.text }]}>✓ {completionLine(englishName)}</Text>
      <Text style={[styles.blessing, { color: p.textMuted }]}>
        🤲 May Allah accept your recitation
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.xs,
  },
  ornamentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  rule: { width: 48, height: StyleSheet.hairlineWidth * 2, opacity: 0.5, borderRadius: 1 },
  diamond: { fontSize: 12 },
  done: { ...typography.bodyMedium, textAlign: 'center', fontWeight: '700' },
  blessing: { ...typography.caption, textAlign: 'center', letterSpacing: 0.4 },
});
```
- [ ] **Step 4 — run, expect PASS.**
- [ ] **Step 5 — commit:** `git add -A && git commit -m "feat(quran): SurahTransition completion/blessing footer between surahs" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

### Task 5: `StickySurahBar` floating current-surah bar

**Files:** Create `src/screens/quran/components/StickySurahBar.tsx`; Test `__tests__/foundations/StickySurahBar.test.tsx`.

- [ ] **Step 1 — failing test** `__tests__/foundations/StickySurahBar.test.tsx`:
```tsx
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { StickySurahBar } from '../../src/screens/quran/components/StickySurahBar';
import { getReadingTheme } from '../../src/theme/readingThemes';

describe('StickySurahBar', () => {
  it('renders the current surah name across themes and re-renders on change', () => {
    for (const t of ['light', 'sepia', 'dark'] as const) {
      let tree: renderer.ReactTestRenderer;
      act(() => {
        tree = renderer.create(
          <StickySurahBar palette={getReadingTheme(t)} englishName="Al-Baqarah" reduceMotion />,
        );
      });
      expect(tree!.toJSON()).toBeTruthy();
      act(() => {
        tree!.update(
          <StickySurahBar palette={getReadingTheme(t)} englishName="Aal-E-Imran" reduceMotion />,
        );
      });
      expect(tree!.toJSON()).toBeTruthy();
      act(() => tree!.unmount());
    }
  });

  it('renders nothing when there is no current surah', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <StickySurahBar palette={getReadingTheme('light')} englishName={null} reduceMotion />,
      );
    });
    expect(tree!.toJSON()).toBeNull();
    act(() => tree!.unmount());
  });
});
```
- [ ] **Step 2 — run, expect FAIL:** `npm test -- __tests__/foundations/StickySurahBar.test.tsx`
- [ ] **Step 3 — implement** `src/screens/quran/components/StickySurahBar.tsx`:
```tsx
import { memo, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SazdaText } from '../../../components/atoms/SazdaText/SazdaText';
import { motionPresets, durationFor } from '../../../theme/motionPresets';
import { spacing } from '../../../theme/spacing';
import { radius } from '../../../theme/radius';
import type { ReadingThemePalette } from '../../../theme/readingThemes';

type Props = {
  palette: ReadingThemePalette;
  /** Current top-most surah name, or null to hide the bar. */
  englishName: string | null;
  reduceMotion: boolean;
};

/**
 * Floating, absolutely-positioned bar (below the nav header) showing the CURRENT surah.
 * Cross-fades + slides gently whenever the name changes; instant under reduce-motion.
 * Replaces SectionList sticky headers (which are disabled on the list).
 */
export const StickySurahBar = memo(function StickySurahBar({
  palette: p,
  englishName,
  reduceMotion,
}: Props) {
  const enter = useSharedValue(1);

  useEffect(() => {
    if (englishName == null) return;
    const duration = durationFor(motionPresets.enter.duration, reduceMotion);
    enter.value = 0;
    enter.value = withTiming(1, { duration, easing: motionPresets.enter.easing });
  }, [englishName, enter, reduceMotion]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * -8 }],
  }), [enter]);

  if (englishName == null) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        { backgroundColor: p.surface, borderColor: p.divider },
        animStyle,
      ]}>
      <SazdaText variant="label" color={p.textMuted} numberOfLines={1}>
        {englishName}
      </SazdaText>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: spacing.xs,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: '80%',
    opacity: 0.96,
  },
});
```
> If `variant="label"` is not a valid `SazdaText` variant, use `variant="caption"`. If `radius.full` is absent, use `999`.
- [ ] **Step 4 — run, expect PASS.**
- [ ] **Step 5 — commit:** `git add -A && git commit -m "feat(quran): StickySurahBar floating current-surah indicator" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

### Task 6: SectionList rewrite — sections state, renderItem via section, header/footer, sticky bar (behavior-preserving)

**Files:** Edit `src/screens/quran/SurahReaderScreen.tsx`; the existing smoke test `__tests__/foundations/SurahReaderScreen.smoke.test.tsx` must still pass.

This is the core rewrite. It (a) seeds `sections` from the `useQuery` result for the opened surah, (b) renders a `SectionList` with non-sticky `renderSectionHeader` (`SurahOpeningHeader` + `BismillahReveal`, animated for sections after the first) and `renderSectionFooter` (`SurahTransition`), (c) threads `section.surah` into `renderItem` for active-highlight + share + queue, (d) keeps pinch-zoom, toast, audio sheet, settings modal, share preview, and translation toggle verbatim, and (e) mounts `StickySurahBar`. Append/prefetch/scroll wiring land in Tasks 7–9; here we keep the seeded single section behaving exactly as today.

- [ ] **Step 1 — failing test:** first extend the smoke test to assert cross-section correctness by making the mock return distinct data and (later) exercise append. Replace `__tests__/foundations/SurahReaderScreen.smoke.test.tsx` with:
```tsx
import React from 'react';
import renderer, { act } from 'react-test-renderer';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: { surahNumber: 2, ayahNumber: 1 } }),
}));
jest.mock('@react-navigation/bottom-tabs', () => ({ useBottomTabBarHeight: () => 64 }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../../src/store/quranAudioStore', () => {
  const state = {
    currentSurahNumber: null,
    currentAyahNumber: null,
    audioUrl: null,
    isPlaying: false,
    isLoading: false,
    playAyah: jest.fn(async () => {}),
  };
  const useQuranAudioStore = (selector?: (s: typeof state) => unknown) =>
    selector ? selector(state) : state;
  useQuranAudioStore.getState = () => state;
  return { useQuranAudioStore };
});

// Distinct data for surah 2 and 3 so append logic can be exercised.
jest.mock('../../src/services/offlineQuran/reader', () => {
  const surahs: Record<number, unknown> = {
    2: {
      surah: { number: 2, name: 'البقرة', englishName: 'Al-Baqarah', englishNameTranslation: 'The Cow', numberOfAyahs: 2, revelationType: 'Medinan' },
      ayahs: [
        { numberInSurah: 1, arabic: 'B1', translation: 't1', audioUrl: 'file://b1' },
        { numberInSurah: 2, arabic: 'B2', translation: 't2', audioUrl: 'file://b2' },
      ],
    },
    3: {
      surah: { number: 3, name: 'آل عمران', englishName: 'Aal-E-Imran', englishNameTranslation: 'The Family of Imran', numberOfAyahs: 2, revelationType: 'Medinan' },
      ayahs: [
        { numberInSurah: 1, arabic: 'I1', translation: 't1', audioUrl: 'file://i1' },
        { numberInSurah: 2, arabic: 'I2', translation: 't2', audioUrl: 'file://i2' },
      ],
    },
  };
  return { loadSurahReaderDataOfflineFirst: jest.fn(async (n: number) => surahs[n] ?? surahs[2]) };
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SurahReaderScreen } from '../../src/screens/quran/SurahReaderScreen';

describe('SurahReaderScreen (continuous smoke)', () => {
  it('mounts a SectionList reader without crashing', () => {
    const qc = new QueryClient();
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <QueryClientProvider client={qc}><SurahReaderScreen /></QueryClientProvider>,
      );
    });
    expect(tree!.toJSON()).toBeTruthy();
    act(() => tree!.unmount());
  });
});
```
- [ ] **Step 2 — run, expect FAIL** initially only if the rewrite is incomplete; run to confirm the current screen still passes the renamed test first (`npm test -- __tests__/foundations/SurahReaderScreen.smoke.test.tsx`). It should PASS against the old FlatList screen — that is fine; the rewrite must keep it passing. Treat this task's "failing" gate as: after starting the SectionList edit, run the test and cite any transient failure before completing Step 3.
- [ ] **Step 3 — implement** the SectionList rewrite of `src/screens/quran/SurahReaderScreen.tsx`. Replace the FlatList body with the SectionList body below. Keep all imports, pinch gesture, toast, stores, settings modal, and share preview exactly as they are today; only the list rendering, `renderItem` signature, and header change. Full new pieces:

Imports to add (top of file):
```tsx
import { SectionList } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  buildSection,
  topVisibleSurah,
  type ReaderSection,
  type ReaderViewToken,
} from '../../services/quran/continuousReading';
import { SurahTransition } from './components/SurahTransition';
import { StickySurahBar } from './components/StickySurahBar';
import { motionPresets, durationFor } from '../../theme/motionPresets';
```
(Remove the `FlatList` import; keep `type ViewToken` only if still referenced — the helper uses its own `ReaderViewToken`.)

Sections state + refs (inside component, replacing the single-surah assumptions):
```tsx
const listRef = useRef<SectionList<AyahReaderRow, ReaderSection>>(null);
const [sections, setSections] = useState<ReaderSection[]>([]);
const loadedRef = useRef<Set<number>>(new Set());
const appendingRef = useRef(false);
const [currentSurahName, setCurrentSurahName] = useState<string | null>(null);
```

Seed the first section when the opened surah's `useQuery` data resolves:
```tsx
useEffect(() => {
  if (!data?.surah) return;
  const seed = buildSection(data);
  loadedRef.current = new Set([data.surah.number]);
  setSections([seed]);
  setCurrentSurahName(data.surah.englishName);
}, [data]);
```

`renderItem` now reads the surah from the section:
```tsx
const renderItem = useCallback(
  ({ item, section }: { item: AyahReaderRow; section: ReaderSection }) => {
    const sNum = section.surah.number;
    const active = isActiveAyah(sNum, item.numberInSurah, audioCurrentSurahNumber, audioCurrentAyahNumber);
    return (
      <AyahBlock
        item={item}
        palette={palette}
        showTranslation={showTranslation}
        bookmarked={isBookmarked(sNum, item.numberInSurah)}
        liveScale={liveScale}
        audio={{
          isActive: active,
          isPlaying: active && audioIsPlaying,
          isLoading: active && audioIsLoading,
          hasAudio: !!item.audioUrl,
        }}
        onPlay={() => playAyah(section, item)}
        onTafsir={() => navigation.navigate('Tafsir', { surahNumber: sNum, ayahNumber: item.numberInSurah })}
        onToggleBookmark={() =>
          isBookmarked(sNum, item.numberInSurah)
            ? removeBookmark(sNum, item.numberInSurah)
            : addBookmark(sNum, item.numberInSurah)
        }
        onShare={() =>
          setVerseToShare({
            arabic: item.arabic,
            translation: item.translation,
            surahEnglishName: section.surah.englishName,
            surahNumber: sNum,
            ayahNumber: item.numberInSurah,
          })
        }
      />
    );
  },
  [
    addBookmark, audioCurrentAyahNumber, audioCurrentSurahNumber, audioIsLoading,
    audioIsPlaying, isBookmarked, liveScale, navigation, palette, playAyah,
    removeBookmark, showTranslation,
  ],
);
```

Section header (non-sticky; animated after the first section):
```tsx
const renderSectionHeader = useCallback(
  ({ section }: { section: ReaderSection }) => {
    const isFirst = section.surah.number === sections[0]?.surah.number;
    const header = (
      <>
        <SurahOpeningHeader
          palette={palette}
          arabicName={section.surah.name}
          englishName={section.surah.englishName}
          translation={section.surah.englishNameTranslation}
          ayahCount={section.surah.numberOfAyahs}
          revelationType={section.surah.revelationType}
        />
        {shouldShowBismillah(section.surah.number) ? (
          <BismillahReveal reduceMotion={reduceMotion} color={palette.accent} />
        ) : null}
      </>
    );
    if (isFirst) return <View>{header}</View>;
    return (
      <Animated.View
        entering={FadeInDown.duration(
          durationFor(motionPresets.enter.duration, reduceMotion),
        )}>
        {header}
      </Animated.View>
    );
  },
  [palette, reduceMotion, sections],
);
```

Section footer:
```tsx
const renderSectionFooter = useCallback(
  ({ section }: { section: ReaderSection }) => (
    <SurahTransition palette={palette} englishName={section.surah.englishName} />
  ),
  [palette],
);
```

The list itself (replaces the FlatList; keep the `GestureDetector`/`Animated.View` wrapper, `ReaderAudioPlayerSheet`, toast, and `onLayout` container exactly as today). Append/scroll/prefetch props (`onEndReached`, `onContentSizeChange`, `onScrollToIndexFailed`) are added in Tasks 7–9 — leave them as `undefined`/no-op stubs here so the file compiles:
```tsx
<SectionList
  ref={listRef}
  sections={sections}
  keyExtractor={(a, i) => `${a.numberInSurah}-${i}`}
  renderItem={renderItem}
  renderSectionHeader={renderSectionHeader}
  renderSectionFooter={renderSectionFooter}
  stickySectionHeadersEnabled={false}
  extraData={{ showTranslation, surahReaderTheme, audioCurrentSurahNumber, audioCurrentAyahNumber, audioIsPlaying }}
  showsVerticalScrollIndicator={false}
  initialNumToRender={12}
  maxToRenderPerBatch={14}
  windowSize={8}
  removeClippedSubviews
  onViewableItemsChanged={onViewableItemsChanged}
  viewabilityConfig={VIEW_CFG}
  contentContainerStyle={[
    styles.listContent,
    audioUrlActive ? { paddingBottom: tabBarHeight + 66 + spacing.lg } : null,
  ]}
/>
```

Mount the sticky bar just after the `SectionList` inside the `listWrap` `View`:
```tsx
<StickySurahBar palette={palette} englishName={currentSurahName} reduceMotion={reduceMotion} />
```

Update `onViewableItemsChanged` to use the helper (drives both sticky bar and last-read; last-read change lands in Task 8 — here just update the name):
```tsx
const onViewableItemsChanged = useRef(
  ({ viewableItems }: { viewableItems: ReaderViewToken[] }) => {
    const top = topVisibleSurah(viewableItems);
    if (!top) return;
    setCurrentSurahName(
      sectionsRef.current.find(s => s.surah.number === top.surahNumber)?.surah.englishName ?? null,
    );
    scheduleRef.current(top.surahNumber, top.ayahNumber);
  },
).current;
```
> Add `const sectionsRef = useRef<ReaderSection[]>([]);` and keep it in sync: `sectionsRef.current = sections;` on every render (assignment, not effect). Extend `scheduleRef`/`scheduleLastRead` to accept `(surah, ayah)` — implemented in Task 8; for this task, keep the old single-surah `scheduleLastRead` and pass only `top.ayahNumber` if the signature is not yet updated. Prefer completing Task 8's signature change together with this edit if convenient.

- [ ] **Step 4 — run, expect PASS:** `npm test -- __tests__/foundations/SurahReaderScreen.smoke.test.tsx` (SectionList mounts with the seeded section). Also run the full suite `npm test` to confirm nothing regressed.
- [ ] **Step 5 — commit:** `git add -A && git commit -m "feat(quran): SectionList reader body with per-section header/footer + sticky bar (append wiring stubbed)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

### Task 7: Cross-section `playAyah` (per-surah queue from the section)

**Files:** Edit `src/screens/quran/SurahReaderScreen.tsx`. Covered by the continuous smoke test (no crash) + manual reasoning; the audio store is mocked.

- [ ] **Step 1 — failing test:** the continuous smoke test already invokes `renderItem` (which references `playAyah(section, item)`). Before this change `playAyah` takes only `(item)` and reads a single `data`, so TypeScript / runtime will mismatch the new `renderItem`. Run `npm test -- __tests__/foundations/SurahReaderScreen.smoke.test.tsx` and cite the type/runtime mismatch on `playAyah` args as the failing gate.
- [ ] **Step 2 — run, expect FAIL** (arg count / undefined `data.surah` for appended sections).
- [ ] **Step 3 — implement:** rewrite `playAyah` to build its queue from the section, not the top-level `data`:
```tsx
const playAyah = useCallback(
  (section: ReaderSection, item: AyahReaderRow) => {
    if (!item.audioUrl) return;
    const queue: QuranAudioQueueItem[] = section.data
      .filter(a => !!a.audioUrl)
      .map(a => ({
        surahNumber: section.surah.number,
        surahEnglishName: section.surah.englishName,
        ayahNumber: a.numberInSurah,
        arabic: a.arabic,
        translation: a.translation,
        audioUrl: a.audioUrl!,
      }));
    const qItem: QuranAudioQueueItem = {
      surahNumber: section.surah.number,
      surahEnglishName: section.surah.englishName,
      ayahNumber: item.numberInSurah,
      arabic: item.arabic,
      translation: item.translation,
      audioUrl: item.audioUrl,
    };
    void playAyahGlobal(qItem, queue);
  },
  [playAyahGlobal],
);
```
- [ ] **Step 4 — run, expect PASS:** `npm test -- __tests__/foundations/SurahReaderScreen.smoke.test.tsx` and `npm test`.
- [ ] **Step 5 — commit:** `git add -A && git commit -m "feat(quran): build audio queue from the section so playback works across appended surahs" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

### Task 8: Extend last-read tracking to record the top visible surah

**Files:** Edit `src/screens/quran/SurahReaderScreen.tsx`; add a store-integration test `__tests__/foundations/continuousLastRead.test.ts` around the pure derivation used by tracking.

- [ ] **Step 1 — failing test** `__tests__/foundations/continuousLastRead.test.ts` (verifies `topVisibleSurah` feeds a correct surah+ayah pair for tracking; the screen calls `setLastRead(surah, ayah)` with exactly this):
```ts
import { topVisibleSurah } from '../../src/services/quran/continuousReading';

// Simulates crossing from surah 2 into surah 3: last-read must follow the visible surah.
const tok = (surahNumber: number, ayah: number) => ({
  isViewable: true,
  item: { numberInSurah: ayah },
  section: { surah: { number: surahNumber } },
});

describe('continuous last-read source', () => {
  it('reports surah 3 once its first ayah is the top visible item', () => {
    expect(topVisibleSurah([tok(3, 1), tok(3, 2)])).toEqual({ surahNumber: 3, ayahNumber: 1 });
  });
  it('still reports surah 2 while its ayahs lead the viewport', () => {
    expect(topVisibleSurah([tok(2, 40)])).toEqual({ surahNumber: 2, ayahNumber: 40 });
  });
});
```
- [ ] **Step 2 — run, expect PASS for the helper** (already implemented Task 3) — this test locks the contract. If you prefer a strict red gate, first change `scheduleLastRead` to a `(surah, ayah)` signature and confirm the screen compiles; the failing gate is the TypeScript error in `onViewableItemsChanged` calling `scheduleRef.current(surah, ayah)` against the old single-arg ref.
- [ ] **Step 3 — implement:** change last-read tracking to be surah-aware:
```tsx
const scheduleRef = useRef<(surah: number, ayah: number) => void>(() => {});

const scheduleLastRead = useCallback((surah: number, ayah: number) => {
  if (debounceRef.current) clearTimeout(debounceRef.current);
  debounceRef.current = setTimeout(() => {
    const st = useQuranProgressStore.getState();
    st.setLastRead(surah, ayah);
    st.recordAyahEngagement(surah, ayah);
    st.touchRecentSurah(surah);
  }, 420);
}, []);

scheduleRef.current = scheduleLastRead;
```
And in `onViewableItemsChanged` (from Task 6) call `scheduleRef.current(top.surahNumber, top.ayahNumber);`. Keep the mount-time `setLastRead(surahNumber, ayahNumber)` and `touchRecentSurah(surahNumber)` effects for the opened surah unchanged.
- [ ] **Step 4 — run, expect PASS:** `npm test -- __tests__/foundations/continuousLastRead.test.ts` and `npm test -- __tests__/foundations/SurahReaderScreen.smoke.test.tsx` and `npm test`.
- [ ] **Step 5 — commit:** `git add -A && git commit -m "feat(quran): last-read/recents follow the top visible surah across the chain" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

### Task 9: Lazy append + background prefetch + initial scroll (`scrollToLocation`)

**Files:** Edit `src/screens/quran/SurahReaderScreen.tsx`; covered by the continuous smoke test (mock returns distinct surah 3 data so append resolves) plus the `shouldAppendNext` unit coverage from Task 2.

- [ ] **Step 1 — failing test:** extend the continuous smoke test to assert that after `onEndReached` fires, a second section appears. Add to `__tests__/foundations/SurahReaderScreen.smoke.test.tsx`:
```tsx
it('appends the next surah when the end is reached', async () => {
  const qc = new QueryClient();
  let tree: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <QueryClientProvider client={qc}><SurahReaderScreen /></QueryClientProvider>,
    );
  });
  // Flush the seed query + prefetch.
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  // Find the SectionList and fire onEndReached.
  const list = tree!.root.findByType(require('react-native').SectionList);
  await act(async () => { list.props.onEndReached?.(); await Promise.resolve(); await Promise.resolve(); });
  // Two sections now present => next surah appended.
  const updated = tree!.root.findByType(require('react-native').SectionList);
  expect(updated.props.sections.length).toBeGreaterThanOrEqual(2);
  act(() => tree!.unmount());
});
```
- [ ] **Step 2 — run, expect FAIL:** `npm test -- __tests__/foundations/SurahReaderScreen.smoke.test.tsx` (`onEndReached` is a no-op; only 1 section).
- [ ] **Step 3 — implement:** add append + prefetch + initial-scroll wiring. Use React Query's client for the background prefetch so appended surahs share the cache. Add `import { useQueryClient } from '@tanstack/react-query';` and `const queryClient = useQueryClient();`.

Helper to fetch (offline-first, cached) a surah's reader data via the same query key:
```tsx
const fetchReader = useCallback(
  (n: number) =>
    queryClient.fetchQuery({
      queryKey: ['quran', 'reader', n, OFFLINE_QURAN_VERSION],
      queryFn: () => loadSurahReaderDataOfflineFirst(n),
      staleTime: 1000 * 60 * 60 * 6,
    }),
  [queryClient],
);
```

Background prefetch of the next surah as soon as the current highest surah is ready:
```tsx
const prefetchNext = useCallback(
  (afterSurah: number) => {
    const n = nextSurahNumber(afterSurah);
    if (n == null || loadedRef.current.has(n)) return;
    void queryClient.prefetchQuery({
      queryKey: ['quran', 'reader', n, OFFLINE_QURAN_VERSION],
      queryFn: () => loadSurahReaderDataOfflineFirst(n),
      staleTime: 1000 * 60 * 60 * 6,
    });
  },
  [queryClient],
);

useEffect(() => {
  if (data?.surah) prefetchNext(data.surah.number);
}, [data, prefetchNext]);
```
> Add `import { nextSurahNumber, shouldAppendNext } from '../../services/quran/continuousReading';` (merge with the Task 6 import).

The guarded append handler:
```tsx
const appendNext = useCallback(async () => {
  const maxLoaded = Math.max(...loadedRef.current, 0);
  const nextN = shouldAppendNext(loadedRef.current, maxLoaded, appendingRef.current);
  if (nextN == null) return;
  appendingRef.current = true;
  try {
    const next = await fetchReader(nextN);
    if (!next?.surah || loadedRef.current.has(next.surah.number)) return;
    loadedRef.current.add(next.surah.number);
    setSections(prev => [...prev, buildSection(next)]);
    prefetchNext(next.surah.number); // look one further ahead
  } catch {
    // No spinner and no error UI for appended surahs — silently stop; user can scroll again.
  } finally {
    appendingRef.current = false;
  }
}, [fetchReader, prefetchNext]);
```

Wire it on the `SectionList` (add these props to the element from Task 6):
```tsx
onEndReached={() => { void appendNext(); }}
onEndReachedThreshold={0.6}
```

Initial scroll to the opened ayah in section 0 via `scrollToLocation`, guarded + recoverable:
```tsx
const scrollToOpenedAyah = useCallback(() => {
  if (scrolledRef.current || sections.length === 0) return;
  const first = sections[0];
  if (first.surah.number !== surahNumber) return;
  const itemIndex = first.data.findIndex(a => a.numberInSurah === ayahNumber);
  if (itemIndex < 0) return;
  scrolledRef.current = true;
  requestAnimationFrame(() => {
    listRef.current?.scrollToLocation({
      sectionIndex: 0,
      itemIndex,
      viewPosition: 0.15,
      animated: false,
    });
  });
}, [ayahNumber, sections, surahNumber]);
```
Add these props to the `SectionList`:
```tsx
onContentSizeChange={() => scrollToOpenedAyah()}
onScrollToIndexFailed={info => {
  scrolledRef.current = false;
  setTimeout(() => {
    listRef.current?.scrollToLocation({
      sectionIndex: 0,
      itemIndex: info.index,
      viewPosition: 0.15,
      animated: false,
    });
  }, 300);
}}
```
> Note: SectionList's `scrollToLocation` uses `itemIndex` where `0` is the section header; if the header offsets the index at runtime, use `itemIndex: itemIndex + 1`. Verify on device; the retry handler covers transient failures. Keep the existing playback scroll-sync effect but target `scrollToLocation` against the section whose `surah.number === audioCurrentSurahNumber` (find its `sectionIndex` in `sections`) instead of the old FlatList `scrollToIndex`.

Playback scroll-sync rewrite (replaces the old FlatList effect):
```tsx
useEffect(() => {
  if (!audioCurrentSurahNumber || !audioCurrentAyahNumber) return;
  const sectionIndex = sections.findIndex(s => s.surah.number === audioCurrentSurahNumber);
  if (sectionIndex < 0) return;
  const itemIndex = sections[sectionIndex].data.findIndex(
    a => a.numberInSurah === audioCurrentAyahNumber,
  );
  if (itemIndex < 0) return;
  requestAnimationFrame(() => {
    listRef.current?.scrollToLocation({
      sectionIndex,
      itemIndex,
      viewPosition: 0.2,
      animated: true,
    });
  });
}, [audioCurrentAyahNumber, audioCurrentSurahNumber, sections]);
```
- [ ] **Step 4 — run, expect PASS:** `npm test -- __tests__/foundations/SurahReaderScreen.smoke.test.tsx` (append test now sees ≥2 sections) and `npm test` (full suite green).
- [ ] **Step 5 — commit:** `git add -A && git commit -m "feat(quran): seamless auto-append + background prefetch + scrollToLocation initial/playback scroll" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

### Task 10: Full-suite + type-check verification

**Files:** none (verification only).

- [ ] **Step 1 — run the entire test suite:** `npm test` — expect all green (new: `continuousReading`, `continuousReadingAppend`, `topVisibleSurah`, `SurahTransition`, `StickySurahBar`, `continuousLastRead`, updated `SurahReaderScreen.smoke`; unchanged: all prior foundations tests).
- [ ] **Step 2 — type-check + lint:** `npx tsc --noEmit` and `npm run lint` — expect no new errors in the touched files.
- [ ] **Step 3 — manual reasoning checklist (cite in commit body):** open surah 1 → scroll to end → surah 2 appears with animated header + Al-Fatiha completion footer → scroll back to surah 1 still mounted → sticky bar name flips 1↔2 on scroll → audio highlight + play works in an appended surah → pinch-zoom scales all sections → last-read persists surah 2 after crossing → reopening restores surah+ayah.
- [ ] **Step 4 — commit (if any lint/type fixups were needed):** `git add -A && git commit -m "chore(quran): verify continuous reading suite + types + lint" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

## Critical Files for Implementation
- /Users/farukhchenda/Desktop/farukh-modules/Apps/Sazda/src/screens/quran/SurahReaderScreen.tsx
- /Users/farukhchenda/Desktop/farukh-modules/Apps/Sazda/src/services/quran/continuousReading.ts (new)
- /Users/farukhchenda/Desktop/farukh-modules/Apps/Sazda/src/screens/quran/components/SurahTransition.tsx (new)
- /Users/farukhchenda/Desktop/farukh-modules/Apps/Sazda/src/screens/quran/components/StickySurahBar.tsx (new)
- /Users/farukhchenda/Desktop/farukh-modules/Apps/Sazda/__tests__/foundations/SurahReaderScreen.smoke.test.tsx
