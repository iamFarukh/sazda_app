/**
 * Single source for the OS "Reduce Motion" accessibility setting.
 *
 * Wraps Reanimated's hook (which re-renders on change) so the whole app imports motion
 * accessibility from one place. Use it to skip/instant-ify animations, disable Lottie
 * autoplay, and render static skeletons.
 */
export { useReducedMotion as useReduceMotion } from 'react-native-reanimated';
