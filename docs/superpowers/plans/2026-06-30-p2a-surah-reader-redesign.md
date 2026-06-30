# P2a — Surah Reader Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement task-by-task. Steps use checkbox (`- [ ]`) syntax. Each task: failing test → run (cite expected fail) → implement → run (expected pass) → commit with the `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` trailer.

**Goal:** Redesign the Surah reader screen (`src/screens/quran/SurahReaderScreen.tsx`) to a "god-level premium, calm, alive" standard — spacious ayah blocks in the Uthmani (Amiri Quran) face, unified reading-theme palettes, a soft ambient backdrop, a breathing highlight on the currently-playing ayah, a per-ayah action bar (Play · Tafsir · Bookmark · Share), and a Bismillah reveal at the surah head — while preserving every existing behavior (offline-first load, pinch-to-zoom, audio sheet, last-read tracking, tafsir navigation, bookmarks, translation toggle, settings modal).

**Architecture:** Decompose the 744-line monolith into pure helpers (unit-tested first) plus focused presentational components. Pure logic — Bismillah eligibility, active-ayah matching, share-text building, font-scale clamping — lives in dependency-free modules with full unit coverage. Thin React components (`AyahBlock`, `AyahActionBar`, `ShareVerseCard`) compose existing atoms (`AmbientBackdrop`, `BismillahReveal`, `BreathingView`, `PressableScale`, `AnimatedBookmark`) and read colors exclusively from `getReadingTheme`. The screen orchestrates data (unchanged `useQuery` + `loadSurahReaderDataOfflineFirst`), audio (`quranAudioStore`), and progress (`quranProgressStore`). A reader-theme adapter maps `surahReaderTheme` to the canonical `ReadingThemePalette`. Two pre-existing TypeScript errors are fixed as part of the rework.

**Tech Stack:** React Native, TypeScript, react-native-reanimated 4.2.2 (mocked in jest), react-native-svg + lottie-react-native (mocked), zustand + MMKV, @tanstack/react-query, React Native's built-in `Share`, Jest + react-test-renderer. No new native dependencies.

**Verified dependencies (exist in repo):** `src/components/atoms/BreathingView/BreathingView.tsx` (props: `style`, `minOpacity`, `maxScale`, `durationMs`), `src/components/atoms/PressableScale/PressableScale.tsx` (extends PressableProps + `style`, `to`, `pressedOpacity`), `src/components/atoms/AnimatedBookmark/AnimatedBookmark.tsx` (props: `filled`, `onPress`, `size`, `color`, `fillColor`), hooks `useReduceMotion` + `usePressScale` (from `src/hooks`), `AyahReaderRow = { numberInSurah; arabic; translation?; audioUrl? }`, P0 atoms `AmbientBackdrop`/`BismillahReveal`, tokens `getReadingTheme`/`typography.quranVerse`/`getAmbientGradient`.

**Existing features preserved:** offline-first load (Task 9), pinch-zoom (Task 2 clamp + Task 9 gesture verbatim), zoom toast (Task 9), audio sheet `ReaderAudioPlayerSheet` (Task 9), last-read/recents/engagement (Task 9), initial + playback scroll-sync (Task 9), tafsir nav (Tasks 5+9), bookmarks (Tasks 5+9), translation toggle (Tasks 6+9), settings modal (Task 8).

**Deferred (do NOT build here):** reciter picker & multi-translation switching (P1 editions catalog); image-based verse share (needs `react-native-view-shot` + native rebuild); unified Surah/Mushaf bookmark store (P1).

---

### Task 1: Reader-theme adapter

**Files:** Create `src/services/quran/readerTheme.ts`; Test `__tests__/foundations/readerTheme.test.ts`.

