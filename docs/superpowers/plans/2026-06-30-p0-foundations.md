# P0 — Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared primitive layer (design tokens, motion/ambient infrastructure, and reusable visual components) that every later phase of the Sazda redesign depends on.

**Architecture:** Pure, dependency-free units first (token modules + pure helper functions, fully unit-tested via TDD), then thin React components that compose them. Motion respects an app-level ambient toggle merged with OS reduce-motion. Every animation has a Reanimated path and a reduce-motion fallback. No screen or data-layer changes happen in P0.

**Tech Stack:** React Native 0.84, TypeScript, react-native-reanimated (mocked in jest), react-native-svg, lottie-react-native, zustand + AsyncStorage, Jest + react-test-renderer.

**Scope note / deferrals:** The master spec (§7) lists `AudioPlayer` shell, `EditionPickerSheet`, and `ReaderSettingsSheet` under foundations. Those are intentionally deferred — the AudioPlayer shell to **P2** (built with the audio engine) and the picker/settings sheets to **P1/P2** (built with the editions catalog + reading-preferences store they render). P0 delivers tokens + motion/ambient infra + `ProgressRing`, `AmbientBackdrop`, `BismillahReveal`, `GoldBloom`, and the Uthmani font.

**Conventions to follow (existing codebase):**
- Tokens: named exports, `as const`, JSDoc, no hex literals leaking into components (components read tokens).
- Theme tokens are exported through `src/theme/index.ts`.
- Tests live in `__tests__/` at repo root (matches `__tests__/prayerTimesCache.test.ts`). Run with `npm test`.

---

### Task 1: Test infrastructure — extend mocks for reanimated, svg, lottie

The existing reanimated jest mock (`jest.setup.js`) provides `Easing: {}` and lacks `useReducedMotion`, `withRepeat`, `interpolate`, etc. `src/theme/motion.ts` evaluates `Easing.out(Easing.cubic)` at module load, so any test importing the theme will crash until the mock provides a functional `Easing`. We also add mocks for `react-native-svg` and `lottie-react-native` so component render tests are deterministic.

**Files:**
- Modify: `jest.setup.js`
- Test: `__tests__/foundations/themeLoads.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/foundations/themeLoads.test.ts`:

```ts
import { motionDurations, motionEasing, springs } from '../../src/theme/motion';

describe('theme motion tokens load under jest', () => {
  it('exposes durations, easing functions, and spring presets', () => {
    expect(motionDurations.base).toBeGreaterThan(0);
    // motionEasing values are produced by Easing.* at module load — they must exist.
    expect(typeof motionEasing.standardOut).toBe('function');
    expect(typeof motionEasing.inOutSine).toBe('function');
    expect(springs.press.stiffness).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/foundations/themeLoads.test.ts`
Expected: FAIL — `TypeError: Easing.out is not a function` (mock `Easing` is `{}`).

- [ ] **Step 3: Replace the reanimated mock and add svg + lottie mocks**

In `jest.setup.js`, replace the existing `jest.mock('react-native-reanimated', ...)` block with:

```js
global.__reanimatedWorkletInit = () => {};

jest.mock('react-native-reanimated', () => {
  const { View, Text, ScrollView } = require('react-native');
  const createAnimatedComponent = c => c;
  const identityEasing = () => 0;
  const chain = () => identityEasing;
  const Easing = {
    linear: identityEasing,
    ease: identityEasing,
    quad: identityEasing,
    cubic: identityEasing,
    sin: identityEasing,
    exp: identityEasing,
    bezier: () => identityEasing,
    in: chain,
    out: chain,
    inOut: chain,
  };
  return {
    __esModule: true,
    default: { createAnimatedComponent, View, Text, ScrollView },
    View,
    Text,
    ScrollView,
    createAnimatedComponent,
    useSharedValue: v => ({ value: v }),
    useAnimatedStyle: () => ({}),
    useAnimatedProps: () => ({}),
    useDerivedValue: fn => ({ value: typeof fn === 'function' ? fn() : fn }),
    useReducedMotion: () => false,
    withTiming: v => v,
    withSpring: v => v,
    withDelay: (_d, v) => v,
    withRepeat: v => v,
    withSequence: (...vals) => vals[vals.length - 1],
    cancelAnimation: () => {},
    interpolate: (_v, _in, out) => (Array.isArray(out) ? out[0] : 0),
    runOnJS: fn => fn,
    Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend' },
    ReduceMotion: { System: 'system', Always: 'always', Never: 'never' },
    Easing,
    Animated: { View, Text, ScrollView, createAnimatedComponent },
  };
});

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Mock = props => React.createElement(View, props, props.children);
  return {
    __esModule: true,
    default: Mock,
    Svg: Mock,
    Circle: Mock,
    Path: Mock,
    G: Mock,
    Rect: Mock,
    Defs: Mock,
    LinearGradient: Mock,
    RadialGradient: Mock,
    Stop: Mock,
    ClipPath: Mock,
    Text: Mock,
  };
});

jest.mock('lottie-react-native', () => 'LottieView');
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/foundations/themeLoads.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full existing suite to confirm no regressions**

Run: `npm test`
Expected: PASS (existing `App.test.tsx` and `prayerTimesCache.test.ts` still pass).

- [ ] **Step 6: Commit**

```bash
git add jest.setup.js __tests__/foundations/themeLoads.test.ts
git commit -m "test: extend jest mocks for reanimated easing, svg, lottie

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Unified reading-theme tokens

