import { Platform, TurboModuleRegistry, Vibration } from 'react-native';

/**
 * Avoid importing `react-native-haptic-feedback` JS — it calls
 * `TurboModuleRegistry.getEnforcing('RNHapticFeedback')` at load time and
 * crashes the app when the native module isn’t linked yet.
 *
 * When pods/autolinking are set up, `get()` returns the same native module.
 */
type HapticModule = {
  trigger: (
    type: string,
    options?: {
      enableVibrateFallback?: boolean;
      ignoreAndroidSystemSettings?: boolean;
    },
  ) => void;
};

const hapticOpts = {
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

function trigger(type: string, enabled: boolean) {
  if (!enabled) return;
  const mod = getNativeHaptics();
  if (mod?.trigger) {
    try {
      mod.trigger(type, hapticOpts);
      return;
    } catch {
      /* fall through to vibration */
    }
  }
  if (Platform.OS === 'android') {
    try {
      if (type === 'notificationSuccess') {
        Vibration.vibrate([0, 30, 50, 40]);
      } else if (type === 'impactMedium') {
        Vibration.vibrate(18);
      } else {
        Vibration.vibrate(12);
      }
    } catch {
      /* ignore */
    }
  }
}

/** Single dhikr tap — soft impact. */
export function tasbeehTapLight(enabled: boolean) {
  trigger('impactLight', enabled);
}

/** Finished one phrase (33 / 33 / 34 step). */
export function tasbeehPhraseComplete(enabled: boolean) {
  trigger('impactMedium', enabled);
}

/** Finished full 33+33+34 cycle. */
export function tasbeehCycleComplete(enabled: boolean) {
  trigger('notificationSuccess', enabled);
}