- [ ] **Step 1 — failing test** `__tests__/foundations/readerTheme.test.ts`:
```ts
import { getReaderPalette } from '../../src/services/quran/readerTheme';
import { getReadingTheme } from '../../src/theme/readingThemes';

describe('getReaderPalette', () => {
  it('maps each reader theme to the canonical reading palette', () => {
    for (const t of ['light', 'sepia', 'dark'] as const) {
      expect(getReaderPalette(t)).toEqual(getReadingTheme(t));
    }
  });
  it('falls back to light for an undefined / unknown theme', () => {
    // @ts-expect-error runtime fallback
    expect(getReaderPalette(undefined)).toEqual(getReadingTheme('light'));
    // @ts-expect-error runtime fallback
    expect(getReaderPalette('nope')).toEqual(getReadingTheme('light'));
  });
});
```
- [ ] **Step 2 — run, expect FAIL** (module not found): `npm test -- __tests__/foundations/readerTheme.test.ts`
- [ ] **Step 3 — implement** `src/services/quran/readerTheme.ts`:
```ts
import type { MushafTheme } from '../mushaf/mushafTheme';
import {
  getReadingTheme,
  type ReadingTheme,
  type ReadingThemePalette,
} from '../../theme/readingThemes';

const VALID: ReadingTheme[] = ['light', 'sepia', 'dark'];

/**
 * Maps the reader's persisted theme (`surahReaderTheme`, a MushafTheme) to the canonical
 * reading palette shared by Surah reader / Mushaf / Tafsir. Total + safe.
 */
export function getReaderPalette(theme: MushafTheme | undefined): ReadingThemePalette {
  const t = (theme && VALID.includes(theme as ReadingTheme) ? theme : 'light') as ReadingTheme;
  return getReadingTheme(t);
}
```
- [ ] **Step 4 — run, expect PASS.**
- [ ] **Step 5 — commit:** `git add -A && git commit -m "feat(quran): reader-theme adapter mapping to canonical reading palette" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

### Task 2: Pure helpers — Bismillah eligibility & font-scale clamp

**Files:** Create `src/services/quran/readerLogic.ts`; Test `__tests__/foundations/readerLogic.test.ts`.

- [ ] **Step 1 — failing test** `__tests__/foundations/readerLogic.test.ts`:
```ts
import { shouldShowBismillah, clampFontScale } from '../../src/services/quran/readerLogic';

describe('shouldShowBismillah', () => {
  it('is false for At-Tawbah (9) and Al-Fatiha (1)', () => {
    expect(shouldShowBismillah(9)).toBe(false);
    expect(shouldShowBismillah(1)).toBe(false);
  });
  it('is true for ordinary surahs', () => {
    expect(shouldShowBismillah(2)).toBe(true);
    expect(shouldShowBismillah(114)).toBe(true);
  });
});

describe('clampFontScale', () => {
  it('clamps into [0.85, 1.6]', () => {
    expect(clampFontScale(0.5)).toBeCloseTo(0.85);
    expect(clampFontScale(2)).toBeCloseTo(1.6);
    expect(clampFontScale(1.1)).toBeCloseTo(1.1);
  });
});
```
- [ ] **Step 2 — run, expect FAIL.**
- [ ] **Step 3 — implement** `src/services/quran/readerLogic.ts`:
```ts
/** Standalone Bismillah is shown for all surahs except 9 (no Basmala) and 1 (Basmala is ayah 1). */
export function shouldShowBismillah(surahNumber: number): boolean {
  return surahNumber !== 9 && surahNumber !== 1;
}

export const MIN_FONT_SCALE = 0.85;
export const MAX_FONT_SCALE = 1.6;

/** Clamp the reader font-scale multiplier into the supported range. */
export function clampFontScale(n: number): number {
  return Math.min(MAX_FONT_SCALE, Math.max(MIN_FONT_SCALE, n));
}
```
- [ ] **Step 4 — run, expect PASS.**
- [ ] **Step 5 — commit:** `git add -A && git commit -m "feat(quran): pure reader helpers (bismillah eligibility, font-scale clamp)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

### Task 3: Pure helpers — active-ayah matching & share-text builder

**Files:** Append to `src/services/quran/readerLogic.ts`; Test `__tests__/foundations/readerShare.test.ts`.