Canonical light/sepia/dark reading palettes that the Surah reader, Mushaf, and Tafsir will all share (replacing the divergent `getMushafPalette` over later phases). Superset of the existing mushaf palette shape plus `ayahHighlight`.

**Files:**
- Create: `src/theme/readingThemes.ts`
- Test: `__tests__/foundations/readingThemes.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/foundations/readingThemes.test.ts`:

```ts
import { getReadingTheme, READING_THEMES } from '../../src/theme/readingThemes';

describe('reading themes', () => {
  it('exposes exactly light, sepia, dark', () => {
    expect(READING_THEMES).toEqual(['light', 'sepia', 'dark']);
  });

  it('returns a complete palette for every theme', () => {
    for (const t of READING_THEMES) {
      const p = getReadingTheme(t);
      for (const key of [
        'background', 'surface', 'text', 'textMuted', 'accent',
        'divider', 'ayahHighlight', 'ayahMarkerBg', 'ayahMarkerBorder',
        'ayahMarkerText',
      ] as const) {
        expect(typeof p[key]).toBe('string');
        expect(p[key].length).toBeGreaterThan(0);
      }
    }
  });

  it('falls back to light for an unknown theme', () => {
    // @ts-expect-error testing runtime fallback
    expect(getReadingTheme('nope')).toEqual(getReadingTheme('light'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/foundations/readingThemes.test.ts`
Expected: FAIL — cannot find module `readingThemes`.

- [ ] **Step 3: Write the implementation**

Create `src/theme/readingThemes.ts`:

```ts
/**
 * Unified reading palettes shared by the Surah reader, Mushaf, and Tafsir.
 * Single source of truth for reading-surface colors so all three modes feel identical.
 */
export const READING_THEMES = ['light', 'sepia', 'dark'] as const;
export type ReadingTheme = (typeof READING_THEMES)[number];

export type ReadingThemePalette = {
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  accent: string;
  divider: string;
  /** Soft fill behind the currently-playing / focused ayah. */
  ayahHighlight: string;
  ayahMarkerBg: string;
  ayahMarkerBorder: string;
  ayahMarkerText: string;
};

const PALETTES: Record<ReadingTheme, ReadingThemePalette> = {
  light: {
    background: '#fbfbe2',
    surface: '#f5f5dc',
    text: '#003527',
    textMuted: '#404944',
    accent: '#735c00',
    divider: 'rgba(0,53,39,0.10)',
    ayahHighlight: 'rgba(254,214,91,0.18)',
    ayahMarkerBg: '#ffffff',
    ayahMarkerBorder: '#735c00',
    ayahMarkerText: '#735c00',
  },
  sepia: {
    background: '#f4ecd8',
    surface: '#ebe3cf',
    text: '#2b1810',
    textMuted: '#5c4a3a',
    accent: '#735c00',
    divider: 'rgba(43,24,16,0.12)',
    ayahHighlight: 'rgba(115,92,0,0.16)',
    ayahMarkerBg: '#fffdf5',
    ayahMarkerBorder: '#735c00',
    ayahMarkerText: '#735c00',
  },
  dark: {
    background: '#121612',
    surface: '#1a221c',
    text: '#e8edd9',
    textMuted: '#a3aea4',
    accent: '#95d3ba',
    divider: 'rgba(232,237,217,0.12)',
    ayahHighlight: 'rgba(149,211,186,0.16)',
    ayahMarkerBg: '#1e2822',
    ayahMarkerBorder: '#95d3ba',
    ayahMarkerText: '#c9e4d8',
  },
};

export function getReadingTheme(theme: ReadingTheme): ReadingThemePalette {
  return PALETTES[theme] ?? PALETTES.light;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/foundations/readingThemes.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/theme/readingThemes.ts __tests__/foundations/readingThemes.test.ts
git commit -m "feat(theme): add unified reading-theme palettes

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Gradient tokens

Named gradient definitions (ambient emerald glow + gold sheen) consumed by `AmbientBackdrop` and heroes. Scheme-aware accessor.

**Files:**
- Create: `src/theme/gradients.ts`
- Test: `__tests__/foundations/gradients.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/foundations/gradients.test.ts`:

```ts
import { getAmbientGradient, goldSheen } from '../../src/theme/gradients';

