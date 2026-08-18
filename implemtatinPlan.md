# Sazda — Phase 2: UI / UX polish (implementation plan)

> **Note:** This file is named `implemtatinPlan.md` in the repo; consider renaming to `implementationPlan.md` when convenient for search and links.

## Purpose

Phase 1 delivered core flows. **Phase 2** raises perceived quality: motion, typography discipline, feedback, and clarity of prayer-related states—**without** new backends or large feature scope.

## Principles

1. **Calm by default** — Prayer and Quran contexts favor restraint; motion supports meaning, not distraction.
2. **One design system** — Colors, type, and spacing flow from existing theme tokens (`useThemePalette`, `typography`, `spacing`, `radius`).
3. **Respect accessibility** — Honor reduced motion where possible; maintain contrast and readable touch targets.
4. **Internal vs display** — API and logic keep canonical keys (e.g. `Dhuhr`); user-facing copy uses your chosen label (**Zohar**) via `prayerDisplayLabel` / native equivalents.

## Non-goals (this phase)

- New server features, auth changes, or Firestore schema work.
- Full redesigns of Mushaf / reader IA (can be a later phase unless scoped as small, isolated tweaks).

---

## Workstream A — Hero & prayer context (“living” UI)

| Priority | Item | Description | Primary files / notes |
|----------|------|-------------|------------------------|
| **P0** | Period-aware hero surfaces | Smooth, **subtle** background (and optional accent) shifts tied to `hero.currentPeriod` (Fajr, Zohar window, Asr, Maghrib, Isha, makruh, between-prayers, night). Prefer Reanimated shared values + interpolateColor; avoid jarring full-screen flashes. | `HomePrayerHeroAnimated.tsx`, theme palette |
| **P0** | Makruh / guidance clarity | Make **makruh** and **between-prayers** states scannable: consistent badge/pill, iconography, and short explanatory hierarchy (you already have makruh details—tighten visual priority). | `HomePrayerHeroAnimated.tsx`, `usePrayerTimesHome` |
| **P1** | Loading / stale prayer data | Skeleton or compact shimmer for prayer block while location/times load; subtle “times may be stale” alignment with widget copy where relevant. | Home stack, prayer queries |
| **P2** | Pull-to-refresh feedback | If PTR exists or is added on home, pair with `hapticLight` on release + clear completion state. | Home scroll container |

**Acceptance:** Hero never blocks interaction; color transitions are smooth on mid-range devices; makruh state is identifiable in under 2 seconds without reading body copy.

---

## Workstream B — Haptics (tactile polish)

**Current state (audit):** Haptics are **not** limited to Tasbeeh. They already appear in:

- `Button`, `IconButton`, `SazdaBottomTabBar`, `AppDrawerContent`, `NotificationOnboardingModal`, Qibla flows, etc.

**Gap:** Many high-value screens still feel “flat” (e.g. mood chips, prayer tracker toggles, list row actions, theme switches).

| Priority | Interaction | Suggested API |
|----------|-------------|---------------|
| **P0** | Home mood selection | `hapticLight` |
| **P0** | Prayer tracker ✓ / ✗ (and day reset confirm) | `hapticSuccess` / light impact on toggle |
| **P1** | Theme / appearance changes | `hapticMedium` |
| **P1** | Translation / reader toggles (Quran) | `hapticMedium` |
| **P2** | Successful location save / GPS lock | `hapticSuccess` |

**Acceptance:** No haptic on passive renders; user can disable or OS silences; no double-fire on double-tap debounced controls.

---

## Workstream C — Typography & layout consistency

| Priority | Item | Description |
|----------|------|-------------|
| **P0** | Token-only fonts | Replace stray `fontFamily: 'Manrope'` / `'Plus Jakarta Sans'` with `fontFamilies` + `getFontConfig` from `src/theme/typography.ts`. Known example: `AnimatedSplashScreen.tsx`. |
| **P1** | Screen audit | Grep for hardcoded font families; fix outliers in onboarding, tools, and profile. |
| **P1** | Numeric / time readability | Ensure prayer times and countdowns use the same weight hierarchy as the hero list (avoid mixing ad-hoc sizes). |

**Acceptance:** Grep for raw `'Manrope'` / `'Plus Jakarta Sans'` in `src/` returns only `typography.ts` (or documented exceptions).

---

## Workstream D — Cross-screen UI refinement

| Priority | Item | Description |
|----------|------|-------------|
| **P1** | Tools & profile cards | Unify card padding, pressed states, and icon alignment with Home / Quran patterns. |
| **P1** | Empty & error states | Consistent illustration or icon + title + one action (e.g. “Set location”, “Retry”) for prayer errors and offline Quran. |
| **P2** | Quran reader micro-polish | Focused pass: mini-player affordance, sheet drag handle consistency, focus mode contrast—**small** deltas only unless you spin a Phase 3 reader epic. |
| **P2** | Motion tokens | Optional `theme/motion.ts` (durations, easing names) referenced by Reanimated screens to avoid magic numbers. |

---

## Workstream E — Verification & release

### Automated / static

- [x] `rg "fontFamily: 'Manrope'" src` and `rg "Plus Jakarta Sans" src` — **splash** fixed; remaining uses should stay in `typography.ts` only.
- [x] Lint on Phase 2–touched files (project `tsc` may still report unrelated pre-existing errors).
- [ ] Snapshot or unit tests only where cheap (e.g. `prayerDisplayLabel` already testable).

### Manual (device)

- [ ] Light + dark mode on hero for each major `currentPeriod` (living colors + makruh card).
- [ ] Haptics: Home mood, pull-to-refresh, prayer tracker marks, settings theme + translation; tab bar regression.
- [ ] Reduced motion: enable OS setting — hero ambient crossfade should jump (0 ms) per `AccessibilityInfo.isReduceMotionEnabled`.

### Suggested rollout

1. **Sprint 1:** Workstreams C (typography) + B (high-traffic haptics) — low risk, high consistency.
2. **Sprint 2:** Workstream A (hero + makruh clarity).
3. **Sprint 3:** Workstream D (empty states, tools polish, optional Quran micro-pass).

---

## Open decisions (your call)

1. **Hero color drama:** How bold should period-based backgrounds be? (Subtle tint vs obvious gradient.)
2. **Quran scope:** Phase 2 “micro-polish” only, or a dedicated **Phase 3: Reader UX** with navigation and audio continuity?
3. **Filename:** Rename `implemtatinPlan.md` → `implementationPlan.md` for clarity.

---

## Summary

This plan **keeps** the original Gemini ideas (living hero, haptics, typography, makruh clarity) but **corrects** the haptics baseline, **adds** prioritized empty/loading/reader/tooling polish, and ties work to **acceptance checks** so execution stays measurable. When you’re ready, start with **Sprint 1** and treat each workstream as a small PR-sized slice.
