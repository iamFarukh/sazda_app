# Sazda — God-Level Premium Redesign (Master Design Spec)

**Date:** 2026-06-30
**Status:** Vision + architecture spec. Per-phase implementation plans are generated separately.
**Scope:** One cohesive redesign across the Home/Prayer experience and the entire Quran flow, plus the supporting tools (Qibla, Tasbih, Streak, Ramadan). Visual + motion + UX + new features.

---

## 1. Vision & Philosophy

Sazda should not feel like a utility or a settings-heavy religious app. It should feel like **walking into a peaceful mosque at Fajr** — every interaction intentional, elegant, calming. Every animation, transition, sound, haptic, and surface reinforces one feeling:

> **Peace. Presence. Connection with Allah.**

It must never feel empty or boring, and never feel like a game. The bar is **Apple-level premium**: calm, alive, spiritual, modern, **handcrafted** (not templated).

### Non-goals
- No gamification that pressures or punishes (streaks encourage, never shame).
- No flashy, fast, or attention-grabbing motion.
- No decorative animation that exists only to fill empty space.
- Not rewriting the prayer-time calculation, auth, or notification engines — those stay; we restyle their surfaces.

---

## 2. Design Language

A single design language powers every screen, expressed as theme tokens so nothing uses hex/magic literals.

### 2.1 Visual identity (elevated current Sazda palette)
- **Deep Emerald** (`primary #003527`, `primaryContainer #064e3b`) — primary foundation / structure.
- **Warm Gold** (`secondaryContainer #fed65b`, `gold #D4AF37`) — **sacred highlight only**: active ayah, progress, devotional moments, milestones. Never large fills.
- **Soft Beige** (`surface #fbfbe2` and the `surfaceContainer*` ramp) — the reading paper.
- **Pure White** — readability anchor.
- Arabic typography is a **first-class visual element**, not an afterthought.
- Everything should read as handcrafted: layered depth, soft long shadows (existing `elevation` tokens), translucent/frosted cards, generous whitespace and vertical rhythm.

### 2.2 New foundation tokens (added in P0)
- `gradients` — named gradient sets (ambient emerald glow, gold sheen, per-prayer skies) consumed by `AmbientBackdrop` and heroes.
- `motion` — extend existing `springs`/`motionDurations`/`motionEasing` with named semantic presets (see §3).
- `readingThemes` — unified light / sepia / dark reading palettes shared by Surah reader, Mushaf, and Tafsir (replaces the two divergent theme definitions).

### 2.3 Typography
- **Manrope** — editorial display / headings (unchanged).
- **Plus Jakarta Sans** — body + labels (unchanged).
- **Uthmani Hafs** (NEW) — verse-by-verse Quran reading in `SurahReader` and `Tafsir`. More authentic and premium than Amiri for Quran text. Amiri stays for incidental Arabic (UI, surah names).
- **QPC page fonts** (NEW, lazy) — the Mushaf renders with per-page King Fahd Complex glyph fonts (see §5.4).

---

## 3. Motion System

Motion is part of the experience, not decoration. The entire app obeys one motion system.

### 3.1 Principles
Slow · Soft · Organic · Elegant · Respectful · Fluid. **Nothing snaps. Everything breathes.**

### 3.2 Semantic motion presets (Reanimated, P0)
- `enter` / `exit` — content reveal (gentle fade + small translate-up, ~320–420ms, soft easing).
- `breathe` — slow looping opacity/scale for "alive" elements (e.g., active ayah, glow), 2–4s, never blinks.
- `press` — micro press feedback (scale 0.97, spring) paired with haptics.
- `pageSettle` — Mushaf page-turn settle (depth + shadow + light reflection).
- `sharedTransition` — shared-element transitions (card → reader) using Reanimated shared transitions / layout animations.

### 3.3 Haptics
Centralize in `appHaptics` (already exists): `hapticLight` (taps), `hapticSelect` (toggles), `hapticSuccess` (milestones/qibla lock), `hapticTick` (tasbih bead). Every meaningful interaction pairs motion + haptic.