describe('gradient tokens', () => {
  it('ambient gradient has >=2 stops for both schemes', () => {
    for (const scheme of ['light', 'dark'] as const) {
      const g = getAmbientGradient(scheme);
      expect(g.colors.length).toBeGreaterThanOrEqual(2);
      g.colors.forEach(c => expect(typeof c).toBe('string'));
      if (g.locations) {
        expect(g.locations.length).toBe(g.colors.length);
      }
    }
  });

  it('gold sheen is a valid stop set', () => {
    expect(goldSheen.colors.length).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/foundations/gradients.test.ts`
Expected: FAIL — cannot find module `gradients`.

- [ ] **Step 3: Write the implementation**

Create `src/theme/gradients.ts`:

```ts
import type { ResolvedScheme } from './useThemePalette';

/** A linear/radial gradient stop set. `locations` (0..1) optional; defaults to even spacing. */
export type GradientStops = {
  colors: string[];
  locations?: number[];
};

/** Soft emerald ambient glow used behind reading surfaces (low opacity in use). */
const ambientGlowLight: GradientStops = {
  colors: ['rgba(6,78,59,0.10)', 'rgba(6,78,59,0.03)', 'rgba(251,251,226,0)'],
  locations: [0, 0.45, 1],
};
const ambientGlowDark: GradientStops = {
  colors: ['rgba(149,211,186,0.10)', 'rgba(18,22,18,0.04)', 'rgba(18,22,18,0)'],
  locations: [0, 0.45, 1],
};

/** Gold sheen for sacred accents / progress arcs. */
export const goldSheen: GradientStops = {
  colors: ['#fed65b', '#d4af37'],
  locations: [0, 1],
};

export function getAmbientGradient(scheme: ResolvedScheme): GradientStops {
  return scheme === 'dark' ? ambientGlowDark : ambientGlowLight;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/foundations/gradients.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/theme/gradients.ts __tests__/foundations/gradients.test.ts
git commit -m "feat(theme): add gradient tokens (ambient glow, gold sheen)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Semantic motion presets + reduce-motion helper

Named motion presets (enter/exit/breathe/press/pageSettle) built from the existing `motion.ts` tokens, plus a pure `withReduceMotion` helper that collapses durations to instant when reduce-motion is on.

**Files:**
- Create: `src/theme/motionPresets.ts`
- Test: `__tests__/foundations/motionPresets.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/foundations/motionPresets.test.ts`:

```ts
import {
  motionPresets,
  durationFor,
} from '../../src/theme/motionPresets';

describe('motion presets', () => {
  it('exposes the semantic presets', () => {
    expect(motionPresets.enter.duration).toBeGreaterThan(0);
    expect(motionPresets.breathe.minOpacity).toBeLessThan(motionPresets.breathe.maxOpacity);
    expect(motionPresets.press.stiffness).toBeGreaterThan(0);
  });

  it('durationFor collapses to 0 when reduce-motion is on', () => {
    expect(durationFor(320, false)).toBe(320);
    expect(durationFor(320, true)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/foundations/motionPresets.test.ts`
Expected: FAIL — cannot find module `motionPresets`.

- [ ] **Step 3: Write the implementation**

Create `src/theme/motionPresets.ts`:

```ts
import { motionDurations, motionEasing, springs } from './motion';

/**
 * Semantic motion presets — components reference these by intent ("enter", "breathe")
 * instead of hand-tuning durations. All built from the calm motion tokens.
 */
export const motionPresets = {
  /** Content reveal: gentle fade + small upward translate. */
  enter: {
    duration: motionDurations.slow,
    easing: motionEasing.standardOut,
    translateY: 12,
  },
  /** Content dismiss. */
  exit: {
    duration: motionDurations.base,
    easing: motionEasing.standardOut,
    translateY: 8,
  },
  /** Slow looping "alive" pulse (active ayah glow, breathing light). Never blinks. */
  breathe: {
    duration: 2600,
    easing: motionEasing.inOutSine,
    minOpacity: 0.55,
    maxOpacity: 1,
    scaleFrom: 1,
    scaleTo: 1.015,
  },
  /** Press feedback spring. */
  press: springs.press,
  /** Mushaf page-turn settle. */
  pageSettle: {
    duration: motionDurations.slow,
    easing: motionEasing.emphasizedOut,
  },
} as const;

/** Returns the given duration, or 0 (instant) when reduce-motion is active. */
export function durationFor(duration: number, reduceMotion: boolean): number {
  return reduceMotion ? motionDurations.instant : duration;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/foundations/motionPresets.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/theme/motionPresets.ts __tests__/foundations/motionPresets.test.ts
git commit -m "feat(theme): add semantic motion presets + reduce-motion helper

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Ambient/reduce-motion preference store + resolver + hook

A small persisted store for the user's ambient-motion toggle, a pure resolver that merges it with OS reduce-motion, and a hook combining them. Lottie/ambient components consume the hook.

**Files:**
- Create: `src/store/motionPrefStore.ts`
- Create: `src/hooks/useAmbientEnabled.ts`
- Test: `__tests__/foundations/motionPref.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/foundations/motionPref.test.ts`:

```ts
import { resolveAmbientEnabled } from '../../src/hooks/useAmbientEnabled';
import { useMotionPrefStore } from '../../src/store/motionPrefStore';

describe('ambient motion preference', () => {
  it('resolver: ambient only when user opts in AND OS reduce-motion is off', () => {
    expect(resolveAmbientEnabled(true, false)).toBe(true);
    expect(resolveAmbientEnabled(true, true)).toBe(false);
    expect(resolveAmbientEnabled(false, false)).toBe(false);
    expect(resolveAmbientEnabled(false, true)).toBe(false);
  });

  it('store defaults ambient on and can toggle', () => {
    expect(useMotionPrefStore.getState().ambientEnabled).toBe(true);
    useMotionPrefStore.getState().setAmbientEnabled(false);
    expect(useMotionPrefStore.getState().ambientEnabled).toBe(false);
    useMotionPrefStore.getState().setAmbientEnabled(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/foundations/motionPref.test.ts`
Expected: FAIL — cannot find module `useAmbientEnabled` / `motionPrefStore`.

- [ ] **Step 3: Write the store**

Create `src/store/motionPrefStore.ts`:

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '../services/storage';

type MotionPrefState = {
  /** User opt-in for ambient motion/Lottie. Default on; OS reduce-motion still overrides. */
  ambientEnabled: boolean;
  setAmbientEnabled: (v: boolean) => void;
};

export const useMotionPrefStore = create<MotionPrefState>()(
  persist(
    set => ({
      ambientEnabled: true,
      setAmbientEnabled: v => set({ ambientEnabled: v }),
    }),
    {
      name: 'motion-pref-v1',
      storage: zustandStorage,
    },
  ),
);
```

- [ ] **Step 4: Write the hook + resolver**

Create `src/hooks/useAmbientEnabled.ts`:

```ts
import { useReducedMotion } from 'react-native-reanimated';
import { useMotionPrefStore } from '../store/motionPrefStore';

/** Ambient runs only when the user opted in AND the OS isn't requesting reduced motion. */
export function resolveAmbientEnabled(
  userAmbientPref: boolean,
  osReduceMotion: boolean,
): boolean {
  return userAmbientPref && !osReduceMotion;
}

/** True when ambient motion/Lottie should render. */
export function useAmbientEnabled(): boolean {
  const userPref = useMotionPrefStore(s => s.ambientEnabled);
  const osReduceMotion = useReducedMotion();
  return resolveAmbientEnabled(userPref, !!osReduceMotion);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- __tests__/foundations/motionPref.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/store/motionPrefStore.ts src/hooks/useAmbientEnabled.ts __tests__/foundations/motionPref.test.ts
git commit -m "feat(motion): ambient preference store, resolver, and hook

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: ProgressRing component (+ pure ring geometry)

A circular progress ring (for the Continue-reading card, surah cards). TDD the geometry; the component renders an SVG track + progress arc.

**Files:**
- Create: `src/components/atoms/ProgressRing/ringGeometry.ts`
- Create: `src/components/atoms/ProgressRing/ProgressRing.tsx`
- Test: `__tests__/foundations/ringGeometry.test.ts`
- Test: `__tests__/foundations/ProgressRing.test.tsx`

- [ ] **Step 1: Write the failing geometry test**

Create `__tests__/foundations/ringGeometry.test.ts`:

```ts
import { ringGeometry } from '../../src/components/atoms/ProgressRing/ringGeometry';

describe('ringGeometry', () => {
  it('full progress yields zero dash offset; zero progress yields full circumference', () => {
    const r = 20;
    const circ = 2 * Math.PI * r;
    expect(ringGeometry(1, r).dashOffset).toBeCloseTo(0, 5);
    expect(ringGeometry(0, r).dashOffset).toBeCloseTo(circ, 5);
    expect(ringGeometry(0, r).circumference).toBeCloseTo(circ, 5);
  });

  it('clamps out-of-range progress', () => {
    const r = 20;
    expect(ringGeometry(1.5, r).dashOffset).toBeCloseTo(0, 5);
    expect(ringGeometry(-1, r).dashOffset).toBeCloseTo(2 * Math.PI * r, 5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/foundations/ringGeometry.test.ts`
Expected: FAIL — cannot find module `ringGeometry`.

- [ ] **Step 3: Write the geometry**

Create `src/components/atoms/ProgressRing/ringGeometry.ts`:

```ts
export type RingGeometry = { circumference: number; dashOffset: number };

/** Maps progress (0..1, clamped) to stroke-dash values for a circle of the given radius. */
export function ringGeometry(progress: number, radius: number): RingGeometry {
  const p = Math.max(0, Math.min(1, progress));
  const circumference = 2 * Math.PI * radius;
  return { circumference, dashOffset: circumference * (1 - p) };
}
```

- [ ] **Step 4: Run geometry test to verify it passes**

Run: `npm test -- __tests__/foundations/ringGeometry.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the component**

Create `src/components/atoms/ProgressRing/ProgressRing.tsx`:

```tsx
import { memo } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { ringGeometry } from './ringGeometry';

type Props = {
  /** 0..1 */
  progress: number;
  size?: number;
  strokeWidth?: number;
  trackColor?: string;
  progressColor?: string;
  children?: React.ReactNode;
};

/** Static circular progress ring. Animated wrappers can drive `progress` via state. */
export const ProgressRing = memo(function ProgressRing({
  progress,
  size = 48,
  strokeWidth = 4,
  trackColor = 'rgba(0,53,39,0.12)',
  progressColor = '#d4af37',
  children,
}: Props) {
  const radius = (size - strokeWidth) / 2;
  const { circumference, dashOffset } = ringGeometry(progress, radius);
  const center = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={progressColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      {children}
    </View>
  );
});
```

- [ ] **Step 6: Write the component render-smoke test**

Create `__tests__/foundations/ProgressRing.test.tsx`:

```tsx
import React from 'react';
import renderer from 'react-test-renderer';
import { ProgressRing } from '../../src/components/atoms/ProgressRing/ProgressRing';

describe('ProgressRing', () => {
  it('renders without crashing at various progress values', () => {
    for (const p of [0, 0.5, 1]) {
      const tree = renderer.create(<ProgressRing progress={p} />);
      expect(tree.toJSON()).toBeTruthy();
      tree.unmount();
    }
  });
});
```

- [ ] **Step 7: Run both tests to verify they pass**

Run: `npm test -- __tests__/foundations/ringGeometry.test.ts __tests__/foundations/ProgressRing.test.tsx`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/atoms/ProgressRing __tests__/foundations/ringGeometry.test.ts __tests__/foundations/ProgressRing.test.tsx
git commit -m "feat(ui): ProgressRing atom + ring geometry

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: AmbientBackdrop component

A reusable backdrop that paints the ambient gradient and, when ambient is enabled, layers an optional Lottie. When reduce-motion/ambient-off, it renders the gradient only (no Lottie). TDD the pure decision helper; smoke-test the component.

**Files:**
- Create: `src/components/atoms/AmbientBackdrop/AmbientBackdrop.tsx`
- Test: `__tests__/foundations/AmbientBackdrop.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/foundations/AmbientBackdrop.test.tsx`:

```tsx
import React from 'react';
import renderer from 'react-test-renderer';
import {
  AmbientBackdrop,
  shouldRenderAmbientLottie,
} from '../../src/components/atoms/AmbientBackdrop/AmbientBackdrop';

describe('AmbientBackdrop', () => {
  it('renders Lottie only when ambient enabled AND a source is provided', () => {
    expect(shouldRenderAmbientLottie(true, { uri: 'x' })).toBe(true);
    expect(shouldRenderAmbientLottie(false, { uri: 'x' })).toBe(false);
    expect(shouldRenderAmbientLottie(true, undefined)).toBe(false);
  });

  it('renders without crashing in both schemes', () => {
    for (const scheme of ['light', 'dark'] as const) {
      const tree = renderer.create(
        <AmbientBackdrop scheme={scheme} ambientEnabled={false} />,
      );
      expect(tree.toJSON()).toBeTruthy();
      tree.unmount();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/foundations/AmbientBackdrop.test.tsx`
Expected: FAIL — cannot find module `AmbientBackdrop`.

- [ ] **Step 3: Write the component**

Create `src/components/atoms/AmbientBackdrop/AmbientBackdrop.tsx`:

```tsx
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import LottieView from 'lottie-react-native';
import { getAmbientGradient } from '../../../theme/gradients';
import type { ResolvedScheme } from '../../../theme/useThemePalette';

type LottieSource = Parameters<typeof LottieView>[0]['source'];

type Props = {
  scheme: ResolvedScheme;
  /** Pass the resolved value from useAmbientEnabled(). */
  ambientEnabled: boolean;
  /** Optional ambient Lottie layered over the gradient (e.g. particles, rays). */
  lottieSource?: LottieSource;
  /** Lottie opacity (kept low so it stays ambient, never wallpaper). */
  lottieOpacity?: number;
};

/** Decision rule (exported for tests): only show Lottie when enabled and a source exists. */
export function shouldRenderAmbientLottie(
  ambientEnabled: boolean,
  lottieSource: LottieSource | undefined,
): boolean {
  return ambientEnabled && !!lottieSource;
}

/** Soft gradient wash + optional ambient Lottie. Sits behind reading content. */
export const AmbientBackdrop = memo(function AmbientBackdrop({
  scheme,
  ambientEnabled,
  lottieSource,
  lottieOpacity = 0.5,
}: Props) {
  const grad = getAmbientGradient(scheme);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="ambient" cx="50%" cy="0%" r="90%">
            {grad.colors.map((color, i) => (
              <Stop
                key={i}
                offset={grad.locations ? grad.locations[i] : i / (grad.colors.length - 1)}
                stopColor={color}
              />
            ))}
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#ambient)" />
      </Svg>
      {shouldRenderAmbientLottie(ambientEnabled, lottieSource) ? (
        <LottieView
          source={lottieSource as LottieSource}
          autoPlay
          loop
          resizeMode="cover"
          style={[StyleSheet.absoluteFill, { opacity: lottieOpacity }]}
        />
      ) : null}
    </View>
  );
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/foundations/AmbientBackdrop.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/atoms/AmbientBackdrop __tests__/foundations/AmbientBackdrop.test.tsx
git commit -m "feat(ui): AmbientBackdrop (gradient wash + optional ambient lottie)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: BismillahReveal component

The devotional opening moment: the Bismillah revealed with a gold draw-in. When reduce-motion is on, it appears instantly. TDD a pure reveal-plan helper; smoke-test the component.

**Files:**
- Create: `src/components/atoms/BismillahReveal/BismillahReveal.tsx`
- Test: `__tests__/foundations/BismillahReveal.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/foundations/BismillahReveal.test.tsx`:

```tsx
import React from 'react';
import renderer from 'react-test-renderer';
import {
  BismillahReveal,
  bismillahRevealPlan,
} from '../../src/components/atoms/BismillahReveal/BismillahReveal';

describe('BismillahReveal', () => {
  it('reveal plan is instant under reduce-motion, timed otherwise', () => {
    expect(bismillahRevealPlan(true).durationMs).toBe(0);
    expect(bismillahRevealPlan(false).durationMs).toBeGreaterThan(0);
  });

  it('renders without crashing', () => {
    const tree = renderer.create(<BismillahReveal reduceMotion />);
    expect(tree.toJSON()).toBeTruthy();
    tree.unmount();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/foundations/BismillahReveal.test.tsx`
Expected: FAIL — cannot find module `BismillahReveal`.

- [ ] **Step 3: Write the component**

Create `src/components/atoms/BismillahReveal/BismillahReveal.tsx`:

```tsx
import { memo, useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { motionDurations, motionEasing } from '../../../theme/motion';
import { fontFamilies, getFontConfig } from '../../../theme/typography';

/** Arabic Basmala. */
const BISMILLAH = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';

type Props = {
  reduceMotion?: boolean;
  color?: string;
  fontSize?: number;
};

export function bismillahRevealPlan(reduceMotion: boolean): { durationMs: number } {
  return { durationMs: reduceMotion ? 0 : motionDurations.slower };
}

/** Gold Basmala that fades + rises in on mount (instant under reduce-motion). */
export const BismillahReveal = memo(function BismillahReveal({
  reduceMotion = false,
  color = '#d4af37',
  fontSize = 26,
}: Props) {
  const progress = useSharedValue(reduceMotion ? 1 : 0);
  const { durationMs } = bismillahRevealPlan(reduceMotion);

  useEffect(() => {
    progress.value = withTiming(1, {
      duration: durationMs,
      easing: motionEasing.emphasizedOut,
    });
  }, [progress, durationMs]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 10 }],
  }));

  return (
    <Animated.View style={[styles.wrap, style]}>
      <Text
        allowFontScaling={false}
        style={[
          styles.text,
          { color, fontSize, lineHeight: Math.round(fontSize * 1.6) },
        ]}>
        {BISMILLAH}
      </Text>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  text: {
    ...getFontConfig(fontFamilies.arabic, '700'),
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/foundations/BismillahReveal.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/atoms/BismillahReveal __tests__/foundations/BismillahReveal.test.tsx
git commit -m "feat(ui): BismillahReveal opening animation

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9: GoldBloom one-shot celebration

A short golden bloom used for prayer-completion and Quran milestones. Plays once then notifies via `onFinish` so the parent can unmount it. Reduce-motion → fires `onFinish` immediately without animating.

**Files:**
- Create: `src/components/atoms/GoldBloom/GoldBloom.tsx`
- Test: `__tests__/foundations/GoldBloom.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/foundations/GoldBloom.test.tsx`:

```tsx
import React from 'react';
import renderer from 'react-test-renderer';
import {
  GoldBloom,
  bloomDurationMs,
} from '../../src/components/atoms/GoldBloom/GoldBloom';

describe('GoldBloom', () => {
  it('duration is 0 under reduce-motion, 1-2s otherwise', () => {
    expect(bloomDurationMs(true)).toBe(0);
    const d = bloomDurationMs(false);
    expect(d).toBeGreaterThanOrEqual(1000);
    expect(d).toBeLessThanOrEqual(2000);
  });

  it('calls onFinish immediately under reduce-motion', () => {
    const onFinish = jest.fn();
    const tree = renderer.create(<GoldBloom reduceMotion onFinish={onFinish} />);
    expect(onFinish).toHaveBeenCalledTimes(1);
    tree.unmount();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/foundations/GoldBloom.test.tsx`
Expected: FAIL — cannot find module `GoldBloom`.

- [ ] **Step 3: Write the component**

Create `src/components/atoms/GoldBloom/GoldBloom.tsx`:

```tsx
import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { motionEasing } from '../../../theme/motion';

type Props = {
  reduceMotion?: boolean;
  size?: number;
  color?: string;
  onFinish?: () => void;
};

export function bloomDurationMs(reduceMotion: boolean): number {
  return reduceMotion ? 0 : 1400;
}

/** Expanding gold ring + fade. One-shot; parent unmounts on onFinish. */
export const GoldBloom = memo(function GoldBloom({
  reduceMotion = false,
  size = 160,
  color = '#fed65b',
  onFinish,
}: Props) {
  const t = useSharedValue(0);
  const duration = bloomDurationMs(reduceMotion);

  useEffect(() => {
    if (reduceMotion) {
      onFinish?.();
      return;
    }
    t.value = withTiming(1, { duration, easing: motionEasing.standardOut }, finished => {
      if (finished && onFinish) runOnJS(onFinish)();
    });
  }, [t, duration, reduceMotion, onFinish]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 1 - t.value,
    transform: [{ scale: 0.4 + t.value * 0.9 }],
  }));

  if (reduceMotion) return null;

  return (
    <View pointerEvents="none" style={styles.center}>
      <Animated.View
        style={[
          styles.ring,
          { width: size, height: size, borderRadius: size / 2, borderColor: color },
          ringStyle,
        ]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  ring: { borderWidth: 3 },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/foundations/GoldBloom.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/atoms/GoldBloom __tests__/foundations/GoldBloom.test.tsx
git commit -m "feat(ui): GoldBloom one-shot celebration

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 10: Quran reading font wiring (Amiri Quran)

Add a dedicated Quranic reading face for verse-by-verse reading and expose it through the typography system. Amiri (regular) stays for incidental Arabic. We use **Amiri Quran** (OFL-licensed, a proper Quranic Uthmani-style face from Google Fonts) — the true KFGQPC Hafs font was not fetchable, and Amiri Quran is a license-safe, authentic substitute that reads distinctly more "Quranic" than the base Amiri already bundled.

**Asset:** `src/assets/fonts/AmiriQuran-Regular.ttf` is already added to the repo (downloaded from Google Fonts OFL). Family name (name table): **"Amiri Quran"**, PostScript: **"AmiriQuran-Regular"**.

**Native linking (manual, document in PR — required for on-device rendering):** run `npx react-native-asset` (uses the existing `react-native.config.js` `assets` entry) and rebuild both apps. iOS additionally requires `AmiriQuran-Regular.ttf` listed under `UIAppFonts` in `ios/<App>/Info.plist` if not auto-added. **On-device verification:** confirm the iOS family string actually renders; if "Amiri Quran" doesn't resolve, read the font's name table and use the exact registered family name.

**Files:**
- Asset (already present): `src/assets/fonts/AmiriQuran-Regular.ttf`
- Modify: `src/theme/typography.ts`
- Test: `__tests__/foundations/typographyQuran.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/foundations/typographyQuran.test.ts`:

```ts
import { fontFamilies, typography } from '../../src/theme/typography';

describe('quran typography', () => {
  it('exposes a dedicated quran font family', () => {
    expect(fontFamilies.quran).toBeDefined();
    expect(typeof fontFamilies.quran).toBe('string');
  });

  it('has a quranVerse variant larger than the incidental verse variant', () => {
    expect(typography.quranVerse.fontSize).toBeGreaterThanOrEqual(typography.verse.fontSize);
    expect(typography.quranVerse.fontFamily).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/foundations/typographyQuran.test.ts`
Expected: FAIL — `fontFamilies.quran` is undefined.

- [ ] **Step 3: Implement font wiring**

In `src/theme/typography.ts`, add `quran` to `fontFamilies`:

```ts
export const fontFamilies = {
  headline: 'Manrope',
  body: 'PlusJakartaSans',
  arabic: 'Amiri',
  /** Amiri Quran — verse-by-verse Quran reading. Asset: AmiriQuran-Regular.ttf */
  quran: 'AmiriQuran',
} as const;
```

Then, after the existing `verse` entry in the `typography` object, add a `quranVerse` variant:

```ts
  // Verse-by-verse Quran reading (Quranic Amiri face, larger + airier than incidental verse).
  quranVerse: {
    ...getFontConfig(fontFamilies.quran, '400'),
    fontSize: 26,
    lineHeight: 52,
  },
```

`getFontConfig` must resolve the platform-correct family for the single-weight Amiri Quran file. Add this guard inside `getFontConfig`, near the existing `Amiri` special-case, BEFORE the generic weight-map return:

```ts
  if (baseFamily === fontFamilies.quran) {
    // Single-weight Quranic face. iOS uses the registered family name "Amiri Quran";
    // Android (legacy assets/fonts) maps by the file base name.
    return Platform.OS === 'ios'
      ? { fontFamily: 'Amiri Quran', fontWeight: undefined }
      : { fontFamily: 'AmiriQuran-Regular', fontWeight: undefined };
  }
```

Note: `fontFamilies` is defined above `getFontConfig` in this file, so referencing `fontFamilies.quran` inside `getFontConfig` is fine. The unit test only asserts the tokens exist; the on-device family string is verified during the native build (see prep note).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/foundations/typographyQuran.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/theme/typography.ts __tests__/foundations/typographyQuran.test.ts src/assets/fonts/AmiriQuran-Regular.ttf
git commit -m "feat(theme): wire Amiri Quran reading font + quranVerse variant

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 11: Barrel exports + full suite

Export the new theme tokens through `src/theme/index.ts` so screens import from one place, and confirm the whole suite is green.

**Files:**
- Modify: `src/theme/index.ts`
- Test: `__tests__/foundations/themeBarrel.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/foundations/themeBarrel.test.ts`:

```ts
import * as theme from '../../src/theme';

describe('theme barrel', () => {
  it('re-exports the new foundation tokens', () => {
    expect(theme.getReadingTheme).toBeDefined();
    expect(theme.getAmbientGradient).toBeDefined();
    expect(theme.motionPresets).toBeDefined();
    expect(theme.durationFor).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/foundations/themeBarrel.test.ts`
Expected: FAIL — exports undefined.

- [ ] **Step 3: Add the exports**

Append to `src/theme/index.ts`:

```ts
export { READING_THEMES, getReadingTheme } from './readingThemes';
export type { ReadingTheme, ReadingThemePalette } from './readingThemes';
export { getAmbientGradient, goldSheen } from './gradients';
export type { GradientStops } from './gradients';
export { motionPresets, durationFor } from './motionPresets';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/foundations/themeBarrel.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full suite + typecheck**

Run: `npm test`
Expected: PASS (all foundation tests + the two pre-existing tests).

Run: `npx tsc --noEmit`
Expected: no new type errors from P0 files.

- [ ] **Step 6: Commit**

```bash
git add src/theme/index.ts __tests__/foundations/themeBarrel.test.ts
git commit -m "feat(theme): export P0 foundation tokens from barrel

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage (P0 scope, spec §8):**
- design tokens — gradients (Task 3), unified reading themes (Task 2), motion presets (Task 4) ✓
- Uthmani font wiring — Task 10 ✓
- Lottie infrastructure + toggle + reduce-motion — `AmbientBackdrop` (Task 7) + ambient pref store/resolver/hook (Task 5) + reduce-motion-aware components (Tasks 8, 9) ✓
- haptic utilities — already complete in `src/utils/appHaptics.ts` (hapticLight/Medium/Success/Selection/Warning/Error); no new work needed. Tasbih "tick" reuses `hapticSelection`. (Noted, not a task.) ✓
- shared components — `AmbientBackdrop`, `BismillahReveal`, `ProgressRing`, `GoldBloom` ✓; `AudioPlayer` shell + `EditionPickerSheet` + `ReaderSettingsSheet` deferred to P1/P2 (see Scope note) ✓
- theme engine — the existing `useThemePalette` + new tokens cover it; no rewrite needed in P0 ✓

**Placeholder scan:** No TBD/TODO; every code step has complete code. The only manual element is the binary font asset acquisition in Task 10, which is documented with the exact filename, license, and linking commands. ✓

**Type consistency:** `ringGeometry` returns `{ circumference, dashOffset }` and is consumed with those names in `ProgressRing`. `shouldRenderAmbientLottie(ambientEnabled, lottieSource)` arg order matches the test and the component call site. `resolveAmbientEnabled(userAmbientPref, osReduceMotion)` order matches its test. `bismillahRevealPlan`/`bloomDurationMs` signatures match their tests. Barrel re-exports match the source module export names. ✓