- [ ] **Step 1 — failing test** `__tests__/foundations/readerShare.test.ts`:
```ts
import { isActiveAyah, buildShareText } from '../../src/services/quran/readerLogic';

describe('isActiveAyah', () => {
  it('matches only when both surah and ayah equal the playing pair', () => {
    expect(isActiveAyah(2, 5, 2, 5)).toBe(true);
    expect(isActiveAyah(2, 5, 2, 6)).toBe(false);
    expect(isActiveAyah(2, 5, 3, 5)).toBe(false);
    expect(isActiveAyah(2, 5, null, null)).toBe(false);
  });
});

describe('buildShareText', () => {
  it('includes arabic, translation, and a reference line', () => {
    const txt = buildShareText({
      arabic: 'ARABIC', translation: 'In the name of God',
      surahEnglishName: 'Al-Baqarah', surahNumber: 2, ayahNumber: 255,
    });
    expect(txt).toContain('ARABIC');
    expect(txt).toContain('In the name of God');
    expect(txt).toContain('Al-Baqarah 2:255');
  });
  it('omits the translation block when none is provided', () => {
    const txt = buildShareText({
      arabic: 'ARABIC', surahEnglishName: 'Al-Ikhlas', surahNumber: 112, ayahNumber: 1,
    });
    expect(txt).toContain('ARABIC');
    expect(txt).toContain('Al-Ikhlas 112:1');
    expect(txt).not.toMatch(/undefined/);
  });
});
```
- [ ] **Step 2 — run, expect FAIL.**
- [ ] **Step 3 — append** to `src/services/quran/readerLogic.ts`:
```ts
/** True when the given surah/ayah is the one currently loaded in the audio store. */
export function isActiveAyah(
  surahNumber: number,
  ayahNumber: number,
  currentSurahNumber: number | null,
  currentAyahNumber: number | null,
): boolean {
  return currentSurahNumber === surahNumber && currentAyahNumber === ayahNumber;
}

export type ShareVerseInput = {
  arabic: string;
  translation?: string;
  surahEnglishName: string;
  surahNumber: number;
  ayahNumber: number;
};

/** Plain-text share payload for an ayah: Arabic, optional translation, then a reference line. */
export function buildShareText(v: ShareVerseInput): string {
  const ref = `— Surah ${v.surahEnglishName} ${v.surahNumber}:${v.ayahNumber}`;
  const parts = [v.arabic.trim()];
  if (v.translation && v.translation.trim().length > 0) {
    parts.push(`\n${v.translation.trim()}`);
  }
  parts.push(`\n${ref}`);
  return parts.join('\n');
}
```
- [ ] **Step 4 — run, expect PASS.**
- [ ] **Step 5 — commit:** `git add -A && git commit -m "feat(quran): active-ayah matcher and share-text builder" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

### Task 4: `ShareVerseCard` component

**Files:** Create `src/components/atoms/ShareVerseCard/ShareVerseCard.tsx`; Test `__tests__/foundations/ShareVerseCard.test.tsx`.

- [ ] **Step 1 — failing test** `__tests__/foundations/ShareVerseCard.test.tsx`:
```tsx
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { ShareVerseCard } from '../../src/components/atoms/ShareVerseCard/ShareVerseCard';
import { getReadingTheme } from '../../src/theme/readingThemes';

describe('ShareVerseCard', () => {
  it('renders with and without a translation', () => {
    for (const translation of ['In the name of God', undefined]) {
      let tree: renderer.ReactTestRenderer;
      act(() => {
        tree = renderer.create(
          <ShareVerseCard palette={getReadingTheme('light')} arabic="ARABIC"
            translation={translation} surahEnglishName="Al-Baqarah" surahNumber={2} ayahNumber={255} />,
        );
      });
      expect(tree!.toJSON()).toBeTruthy();
      act(() => tree!.unmount());
    }
  });
});
```
- [ ] **Step 2 — run, expect FAIL.**
- [ ] **Step 3 — implement** `src/components/atoms/ShareVerseCard/ShareVerseCard.tsx`:
```tsx
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { typography } from '../../../theme/typography';
import { spacing } from '../../../theme/spacing';
import { radius } from '../../../theme/radius';
import type { ReadingThemePalette } from '../../../theme/readingThemes';

type Props = {
  palette: ReadingThemePalette;
  arabic: string;
  translation?: string;
  surahEnglishName: string;
  surahNumber: number;
  ayahNumber: number;
};

/**
 * Sazda-styled verse card used in the share preview. Text share goes out via RN's built-in
 * Share. FOLLOW-UP (deferred): image-capture share needs `react-native-view-shot` + a native
 * rebuild — capture this view by ref and share the PNG. Not in this plan.
 */
export const ShareVerseCard = memo(function ShareVerseCard({
  palette: p, arabic, translation, surahEnglishName, surahNumber, ayahNumber,
}: Props) {
  return (
    <View style={[styles.card, { backgroundColor: p.surface, borderColor: p.divider }]}>
      <Text allowFontScaling={false} style={[styles.arabic, { color: p.text }]} accessibilityLabel="Verse Arabic">
        {arabic}
      </Text>
      {translation ? (
        <Text style={[styles.translation, { color: p.textMuted }]}>{translation}</Text>
      ) : null}
      <Text style={[styles.reference, { color: p.accent }]}>
        Surah {surahEnglishName} • {surahNumber}:{ayahNumber}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, padding: spacing.xl, gap: spacing.md },
  arabic: { ...typography.quranVerse, textAlign: 'right', writingDirection: 'rtl' },
  translation: { ...typography.bodyMedium, lineHeight: 24 },
  reference: { ...typography.label, textAlign: 'right' },
});
```
- [ ] **Step 4 — run, expect PASS.**
- [ ] **Step 5 — commit:** `git add -A && git commit -m "feat(quran): ShareVerseCard for the verse share preview" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

