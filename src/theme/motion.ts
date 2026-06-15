import { Easing } from 'react-native-reanimated';

/** Shared motion tokens for Reanimated screens (Phase 2 polish). */
export const motionDurations = {
  heroAmbientMs: 640,
  heroCrossfadeMs: 520,
  skeletonPulseMs: 1200,
} as const;

export const motionEasing = {
  standardOut: Easing.out(Easing.cubic),
  emphasizedOut: Easing.out(Easing.exp),
} as const;
