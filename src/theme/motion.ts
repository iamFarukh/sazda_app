import { Easing, ReduceMotion } from 'react-native-reanimated';
import type { WithSpringConfig } from 'react-native-reanimated';

/**
 * Centralized motion tokens. One source of truth for durations, easings, and spring
 * physics so every animation across the app feels like it belongs to the same hand.
 *
 * Tone: Sazda is a calm, spiritual app — motion is gentle and confident, never bouncy
 * or playful. Springs are tuned with higher damping than typical UI kits to keep
 * overshoot minimal and the feel composed.
 */

export const motionDurations = {
  /** Instant — used as the reduce-motion fallback. */
  instant: 0,
  /** Snappy UI feedback (press, toggle). */
  fast: 140,
  /** Standard enter / state change. */
  base: 220,
  /** Larger moves, content reveals. */
  slow: 320,
  /** Emphasized / ambient transitions. */
  slower: 480,

  // --- Existing tokens kept for back-compat with hero & skeleton screens ---
  heroAmbientMs: 640,
  heroCrossfadeMs: 520,
  skeletonPulseMs: 1200,
} as const;

export const motionEasing = {
  /** Decelerate — the default for things entering / settling. */
  standardOut: Easing.out(Easing.cubic),
  /** Emphasized decelerate — snappier arrival. */
  emphasizedOut: Easing.out(Easing.exp),
  /** Symmetric ease — for loops and reversible transitions. */
  standardInOut: Easing.inOut(Easing.cubic),
  /** Soft sinusoidal — breathing / pulsing loops (skeletons, ambient). */
  inOutSine: Easing.inOut(Easing.sin),
} as const;

/**
 * Spring presets — use these instead of guessing damping/stiffness per component.
 * Deliberately calmer than generic kits (higher damping = less overshoot).
 */
export const springs = {
  /** Fast, no overshoot — press feedback on buttons/cards. */
  press: { damping: 26, stiffness: 380, mass: 0.5 } as WithSpringConfig,
  /** Snappy UI responses. */
  snappy: { damping: 22, stiffness: 300, mass: 0.6 } as WithSpringConfig,
  /** Balanced default for most transitions. */
  standard: { damping: 20, stiffness: 200, mass: 0.8 } as WithSpringConfig,
  /** Heavy, grounded — sheets, modals, large surfaces. */
  heavy: { damping: 24, stiffness: 180, mass: 1.1 } as WithSpringConfig,
  /** Gentle — content fades and large repositioning. */
  gentle: { damping: 26, stiffness: 130, mass: 1 } as WithSpringConfig,
  /** Restrained delight — success/celebration, calm overshoot only. */
  delight: { damping: 15, stiffness: 220, mass: 0.7 } as WithSpringConfig,
} as const;

export type SpringPreset = keyof typeof springs;

/** Re-export so callers can pass a reduce-motion-aware config to with* helpers. */
export { ReduceMotion };