---

## 4. Lottie Philosophy & Inventory

### 4.1 The Golden Rule (hard design law)
Before any Lottie ships, it must answer **yes** to:
> "Does this make the user feel more connected, more guided, or more delighted **without distracting them from worship**?"

If **no** → replace with elegant Reanimated motion. Lottie is **ambient storytelling**, never wallpaper. Nothing fast, nothing distracting.

### 4.2 Performance rules for Lottie
- Ambient loops run at low opacity, capped frame rate where possible, and are **toggleable** via a "Reduce motion / ambient" reading setting and respect OS reduce-motion.
- One ambient Lottie max per screen; pause when screen is blurred/backgrounded.
- One-shot celebration Lotties (bloom) auto-unmount after play.
- Heavy/optional Lotties lazy-load.

### 4.3 Intentional Lottie inventory (purpose-tagged)
| Location | Lottie | Purpose | If it fails the rule → fallback |
|---|---|---|---|
| Home hero | per-prayer ambient sky (rays, particles, clouds, breathing glow, subtle geometry) | emotional time-of-day presence | Reanimated gradient + particle field |
| Prayer hero (per prayer) | Fajr sunrise+birds / Dhuhr shimmer / Asr long shadows / Maghrib sunset / Isha stars+moon | each prayer feels emotionally distinct | tinted gradient atmosphere (already partly present) |
| Prayer completion | golden bloom + expanding ring (1–2s) | satisfying acknowledgement | Reanimated ring expand + fade |
| Quran open / surah open | **Bismillah** golden self-drawing stroke + soft glow + particles | devotional threshold moment | SVG stroke-draw via Reanimated |
| Continue-reading card | breathing glow + animated page edges + dust | card feels alive | Reanimated breathe + progress ring |
| Audio player | behind-art moving gradient mesh + waveform synced to recitation + breathing light | "listening inside a prayer hall" | Reanimated animated mesh + bar waveform |
| Tasbih | bead rotate + ripple + glow; 33/99 milestone bloom | rewarding each dhikr | Reanimated bead + ripple |
| Daily streak | growing Islamic geometric flower, one petal/day | encouragement, never punishment | SVG petals revealed via Reanimated |
| Qibla lock | Noor pulse on alignment | instant "you're facing Qibla" feedback | Reanimated gold pulse |
| Ramadan mode | moon, swaying lanterns, stars | seasonal transformation | Reanimated lantern sway + star twinkle |
| Loading | elegant shimmer | calm waiting | Reanimated shimmer (already exists) |

**Mushaf is deliberately near-zero decorative Lottie** — only the page-turn (paper shadow, depth, light reflection, natural settle) so it feels like holding a real Mushaf.

---

## 5. Architecture & Data

The app gets smarter underneath. Users don't see the architecture; they feel the seamlessness.

### 5.1 Unified reading state (replaces two divergent stores)
- Today `quranProgressStore` (surah mode) and `mushafReaderStore` (page mode) hold **separate** last-read and bookmarks.
- **New:** one canonical reading store keyed by ayah coordinate `{surah, ayah}`.
  - `lastRead` is a single ayah coordinate shared across modes. Mushaf page derives via existing `findPageForAyah`.
  - `bookmarks` are a single set of `{surah, ayah, createdAt, note?}`; Mushaf displays them by page.
  - Mode-specific *view* prefs (font scale per mode) may remain separate; **state of record** (progress, bookmarks) is unified.
  - Migration: merge existing persisted data from both stores on first launch (dedupe bookmarks; pick most-recent last-read).
  - Continue Firestore sync (extend to the unified shape).

### 5.2 Shared reading-preferences store (NEW)
`reciter`, `translationEdition`, `showTransliteration`, `readingTheme` (light/sepia/dark), `ambientEnabled`, `reduceMotion`. Used by reader, Mushaf, Tafsir, audio.

