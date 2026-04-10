import notifee, { AndroidImportance, AndroidVisibility } from '@notifee/react-native';
import { Platform } from 'react-native';
import { ANDROID_CHANNEL_GENERAL_ID, ANDROID_CHANNEL_RAMADAN_ID } from '../../constants/notificationChannels';

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