### Task 5: `AyahActionBar` component (Play · Tafsir · Bookmark · Share)

**Files:** Create `src/screens/quran/components/AyahActionBar.tsx`; Test `__tests__/foundations/AyahActionBar.test.tsx`.

- [ ] **Step 1 — failing test** `__tests__/foundations/AyahActionBar.test.tsx`:
```tsx
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { AyahActionBar } from '../../src/screens/quran/components/AyahActionBar';
import { getReadingTheme } from '../../src/theme/readingThemes';

const base = {
  palette: getReadingTheme('light'), bookmarked: false,
  audio: { isActive: false, isPlaying: false, isLoading: false, hasAudio: true },
  onPlay: jest.fn(), onTafsir: jest.fn(), onToggleBookmark: jest.fn(), onShare: jest.fn(),
};

describe('AyahActionBar', () => {
  it('renders in idle, playing, loading, and no-audio states', () => {
    const variants = [
      base,
      { ...base, audio: { ...base.audio, isActive: true, isPlaying: true } },
      { ...base, audio: { ...base.audio, isActive: true, isLoading: true } },
      { ...base, audio: { ...base.audio, hasAudio: false } },
    ];
    for (const props of variants) {
      let tree: renderer.ReactTestRenderer;
      act(() => { tree = renderer.create(<AyahActionBar {...props} />); });
      expect(tree!.toJSON()).toBeTruthy();
      act(() => tree!.unmount());
    }
  });
});
```
- [ ] **Step 2 — run, expect FAIL.**
- [ ] **Step 3 — implement** `src/screens/quran/components/AyahActionBar.tsx`:
```tsx
import { memo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { BookOpen, Pause, Play, Share2 } from 'lucide-react-native';
import { PressableScale } from '../../../components/atoms/PressableScale/PressableScale';
import { AnimatedBookmark } from '../../../components/atoms/AnimatedBookmark/AnimatedBookmark';
import { spacing } from '../../../theme/spacing';
import { radius } from '../../../theme/radius';
import { hapticSelection } from '../../../utils/appHaptics';
import type { ReadingThemePalette } from '../../../theme/readingThemes';

type AudioState = { isActive: boolean; isPlaying: boolean; isLoading: boolean; hasAudio: boolean };

type Props = {
  palette: ReadingThemePalette;
  bookmarked: boolean;
  audio: AudioState;
  iconSize?: number;
  onPlay: () => void;
  onTafsir: () => void;
  onToggleBookmark: () => void;
  onShare: () => void;
};

/** Per-ayah action bar revealed on tap: Play · Tafsir · Bookmark · Share. */
export const AyahActionBar = memo(function AyahActionBar({
  palette: p, bookmarked, audio, iconSize = 20, onPlay, onTafsir, onToggleBookmark, onShare,
}: Props) {
  const tap = (fn: () => void) => () => { hapticSelection(); fn(); };
  return (
    <View style={[styles.bar, { backgroundColor: p.ayahHighlight, borderColor: p.divider }]} accessibilityRole="toolbar">
      <PressableScale onPress={tap(onPlay)} disabled={!audio.hasAudio} style={styles.btn} accessibilityLabel="Play recitation">
        {audio.isActive && audio.isLoading ? (
          <ActivityIndicator size="small" color={p.accent} />
        ) : audio.isActive && audio.isPlaying ? (
          <Pause size={iconSize} color={p.accent} strokeWidth={2.3} />
        ) : (
          <Play size={iconSize} color={audio.hasAudio ? p.accent : p.textMuted} strokeWidth={2.3} />
        )}
      </PressableScale>
      <PressableScale onPress={tap(onTafsir)} style={styles.btn} accessibilityLabel="Tafsir">
        <BookOpen size={iconSize} color={p.text} strokeWidth={2} />
      </PressableScale>
      <PressableScale onPress={tap(onToggleBookmark)} style={styles.btn} accessibilityLabel="Bookmark">
        <AnimatedBookmark filled={bookmarked} onPress={tap(onToggleBookmark)} size={iconSize} color={p.textMuted} fillColor={p.accent} />
      </PressableScale>
      <PressableScale onPress={tap(onShare)} style={styles.btn} accessibilityLabel="Share verse">
        <Share2 size={iconSize} color={p.text} strokeWidth={2} />
      </PressableScale>
    </View>
  );
});

const styles = StyleSheet.create({
  bar: {
    marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth, alignSelf: 'flex-start',
  },
  btn: { minWidth: 40, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
});
```
Note: verify `AnimatedBookmark` prop names against its source before implementing (confirmed: `filled`, `onPress`, `size`, `color`, `fillColor`).
- [ ] **Step 4 — run, expect PASS.**
- [ ] **Step 5 — commit:** `git add -A && git commit -m "feat(quran): per-ayah AyahActionBar (play/tafsir/bookmark/share)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

### Task 6: `AyahBlock` component

**Files:** Create `src/screens/quran/components/AyahBlock.tsx`; Test `__tests__/foundations/AyahBlock.test.tsx`.

- [ ] **Step 1 — failing test** `__tests__/foundations/AyahBlock.test.tsx`:
```tsx
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { AyahBlock } from '../../src/screens/quran/components/AyahBlock';
import { getReadingTheme } from '../../src/theme/readingThemes';