### 5.3 Editions catalog + parametrized API
- A curated `editionsCatalog` with metadata: reciters (Alafasy, Sudais, Husary, Minshawi, …) and translations (Sahih Intl, Pickthall, Yusuf Ali, Urdu, transliteration, …), each with id, display name, language, direction.
- `quranApi.fetchSurahReaderData` becomes parametrized by `{ translationEdition, reciterEdition }` (alquran.cloud supports multiple editions).
- **Offline cache keyed by edition** so picks persist and cache correctly (extend `offlineQuran` manifest/reader to namespace by edition; default editions pre-cached, others cached on demand).

### 5.4 True Madinah Mushaf — QPC pipeline (confirmed approach A)
- A scripted, one-time generation step fetches the **open QPC glyph fonts** + **QUL line/word layout** (page → 15 lines → words, with ayah markers and surah-header/basmala line types).
- Output: compact **bundled layout JSON** + **per-page fonts lazy-downloaded** and cached via `react-native-fs` (reuse the existing offline-download pattern), registered to the RN font system at runtime.
- The Mushaf renderer reads through a **`MushafLayoutProvider` interface**:
  - Primary provider: QPC glyph + layout.
  - **Fallback provider:** the current elevated reflow renderer (so if asset sourcing ever fails, Mushaf still works — degraded but functional).
- Tap a word → resolve to ayah → shared ayah action sheet.

### 5.5 Unified audio engine
- One audio engine + one `audioStore`, accessible from Surah reader **and** Mushaf and anywhere (mini-player app-wide).
- Reciter switch re-resolves URLs from the editions catalog. Queue, repeat modes, autoplay-next, ayah sync.

### 5.6 Verse sharing
- A `ShareVerseCard` renders Arabic + translation + reference on the Sazda gradient; captured to image via **`react-native-view-shot`** (new dep) and shared via RN built-in `Share`; plain-text share also offered.

### 5.7 Cross-cutting
- Better caching (React Query stale-times reviewed per endpoint), lazy asset downloads, theme-aware rendering everywhere, accessibility (dynamic type where feasible, reduce-motion, screen-reader labels).

---

## 6. Per-Screen Specs (intent)

Each screen is rebuilt in the unified language. Detailed component/layout breakdowns are produced in the per-phase plans; this is the binding intent.

1. **Home** — keep the immersive prayer hero; refit lower content (daily verse, mood, sections) into the new rhythm with micro-animations; per-prayer ambient atmosphere (§4.3); prayer-completion bloom; better section spacing.
2. **Prayer hero** — living, emotionally distinct per prayer (Fajr→Isha atmospheres). Calm countdown, current/next prayer, streak entry point.
3. **QuranHome** — calm gradient header; refined search; one elegant **Continue** hero (progress ring + Bismillah motif + breathing glow); premium recently-opened cards; clear **Surah / Juz / Page (Mushaf)** mode selector; popular surahs; daily-ayah reflection. Offline banner → subtle inline chip. Bismillah reveal + shared-element transitions into reader.
4. **SurahList** — segmented Surah / Juz / Page / Bookmarks; beautiful rows (Uthmani name + meta); search across everything; subtle scroll reveal; bookmark slide-in.
5. **SurahReader** — spacious ayah blocks; Uthmani Arabic; translation + optional transliteration; gentle active-ayah breathing highlight synced to audio; per-ayah action bar (play · tafsir · bookmark · share) revealed on tap with ripple + gold highlight + haptic; ambient backdrop (toggleable); Bismillah reveal on open.
6. **Audio player** — premium full player (ambient mesh, reciter, waveform Lottie, queue, repeat modes, reciter switch) + theme-aware mini-player available app-wide incl. Mushaf.
7. **Mushaf (Mufasa) mode** — true QPC Madinah pages; respectful near-zero decoration; realistic page-turn (shadow/depth/light/settle); minimal auto-hiding chrome; tap-ayah → action sheet; juz/hizb markers; ornate surah headers from layout; reading progress; jump-to-page shows current page.
8. **Tafsir** — calm long-form reading; paragraphs fade slightly on scroll; headers reveal; edition picker; prev/next; bookmark; share.
9. **Qibla** — rotating Kaaba, direction beam, glowing path, compass ring, calibration; on alignment: gold Noor pulse + compass lock + success haptic.
10. **Tasbih** — bead rotate + ripple + glow + tick haptic per tap; 33/99 milestone blooms; never flashy.
11. **Daily streak** — growing Islamic geometric flower (one petal/day); missing a day keeps the flower (encourage, never punish).
12. **Ramadan mode** — auto seasonal transform: moon, swaying lanterns, stars, themed prayer cards, special duas, greeting.

