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
