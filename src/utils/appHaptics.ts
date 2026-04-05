import { Platform, TurboModuleRegistry, Vibration } from 'react-native';

type HapticModule = {
  trigger: (
    type: string,
    options?: {
      enableVibrateFallback?: boolean;
      ignoreAndroidSystemSettings?: boolean;
    },
  ) => void;
};

const opts = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

function getNativeHaptics(): HapticModule | null {
  try {
    const mod = TurboModuleRegistry.get('RNHapticFeedback') as HapticModule | null | undefined;
    return mod ?? null;
  } catch {
    return null;
  }
}

function vibrateFallback(ms: number) {
  try {
    Vibration.vibrate(ms);
  } catch {
    /* ignore */
  }
}

/**
 * Default “medium” haptic for primary actions across the app.
 * - Uses `react-native-haptic-feedback` native module when available
 * - Falls back to light vibration if not linked yet
 */
export function hapticMedium() {
  const mod = getNativeHaptics();
  if (mod?.trigger) {
    try {
      mod.trigger('impactMedium', opts);
      return;
    } catch {
      /* fall through */
    }
  }
  // Simple cross-platform fallback (iOS may still be minimal depending on device settings).
  vibrateFallback(14);
}

/** Softer haptic for tiny UI interactions (optional). */
export function hapticLight() {
  const mod = getNativeHaptics();
  if (mod?.trigger) {
    try {
      mod.trigger('impactLight', opts);
      return;
    } catch {
      /* fall through */
    }
  }
  vibrateFallback(10);
}

/** Success haptic (used for “aligned” in Qibla, completions, etc). */
export function hapticSuccess() {
  const mod = getNativeHaptics();
  if (mod?.trigger) {
    try {
      mod.trigger('notificationSuccess', opts);
      return;
    } catch {
      /* fall through */
    }
  }
  if (Platform.OS === 'android') {
    try {
      Vibration.vibrate([0, 30, 50, 40]);
    } catch {
      /* ignore */
    }
  } else {
    vibrateFallback(20);
  }
}