const liveScale = { value: 1 } as any;
const base = {
  item: { numberInSurah: 5, arabic: 'ARABIC', translation: 'meaning', audioUrl: 'file://x' },
  palette: getReadingTheme('light'), showTranslation: true, bookmarked: false, liveScale,
  audio: { isActive: false, isPlaying: false, isLoading: false, hasAudio: true },
  onPlay: jest.fn(), onTafsir: jest.fn(), onToggleBookmark: jest.fn(), onShare: jest.fn(),
};

describe('AyahBlock', () => {
  it('renders idle, active (breathing), and translation-hidden states', () => {
    const variants = [
      base,
      { ...base, audio: { ...base.audio, isActive: true, isPlaying: true } },
      { ...base, showTranslation: false },
      { ...base, item: { ...base.item, audioUrl: null, translation: undefined } },
    ];
    for (const props of variants) {
      let tree: renderer.ReactTestRenderer;
      act(() => { tree = renderer.create(<AyahBlock {...props} />); });
      expect(tree!.toJSON()).toBeTruthy();
      act(() => tree!.unmount());
    }
  });
});
```
- [ ] **Step 2 — run, expect FAIL.**
- [ ] **Step 3 — implement** `src/screens/quran/components/AyahBlock.tsx`:
```tsx
import { memo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { BreathingView } from '../../../components/atoms/BreathingView/BreathingView';
import { AyahActionBar } from './AyahActionBar';
import { typography } from '../../../theme/typography';
import { spacing } from '../../../theme/spacing';
import { radius } from '../../../theme/radius';
import { hapticLight } from '../../../utils/appHaptics';
import type { AyahReaderRow } from '../../../services/quranApi';
import type { ReadingThemePalette } from '../../../theme/readingThemes';

const BASE_ARABIC = typography.quranVerse.fontSize; // 26
const BASE_TRANS = 15;

type AudioState = { isActive: boolean; isPlaying: boolean; isLoading: boolean; hasAudio: boolean };

type Props = {
  item: AyahReaderRow;
  palette: ReadingThemePalette;
  showTranslation: boolean;
  bookmarked: boolean;
  liveScale: SharedValue<number>;
  audio: AudioState;
  onPlay: () => void;
  onTafsir: () => void;
  onToggleBookmark: () => void;
  onShare: () => void;
};

/** Spacious ayah block with breathing active-highlight and an expandable action bar. */
export const AyahBlock = memo(function AyahBlock({
  item, palette: p, showTranslation, bookmarked, liveScale, audio,
  onPlay, onTafsir, onToggleBookmark, onShare,
}: Props) {
  const [barOpen, setBarOpen] = useState(false);

  const arabicStyle = useAnimatedStyle(() => {
    const fs = BASE_ARABIC * liveScale.value;
    return { fontSize: fs, lineHeight: fs * 2 };
  }, [liveScale]);

  const transStyle = useAnimatedStyle(() => {
    const fs = BASE_TRANS * liveScale.value;
    return { fontSize: fs, lineHeight: fs * 1.55 };
  }, [liveScale]);

  const content = (
    <Pressable
      onPress={() => { hapticLight(); setBarOpen(o => !o); }}
      style={[styles.block, { borderBottomColor: p.divider }]}
      accessibilityRole="button" accessibilityLabel={`Ayah ${item.numberInSurah}`}>
      <View style={styles.headerRow}>
        <View style={[styles.marker, { backgroundColor: p.ayahMarkerBg, borderColor: p.ayahMarkerBorder }]}>
          <Text style={[styles.markerText, { color: p.ayahMarkerText }]}>{item.numberInSurah}</Text>
        </View>
      </View>
      <Animated.Text style={[styles.arabic, { color: p.text }, arabicStyle]} allowFontScaling={false}>
        {item.arabic}
      </Animated.Text>
      {showTranslation && item.translation ? (
        <Animated.Text style={[styles.translation, { color: p.textMuted }, transStyle]}>
          {item.translation}
        </Animated.Text>
      ) : null}
      {barOpen ? (
        <AyahActionBar palette={p} bookmarked={bookmarked} audio={audio}
          onPlay={onPlay} onTafsir={onTafsir} onToggleBookmark={onToggleBookmark} onShare={onShare} />
      ) : null}
    </Pressable>
  );

  if (audio.isActive) {
    return (
      <BreathingView style={[styles.activeWrap, { backgroundColor: p.ayahHighlight }]} minOpacity={0.92}>
        {content}
      </BreathingView>
    );
  }
  return content;
});

const styles = StyleSheet.create({
  block: { paddingVertical: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, gap: spacing.sm },
  activeWrap: { borderRadius: radius.md, paddingHorizontal: spacing.md, marginVertical: spacing.xs },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  marker: {
    minWidth: 30, height: 30, borderRadius: radius.full, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xs,
  },
  markerText: { ...typography.label, letterSpacing: 0 },
  arabic: { ...typography.quranVerse, textAlign: 'right', writingDirection: 'rtl' },
  translation: { ...typography.bodyMedium },
});
```
- [ ] **Step 4 — run, expect PASS.**
- [ ] **Step 5 — commit:** `git add -A && git commit -m "feat(quran): spacious AyahBlock with breathing active highlight + action bar" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

### Task 7: `ShareVersePreview` modal (preview + native text share)

**Files:** Create `src/screens/quran/components/ShareVersePreview.tsx`; Test `__tests__/foundations/ShareVersePreview.test.tsx`.

- [ ] **Step 1 — failing test** `__tests__/foundations/ShareVersePreview.test.tsx`:
```tsx
import React from 'react';
import { Share } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import { ShareVersePreview } from '../../src/screens/quran/components/ShareVersePreview';
import { getReadingTheme } from '../../src/theme/readingThemes';

const verse = { arabic: 'ARABIC', translation: 'meaning', surahEnglishName: 'Al-Baqarah', surahNumber: 2, ayahNumber: 255 };

describe('ShareVersePreview', () => {
  it('renders when visible and null-safe when verse is null', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<ShareVersePreview palette={getReadingTheme('light')} visible verse={verse} onClose={jest.fn()} />); });
    expect(tree!.toJSON()).toBeTruthy();
    act(() => tree!.unmount());
    act(() => { tree = renderer.create(<ShareVersePreview palette={getReadingTheme('light')} visible={false} verse={null} onClose={jest.fn()} />); });
    act(() => tree!.unmount());
  });
  it('invokes Share.share with the built text', () => {
    const spy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as any);
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<ShareVersePreview palette={getReadingTheme('light')} visible verse={verse} onClose={jest.fn()} />); });
    const btn = tree!.root.findByProps({ testID: 'share-text-btn' });
    act(() => btn.props.onPress());
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].message).toContain('Al-Baqarah 2:255');
    act(() => tree!.unmount());
    spy.mockRestore();
  });
});
```
- [ ] **Step 2 — run, expect FAIL.**
- [ ] **Step 3 — implement** `src/screens/quran/components/ShareVersePreview.tsx`:
```tsx
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
```
If `Share.share` isn't spy-able in this setup, add to `jest.setup.js`: `jest.mock('react-native/Libraries/Share/Share', () => ({ share: jest.fn(() => Promise.resolve({ action: 'sharedAction' })) }))`. Prefer the spyOn approach.
- [ ] **Step 4 — run, expect PASS.**
- [ ] **Step 5 — commit:** `git add -A && git commit -m "feat(quran): ShareVersePreview modal with native text share" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

### Task 8: `ReaderSettingsModal` — extract & restyle to reading themes

**Files:** Create `src/screens/quran/components/ReaderSettingsModal.tsx`; Test `__tests__/foundations/ReaderSettingsModal.test.tsx`.

- [ ] **Step 1 — failing test** `__tests__/foundations/ReaderSettingsModal.test.tsx`:
```tsx
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { ReaderSettingsModal } from '../../src/screens/quran/components/ReaderSettingsModal';

describe('ReaderSettingsModal', () => {
  it('renders and wires theme + size changes through clamp', () => {
    const setTheme = jest.fn(); const setScale = jest.fn();
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ReaderSettingsModal visible theme="light" fontScale={1}
          onClose={jest.fn()} onSetTheme={setTheme} onSetFontScale={setScale} />,
      );
    });
    act(() => tree!.root.findByProps({ testID: 'theme-dark' }).props.onPress());
    expect(setTheme).toHaveBeenCalledWith('dark');
    act(() => tree!.root.findByProps({ testID: 'size-inc' }).props.onPress());
    expect(setScale).toHaveBeenCalled();
    const passed = setScale.mock.calls[0][0];
    expect(passed).toBeGreaterThanOrEqual(0.85);
    expect(passed).toBeLessThanOrEqual(1.6);
    act(() => tree!.unmount());
  });
});
```
- [ ] **Step 2 — run, expect FAIL.**
- [ ] **Step 3 — implement** `src/screens/quran/components/ReaderSettingsModal.tsx`:
```tsx
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
```
- [ ] **Step 4 — run, expect PASS.**
- [ ] **Step 5 — commit:** `git add -A && git commit -m "feat(quran): extract ReaderSettingsModal styled to reading themes" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