---

## 7. Shared Components (built in P0, reused everywhere)
`AmbientBackdrop` · `BismillahReveal` · `ProgressRing` · `VerseCard` / `ShareVerseCard` · `AyahActionBar` · unified `AudioPlayer` (mini + full) · `EditionPickerSheet` (reciter/translation) · `ReaderSettingsSheet` (unified) · `MushafPage` (QPC) · `GoldBloom` (one-shot celebration) · motion/haptic hooks.

---

## 8. Build Phases (one vision, staged delivery)

Each phase becomes its own implementation plan (and detailed sub-spec at plan time). We start plans at P0/P1.

- **P0 — Foundations:** design tokens (gradients, motion presets, unified reading themes), Uthmani font wiring, Lottie infrastructure + toggle + reduce-motion, haptic utilities, shared components (`AmbientBackdrop`, `BismillahReveal`, `ProgressRing`, unified `AudioPlayer` shell, sheets), theme engine.
- **P1 — Data & Core:** unified reading store (+ migration + Firestore), shared preferences store, editions catalog, parametrized API + offline keying, download manager updates, reciter/translation picker sheets.
- **P2 — Quran Experience:** QuranHome, SurahList, SurahReader, ayah interactions, full audio player + mini-player, verse sharing.
- **P3 — True Mushaf:** QPC glyph pipeline + layout data, `MushafPage` renderer (+ fallback provider), Mushaf navigation/gestures, page-turn motion, reading progress.
- **P4 — Prayer Experience:** Home redesign, prayer hero per-prayer atmospheres, prayer timeline, daily reflections, completion animations, widget polish.
- **P5 — Premium Features:** Qibla redesign, Tasbih redesign, Daily streak, Ramadan mode, accessibility pass, final animation polish, performance optimization.

---

## 9. New Dependencies & Assets
- **Deps:** `react-native-view-shot` (verse-image share). (RN `Share` is built-in.)
- **Fonts:** one Uthmani Hafs font (bundled); QPC per-page fonts (lazy-downloaded + cached).
- **Data:** QUL Madinah line/word layout dataset (bundled, compact JSON).
- **Lottie:** new ambient + celebration files per §4.3 (sourced or commissioned; each must pass the Golden Rule).

## 10. Risks & Fallbacks
- **QPC asset sourcing (highest risk):** mitigated by the `MushafLayoutProvider` fallback to the elevated reflow renderer — Mushaf ships either way; QPC upgrades it.
- **Lottie performance on low-end devices:** mitigated by §4.2 rules + global ambient/reduce-motion toggle + Reanimated fallbacks.
- **Edition explosion / cache size:** curated catalog (not "all editions"); on-demand caching; default editions only pre-bundled.
- **Store migration:** one-time merge with dedupe; keep old stores readable until migration confirmed.

## 11. Acceptance Criteria (program-level)
- Last-read and bookmarks are identical across Surah and Mushaf modes.
- Audio plays and is controllable from Surah reader, Mushaf, and the app-wide mini-player; reciter switch works and persists.
- Translation switch works and persists; transliteration toggles.
- Mushaf shows true Madinah page layout (or documented fallback) with tap-to-ayah.
- Verse share produces a correct image + text.
- Every shipped Lottie passes the Golden Rule and respects reduce-motion; no jank on a mid-range device.
- All redesigned screens use only theme tokens (no hex/magic literals) and the shared components.
