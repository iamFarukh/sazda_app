# Lottie animations

Used through `AppLottie` (`src/components/atoms/AppLottie/AppLottie.tsx`), which always
degrades gracefully: if a slot has no file, the caller's `fallback` (an icon/illustration)
renders instead, and Reduce Motion shows the fallback or a paused frame. So screens are
never blank, and you can drop in premium animations incrementally.

## Slots (recommended)

| File | Where it's used | Suggested look |
|------|-----------------|----------------|
| `pulse.json` ✅ included | ambient loading / "working" moments | calm emerald radar ping |
| `success.json` | sign-in success, payment saved, goal reached | gentle check / bloom |
| `empty-search.json` | no search results (Quran, Duas) | quiet magnifier |
| `empty-bookmarks.json` | no bookmarks yet | bookmark/ribbon |
| `offline.json` | no internet | soft cloud-off |
| `prayer.json` | prayer reminder / between-prayers | crescent / lantern |

## Guidelines (keep it calm & premium)

- Prefer **lightweight** JSON (< ~50 KB). Avoid heavy image-embedded Lotties.
- Match the brand: emerald `#006F4C` / gold `#D4AF37`, gentle easing, **no bouncy/playful** motion.
- Loop only ambient states; play **once** for success/celebration.
- Source licensed files from LottieFiles (check commercial license) or export from After Effects via Bodymovin.

## Adding one

```tsx
import success from '../../assets/lottie/success.json';
<AppLottie source={success} loop={false} size={140} fallback={<CheckCircle2 ... />} />
```