### Task 9: Rewire `SurahReaderScreen` — compose new pieces, fix TS errors, preserve behavior

**Files:** Modify `src/screens/quran/SurahReaderScreen.tsx`; Test `__tests__/foundations/SurahReaderScreen.smoke.test.tsx`.

This is the integration task. The implementer MUST first read the current `SurahReaderScreen.tsx` in full, then apply the changes below while preserving verbatim: the `useQuery` block, all `useEffect`s (`touchRecentSurah`/`setLastRead`/scroll-reset/cleanup), `scheduleLastRead` + `scheduleRef` + `onViewableItemsChanged` debounce, `scrollToAyah`/`tryInitialScroll`/`onScrollToIndexFailed`, the scroll-sync-to-active-ayah effect, the `pinch` gesture + shared values, the zoom toast, `playAyah` queue build, and `<ReaderAudioPlayerSheet/>`.

- [ ] **Step 1 — failing/characterization smoke test** `__tests__/foundations/SurahReaderScreen.smoke.test.tsx`:
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
jest.mock('../../src/services/offlineQuran/reader', () => ({
  loadSurahReaderDataOfflineFirst: jest.fn(async () => ({
    surah: { number: 2, name: 'البقرة', englishName: 'Al-Baqarah', englishNameTranslation: 'The Cow', numberOfAyahs: 2, revelationType: 'Medinan' },
    ayahs: [
      { numberInSurah: 1, arabic: 'A1', translation: 't1', audioUrl: 'file://a1' },
      { numberInSurah: 2, arabic: 'A2', translation: 't2', audioUrl: 'file://a2' },
    ],
  })),
}));

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SurahReaderScreen } from '../../src/screens/quran/SurahReaderScreen';

