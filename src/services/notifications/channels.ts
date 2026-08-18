import notifee, { AndroidImportance, AndroidVisibility } from '@notifee/react-native';
import { Platform } from 'react-native';
import {
  ANDROID_CHANNEL_ADHAN_PREFIX,
  ANDROID_CHANNEL_GENERAL_ID,
  ANDROID_CHANNEL_PRAYER_SYSTEM_PREFIX,
  ANDROID_CHANNEL_RAMADAN_ID,
} from '../../constants/notificationChannels';

/**
 * Non-Adhan notifications only. Default notification sound, normal priority.
 * Never pass custom adhan assets here.
 */
export async function ensureGeneralNotificationChannel(vibrationEnabled: boolean): Promise<string> {
  if (Platform.OS !== 'android') {
    return ANDROID_CHANNEL_GENERAL_ID;
  }

  await notifee.createChannel({
    id: ANDROID_CHANNEL_GENERAL_ID,
    name: 'Reminders & updates',
    importance: AndroidImportance.DEFAULT,
    sound: 'default',
    vibration: vibrationEnabled,
    visibility: AndroidVisibility.PRIVATE,
  });

  return ANDROID_CHANNEL_GENERAL_ID;
}

/**
 * Seasonal (Ramadan) — same sound rules as general; separate channel so users can tune it in settings.
 */
export async function ensureRamadanNotificationChannel(vibrationEnabled: boolean): Promise<string> {
  if (Platform.OS !== 'android') {
    return ANDROID_CHANNEL_RAMADAN_ID;
  }

  await notifee.createChannel({
    id: ANDROID_CHANNEL_RAMADAN_ID,
    name: 'Ramadan (Suhoor & Iftar)',
    importance: AndroidImportance.DEFAULT,
    sound: 'default',
    vibration: vibrationEnabled,
    visibility: AndroidVisibility.PRIVATE,
  });

  return ANDROID_CHANNEL_RAMADAN_ID;
}

/**
 * Prayer-time alerts using the device default notification tone (not bundled Adhan).
 * High importance so alerts stay reliable; separate from general reminders channel.
 */
export async function ensurePrayerSystemSoundChannel(
  volumeMode: 'LOUD' | 'SOFT',
  vibrationEnabled: boolean,
): Promise<string> {
  if (Platform.OS !== 'android') {
    return ANDROID_CHANNEL_GENERAL_ID;
  }

  const id = `${ANDROID_CHANNEL_PRAYER_SYSTEM_PREFIX}-${volumeMode.toLowerCase()}`;
  const legacyIds = [
    `${ANDROID_CHANNEL_ADHAN_PREFIX}-default-${volumeMode.toLowerCase()}`,
    `sazda-adhan-default-${volumeMode.toLowerCase()}`,
  ];
  for (const legacyId of legacyIds) {
    try {
      await notifee.deleteChannel(legacyId);
    } catch {
      /* no-op */
    }
  }

  await notifee.createChannel({
    id,
    name: 'Prayer alerts (system sound)',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: vibrationEnabled,
    visibility: AndroidVisibility.PUBLIC,
    bypassDnd: volumeMode === 'LOUD',
  });

  return id;
}
