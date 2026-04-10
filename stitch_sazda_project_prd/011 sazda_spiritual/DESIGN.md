# Design System Strategy: The Digital Sanctuary

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Digital Sanctuary."** 

We are moving away from the "utility-first" aesthetic of standard apps. Instead, we are building a space that feels like modern architectural prayer halls—minimalist, high-ceilinged, and bathed in soft, natural light. To achieve this, we reject the rigid, boxed-in grid. We embrace **Intentional Asymmetry** and **Editorial Breathing Room**. 

Elements should feel like they are floating in a calm, expansive void. We use overlapping components (e.g., a card bleeding off the edge or a floating action element slightly offset from the center) to break the "template" feel, creating a signature premium experience that prioritizes peace over information density.

---

## 2. Color Palette & Tonal Depth
Our color strategy relies on "Environmental Light" rather than structural lines.

### Named Color Tokens (Material Convention)
*   **Primary:** `#003527` (Deep Emerald - Authority & Depth)
*   **Primary Container:** `#064e3b` (The Brand Core)
*   **Secondary:** `#735c00` (Gold - Status & Devotion)
*   **Secondary Container:** `#fed65b` (Warm Highlight)
*   **Surface:** `#fbfbe2` (Soft Beige - The "Paper" base)
*   **Surface Container Low:** `#f5f5dc` (Standard Background)
*   **Surface Container Highest:** `#e4e4cc` (Deepest Layering)

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders to section content. Boundaries must be defined solely through background color shifts. For example, a `surface-container-low` list item should sit on a `surface` background. If you feel the need for a line, increase the `spacing-8` instead.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. 
*   **Base:** `surface` (The foundation).
*   **Layout Sections:** `surface-container-low`.
*   **Floating Cards:** `surface-container-lowest` (#ffffff) to provide a "pure" lift.
*   **Active States:** Transition to `primary-container` for a deep, immersive focus.

### The "Glass & Gradient" Rule
For high-status CTAs or Hero sections, use a subtle linear gradient from `primary` (#003527) to `primary-container` (#064e3b) at a 135-degree angle. For floating navigation or overlays, apply **Glassmorphism**: use `surface` at 80% opacity with a `24px` backdrop-blur to allow the geometric patterns beneath to bleed through softly.

---

## 3. Typography: The Editorial Voice
We use a high-contrast scale to create an "Editorial" feel, pairing clean modernism with sacred tradition.

*   **Display & Headlines (Manrope):** Our "Structural" voice. Use `display-lg` (3.5rem) with tight letter-spacing (-0.02em) for prayer times or titles. This creates a bold, authoritative presence.
*   **Body & Labels (Plus Jakarta Sans):** Our "Functional" voice. High x-height ensures readability for long-form translations. 
*   **Sacred Text (Traditional Arabic):** Verses must be set 20% larger than the surrounding UI text to honor their importance, using `secondary` (Gold) or `primary` (Emerald) tones.

The hierarchy should feel intentional: large, airy headlines followed by generous `spacing-10` before body copy begins.

---

## 4. Elevation & Depth
Depth is a feeling, not a shadow.

*   **The Layering Principle:** Achieve "lift" by stacking. Place a `surface-container-lowest` card on a `surface-container-low` section. The subtle shift in beige-to-white is more premium than a heavy shadow.
*   **Ambient Shadows:** When a card must "float" (e.g., a Quick-Action menu), use a shadow color tinted with the primary hue: `rgba(6, 78, 59, 0.06)` with a `blur: 40px` and `y: 12px`. Never use pure black or grey.
*   **The "Ghost Border" Fallback:** If accessibility requires a stroke (e.g., in Dark Mode), use `outline-variant` at **15% opacity**. It should be felt, not seen.
*   **Roundedness:** Use the `xl` (3rem) scale for main containers and `md` (1.5rem) for internal elements. This "nested rounding" reinforces the organic, spiritual personality.

---

## 5. Components

### Buttons
*   **Primary:** `primary-container` background, `on-primary` text. Use `rounded-full` (9999px) for a soft, pill-shaped feel.
*   **Secondary (Gold):** `secondary-fixed` background. Reserved only for high-status actions (e.g., "Donate," "Go Premium").
*   **Tertiary:** No background. Use `title-sm` typography in `primary` color with `spacing-2` horizontal padding.

### Cards & Lists
*   **Forbid dividers.** To separate list items, use a `surface-container` background shift or a vertical gap of `spacing-4`.
*   **Verses/Quotes:** Center-aligned, using `surface-container-highest` as a subtle background "halo" to give the text its own sacred space.

### Chips (Taqwa Tags)
*   Use `rounded-md` (1.5rem). Background: `surface-variant`. Text: `on-surface-variant`. These should feel like small, smooth stones.

### Inputs
*   Use `surface-container-low` for the field background. No bottom line. On focus, the background shifts to `surface-container-highest` with a "Ghost Border" of `primary` at 20%.

### Specialized Component: The Qibla Compass / Progress Ring
*   Use a dual-tone stroke: `primary` for the active path and `surface-container-highest` for the track. Apply a subtle "glow" using an ambient shadow of the same color.

---

## 6. Do's and Don'ts

### Do
*   **Do use asymmetrical margins.** Allow an image or a decorative geometric pattern to bleed off the right side of the screen while keeping text aligned to the left grid.
*   **Do prioritize "Negative Space."** If a screen feels crowded, remove a decorative element before you shrink the text.
*   **Do use "Spiritual Micro-interactions."** Buttons should have a soft, slow fade-in (300ms) rather than a snappy "tech" feel.

### Don't
*   **Don't use 100% black.** Even in Dark Mode, use `deep charcoal` and `emerald` tints. Pure black is too harsh for a "Sanctuary."
*   **Don't use sharp corners.** Everything must have at least a `sm` (0.5rem) radius. Sharpness interrupts the flow of calm.
*   **Don't use standard icons.** Use "thin-stroke" (1.5px) or "duotone" icons that match the Manrope typeface's weight. Avoid heavy, filled-in "material" icons.