describe('SurahReaderScreen (smoke)', () => {
  it('mounts without crashing', () => {
    const qc = new QueryClient();
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<QueryClientProvider client={qc}><SurahReaderScreen /></QueryClientProvider>);
    });
    expect(tree!.toJSON()).toBeTruthy();
    act(() => tree!.unmount());
  });
});
```
Adjust the navigation/route/safe-area mock specifics if the screen imports them differently (read the screen's imports first). If the screen already imports `SurahReaderScreen` as a default export, adjust the import accordingly.
- [ ] **Step 2 — run, observe** (`npm test -- __tests__/foundations/SurahReaderScreen.smoke.test.tsx`). It may already mount or may fail on the current `getSurahReaderColors`/`Animated.SharedValue` code; either way it must PASS after Step 3.
- [ ] **Step 3 — apply the rewrite** to `src/screens/quran/SurahReaderScreen.tsx`:
  1. **Imports:** remove `getSurahReaderColors`/`SurahReaderColors`; add `import { type SharedValue } from 'react-native-reanimated'`, `AmbientBackdrop`, `BismillahReveal`, `AyahBlock`, `ReaderSettingsModal`, `ShareVersePreview`, `getReaderPalette`, `{ shouldShowBismillah, isActiveAyah, type ShareVerseInput }`, `useAmbientEnabled`, `useReduceMotion`. Keep existing reanimated value imports.
  2. **Delete** inline `SurahReaderAyahRow`, `createReaderStyles`, `ReaderStyles`, `AyahRowProps`, `SurahReaderColors` usages. Add:
     ```ts
     const palette = useMemo(() => getReaderPalette(surahReaderTheme), [surahReaderTheme]);
     const ambientEnabled = useAmbientEnabled();
     const reduceMotion = useReduceMotion();
     const scheme = surahReaderTheme === 'dark' ? 'dark' : 'light';
     const [verseToShare, setVerseToShare] = useState<ShareVerseInput | null>(null);
     ```
     Build screen styles from `palette` (borders → `palette.divider`, surface → `palette.surface`/`palette.background`). No hex literals.
  3. **renderAyah** → render `AyahBlock` passing `liveScale` (typed `SharedValue<number>`), `palette`, `audio` via `isActiveAyah(surahNumber, item.numberInSurah, audioCurrentSurahNumber, audioCurrentAyahNumber)` combined with the store's `isPlaying`/`isLoading`/`!!item.audioUrl`, plus:
     ```ts
     onPlay={() => playAyah(item)}
     onTafsir={() => navigation.navigate('Tafsir', { surahNumber, ayahNumber: item.numberInSurah })}
     onToggleBookmark={/* existing toggle */}
     onShare={() => setVerseToShare({ arabic: item.arabic, translation: item.translation, surahEnglishName: data!.surah.englishName, surahNumber, ayahNumber: item.numberInSurah })}
     ```
     `audio` shape: `{ isActive, isPlaying: isActive && storeIsPlaying, isLoading: isActive && storeIsLoading, hasAudio: !!item.audioUrl }`.
  4. **FlatList:** remove the DUPLICATE `contentContainerStyle` prop (keep one). Add:
     ```tsx
     ListHeaderComponent={data && shouldShowBismillah(surahNumber)
       ? <BismillahReveal reduceMotion={reduceMotion} color={palette.accent} /> : null}
     ```
  5. **AmbientBackdrop** as first child of the list wrapper (absolute-fill, before the GestureDetector): `<AmbientBackdrop scheme={scheme} ambientEnabled={ambientEnabled} />`.
  6. **Settings:** replace the inline settings `Modal` with `<ReaderSettingsModal visible={settingsOpen} theme={surahReaderTheme} fontScale={surahReaderFontScale} onClose={() => setSettingsOpen(false)} onSetTheme={setSurahReaderTheme} onSetFontScale={setSurahReaderFontScale} />`.
  7. **Share preview:** render `<ShareVersePreview palette={palette} visible={verseToShare !== null} verse={verseToShare} onClose={() => setVerseToShare(null)} />`.
  8. `StatusBar` barStyle from `scheme`; zoom toast pill background → `palette.accent`.
  **Fix TS errors:** (a) replace `Animated.SharedValue<number>` with the imported `SharedValue<number>`; (b) remove the duplicate `contentContainerStyle` JSX attribute on `FlatList`.
- [ ] **Step 4 — verify:** `npm test -- __tests__/foundations/SurahReaderScreen.smoke.test.tsx` (PASS); `npx tsc --noEmit` (the two SurahReaderScreen errors gone, no new errors in this file); `npm test` (full suite green).
- [ ] **Step 5 — commit:** `git add -A && git commit -m "feat(quran): redesign SurahReaderScreen (reading themes, ambient, breathing, action bar, share) and fix TS errors" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

