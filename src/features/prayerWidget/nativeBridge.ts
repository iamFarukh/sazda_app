import { NativeModules } from 'react-native';

type NativePrayerWidget = {
  setSnapshot: (json: string) => void;
};

/**
 * Writes the latest JSON snapshot for iOS WidgetKit / Android home widgets.
 * Safe no-op if the native module is not linked yet.
 */
export function pushPrayerWidgetSnapshotToNative(json: string): void {
  try {
    const mod = NativeModules.PrayerWidgetModule as NativePrayerWidget | undefined;
    mod?.setSnapshot?.(json);
  } catch {
    /* optional */
  }
}
