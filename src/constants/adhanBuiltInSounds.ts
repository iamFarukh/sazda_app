/**
 * Built-in adhan clips in assets/sounds — copied to Android res/raw and iOS bundle.
 * Android Notifee expects raw resource names without extension (matches basename of these files).
 */
export const BUILTIN_ADHAN_BUNDLE_FILES: Record<string, string> = {
  makkah: 'makkah.mp3',
  fajar: 'fajar.mp3',
  soft: 'soft.mp3',
  adan_tune: 'adan_tune.mp3',
  /** Notifications use system default; this file is only for in-app preview via react-native-sound. */
  default: 'soft.mp3',
};

/**
 * iOS only plays linear PCM / IMA4 in aiff,wav,caf for alerts — not MP3. Apple also caps at ~30s.
 * Short WAV clips (same tune, trimmed) live in assets/sounds/ios_notify/.
 */
const IOS_NOTIFY_WAV: Record<string, string> = {
  makkah: 'makkah_notify.wav',
  fajar: 'fajar_notify.wav',
  soft: 'soft_notify.wav',
  adan_tune: 'adan_tune_notify.wav',
};

export function getBuiltinAdhanBundleFile(soundId: string): string | undefined {
  return BUILTIN_ADHAN_BUNDLE_FILES[soundId];
}

/** File name in the app bundle for UNNotificationSound (must be WAV/CAF/AIF, not MP3). */
export function getIOSNotificationSoundFilename(soundId: string): string | undefined {
  if (soundId === 'default') return undefined;
  return IOS_NOTIFY_WAV[soundId];
}

/** UI labels for built-in sound ids (includes legacy `madinah` → same as classic adhan). */
export function getBuiltinAdhanDisplayName(soundId: string): string | undefined {
  switch (soundId) {
    case 'makkah':
      return 'Makkah Adhan';
    case 'fajar':
      return 'Fajr Adhan';
    case 'soft':
      return 'Soft Tone';
    case 'adan_tune':
    case 'madinah':
      return 'Classic Adhan';
    case 'default':
      return 'System default';
    default:
      return undefined;
  }
}