### Task 10: Cleanup & final verification

- [ ] **Step 1:** `grep -rn "getSurahReaderColors\|surahReaderAppearance" src/` — record remaining consumers. If orphaned, flag a follow-up (do not delete in this scope).
- [ ] **Step 2:** `npx tsc --noEmit` — no new P2a errors (pre-existing non-reader errors on the branch are out of scope).
- [ ] **Step 3:** `npm test` — all green.
- [ ] **Step 4:** Commit any residual cleanup with the Co-Authored-By trailer.

---

## Decisions & risks
- `SharedValue` is exported from the reanimated package root (4.2.2); the bug was namespace access `Animated.SharedValue`. Fix via `import type { SharedValue }`.
- `contentContainerStyle` set twice on the FlatList (identical) → keep one.
- `surahReaderTheme` runtime values are exactly `light|sepia|dark` = `ReadingTheme`; adapter bridges with a safe fallback, no store migration.
- Breathing highlight wraps the block (opacity-only, `minOpacity` near 1, self-disables under reduce-motion); pinch-zoom preserved via `Animated.Text` reading `liveScale.value`.
- Text share uses built-in `Share`; image share deferred (needs `react-native-view-shot`).
- `surahReaderAppearance.ts` not deleted in scope; Task 10 greps for consumers.
- Bismillah suppressed for surah 1 (Basmala is ayah 1) and surah 9 (none).
