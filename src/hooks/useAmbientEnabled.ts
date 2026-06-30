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
