import notifee, {
  AndroidImportance,
  AuthorizationStatus,
  RepeatFrequency,
  TriggerType,
  AndroidVisibility,
  AndroidCategory,
  AndroidStyle,
} from '@notifee/react-native';
import { PermissionsAndroid, Platform } from 'react-native';
import { FIVE_DAILY_PRAYERS, type FiveDailyPrayer } from '../store/prayerTrackerStore';
import { formatHhmmTo12h } from '../utils/prayerTimesDisplay';
import { useAdhanSettingsStore } from '../store/adhanSettingsStore';
import { usePrayerReminderStore } from '../store/prayerReminderStore';
import type { PrayerTimingsDay } from './prayerTimesApi';
import {
  showAndroidCustomPrayerNotification,
  type SazdaNotificationVariant,
} from '../native/sazdaCustomNotificationAndroid';
import { getIOSNotificationSoundFilename } from '../constants/adhanBuiltInSounds';
import type { CustomSound } from '../store/adhanSettingsStore';

/** Fires at salah − 10m when pre-reminder is on (prepare / adhan-style heads-up). */
function notificationIdLead(prayer: FiveDailyPrayer): string {
  return `sazda-adhan-${prayer}`;
}

/** Fires at exact salah when pre-reminder is on; unused when pre-reminder is off. */
function notificationIdAtSalah(prayer: FiveDailyPrayer): string {
  return `sazda-salah-${prayer}`;
}

function buildIosSoundForAdhan(
  volumeMode: 'LOUD' | 'SOFT' | 'SILENT',
  soundId: string,
  customSounds: CustomSound[],
): string | undefined {
  if (volumeMode === 'SILENT') return undefined;
  if (soundId === 'default') return 'default';
  const customSound = customSounds.find((c) => c.id === soundId);
  if (customSound?.uri) {
    return customSound.uri.split('/').pop() || 'default';
  }
  return getIOSNotificationSoundFilename(soundId) ?? 'default';
}

/** Copy aligned with Stitch notification preview (meta, headline, body). */
export function buildSazdaNotificationCopy(
  prayer: FiveDailyPrayer,
  timingsHhmm: string,
  preReminderEnabled: boolean,
): { meta: string; headline: string; detail: string } {
  const atLabel = formatHhmmTo12h(timingsHhmm);
  const meta = preReminderEnabled ? 'SAZDA • REMINDER' : 'SAZDA • NOW';
  const headline = preReminderEnabled
    ? `${prayer} in 10 minutes`
    : `${prayer} Time - ${atLabel}`;
  const detail = preReminderEnabled
    ? `Prepare for your prayer. Begins at ${atLabel}.`
    : `It is time for ${prayer} prayer.`;
  return { meta, headline, detail };
}

function adhanAndroidStyle(meta: string, headline: string, detail: string) {
  return {
    type: AndroidStyle.INBOX as const,
    lines: [meta, headline, detail],
    title: headline,
    summary: meta,
  };
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    if (result !== PermissionsAndroid.RESULTS.GRANTED) {
      return false;
    }
  }
  const settings = await notifee.requestPermission();
  return (
    settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
    settings.authorizationStatus === AuthorizationStatus.PROVISIONAL
  );
}

// Android channel generation based on sound and volume mode
async function getOrCreateChannel(soundId: string, volumeMode: 'LOUD' | 'SOFT' | 'SILENT', vibrationEnabled: boolean): Promise<string> {
  if (Platform.OS !== 'android') return 'default';

  if (volumeMode === 'SILENT') {
    const id = 'sazda2-adhan-silent';
    try {
      await notifee.deleteChannel('sazda-adhan-silent');
    } catch {
      /* no-op */
    }
    await notifee.createChannel({
      id,
      name: 'Silent Adhan Alerts',
      importance: AndroidImportance.DEFAULT,
      sound: undefined,
      vibration: vibrationEnabled,
      visibility: AndroidVisibility.PUBLIC,
    });
    return id;
  }

  // New id prefix whenever raw sounds / rules change — Android channel sound cannot be updated in place.
  const id = `sazda2-adhan-${soundId}-${volumeMode.toLowerCase()}`;
  const legacyId = `sazda-adhan-${soundId}-${volumeMode.toLowerCase()}`;
  let soundPath = 'default';

  if (soundId !== 'default') {
    const customSound = useAdhanSettingsStore.getState().customSounds.find(c => c.id === soundId);
    if (customSound && customSound.uri) {
      soundPath = customSound.uri; // file://...
    } else {
      soundPath = soundId; // raw basename without extension, e.g. makkah, fajar, adan_tune
    }
  }

  try {
    await notifee.deleteChannel(legacyId);
  } catch {
    /* no-op */
  }

  await notifee.createChannel({
    id,
    name: `Adhan Alerts (${soundId})`,
    importance: AndroidImportance.HIGH,
    sound: soundPath,
    vibration: vibrationEnabled,
    visibility: AndroidVisibility.PUBLIC,
    bypassDnd: volumeMode === 'LOUD', // Loud skips DND
  });

  return id;
}

function parseHhMm(hhmm: string): { h: number; m: number } | null {
  const raw = hhmm.trim().split(/\s+/)[0];
  const [a, b] = raw.split(':');
  const h = Number(a);
  const m = Number(b);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return { h, m };
}

/** Next local trigger time for salah at `h:m`, shifted earlier by `subtractMs` (e.g. 10 min for pre-adhan). */
function nextSalahTriggerMs(h: number, m: number, subtractMs: number): number {
  const now = Date.now();
  const d = new Date();
  d.setHours(h, m, 0, 0);
  d.setMilliseconds(0);
  d.setTime(d.getTime() - subtractMs);
  while (d.getTime() <= now) {
    d.setDate(d.getDate() + 1);
  }
  return d.getTime();
}

export async function cancelAllAdhanReminders(): Promise<void> {
  for (const p of FIVE_DAILY_PRAYERS) {
    try {
      await notifee.cancelTriggerNotification(notificationIdLead(p));
      await notifee.cancelTriggerNotification(notificationIdAtSalah(p));
    } catch {}
  }
}

/** One-time welcome after enabling notifications — uses default channel, not alarm category. */
export async function displayWelcomeContextNotification(payload: {
  meta: string;
  headline: string;
  detail: string;
  variant: SazdaNotificationVariant;
}): Promise<void> {
  const state = useAdhanSettingsStore.getState();
  const nid = `sazda-welcome-context-${Date.now()}`;
  const channelId = await getOrCreateChannel('default', 'LOUD', state.vibrationEnabled);

  const usedNative = await showAndroidCustomPrayerNotification({
    id: nid,
    channelId,
    meta: payload.meta,
    headline: payload.headline,
    body: payload.detail,
    variant: payload.variant,
  });
  if (usedNative) {
    return;
  }

  await notifee.displayNotification({
    id: nid,
    title: payload.headline,
    subtitle: payload.meta,
    body: payload.detail,
    android: {
      channelId,
      category: AndroidCategory.REMINDER,
      pressAction: { id: 'default' },
      style: adhanAndroidStyle(payload.meta, payload.headline, payload.detail),
    },
    ios: {
      sound: 'default',
      interruptionLevel: 'active',
    },
  });
}

/**
 * Schedules daily salah alerts from API times.
 * - Pre-reminder ON: notify at salah−10m (prepare before adhan/salah), then again at exact salah.
 * - Pre-reminder OFF: single notify at exact salah only.
 */
export async function rescheduleAdhanReminders(timings: PrayerTimingsDay): Promise<void> {
  await cancelAllAdhanReminders();

  const state = useAdhanSettingsStore.getState();
  if (!state.masterEnabled) return;

  const reminderPrefs = usePrayerReminderStore.getState().byPrayer;

  for (const prayer of FIVE_DAILY_PRAYERS) {
    if (!reminderPrefs[prayer]) {
      continue;
    }
    const pSettings = state.byPrayer[prayer];

    const parsed = parseHhMm(timings[prayer]);
    if (!parsed) continue;

    const channelId = await getOrCreateChannel(pSettings.soundId, pSettings.volumeMode, state.vibrationEnabled);
    const iosSound = buildIosSoundForAdhan(pSettings.volumeMode, pSettings.soundId, state.customSounds);

    const scheduleOne = async (
      id: string,
      timestamp: number,
      preReminderStyle: boolean,
    ) => {
      const { meta, headline, detail } = buildSazdaNotificationCopy(
        prayer,
        timings[prayer],
        preReminderStyle,
      );
      await notifee.createTriggerNotification(
        {
          id,
          title: headline,
          subtitle: meta,
          body: detail,
          android: {
            channelId,
            category: AndroidCategory.ALARM,
            pressAction: { id: 'default' },
            style: adhanAndroidStyle(meta, headline, detail),
          },
          ios: {
            ...(iosSound ? { sound: iosSound } : {}),
            interruptionLevel: pSettings.volumeMode === 'LOUD' ? 'timeSensitive' : 'active',
          },
        },
        {
          type: TriggerType.TIMESTAMP,
          timestamp,
          repeatFrequency: RepeatFrequency.DAILY,
        },
      );
    };

    if (state.preReminderEnabled) {
      const leadTs = nextSalahTriggerMs(parsed.h, parsed.m, 10 * 60_000);
      const atTs = nextSalahTriggerMs(parsed.h, parsed.m, 0);
      await scheduleOne(notificationIdLead(prayer), leadTs, true);
      await scheduleOne(notificationIdAtSalah(prayer), atTs, false);
    } else {
      const atTs = nextSalahTriggerMs(parsed.h, parsed.m, 0);
      await scheduleOne(notificationIdLead(prayer), atTs, false);
    }
  }
}

/** Immediate on-screen test (same channels/sounds as real alerts). */
export async function sendTestAdhanNotification(
  prayer: FiveDailyPrayer = 'Fajr',
  kind: 'lead' | 'atSalah' = 'lead',
): Promise<void> {
  const state = useAdhanSettingsStore.getState();
  const pSettings = state.byPrayer[prayer];
  const sampleTime = '05:30';
  const preStyle = kind === 'lead';
  const { meta, headline, detail } = buildSazdaNotificationCopy(prayer, sampleTime, preStyle);

  const channelId = await getOrCreateChannel(pSettings.soundId, pSettings.volumeMode, state.vibrationEnabled);
  const iosSound = buildIosSoundForAdhan(pSettings.volumeMode, pSettings.soundId, state.customSounds);

  const usedNative = await showAndroidCustomPrayerNotification({
    id: `sazda-test-${Date.now()}`,
    channelId,
    meta,
    headline,
    body: detail,
    variant: 'prayer',
  });
  if (usedNative) {
    return;
  }

  await notifee.displayNotification({
    id: `sazda-test-${Date.now()}`,
    title: headline,
    subtitle: meta,
    body: detail,
    android: {
      channelId,
      category: AndroidCategory.ALARM,
      pressAction: { id: 'default' },
      style: adhanAndroidStyle(meta, headline, detail),
    },
    ios: {
      ...(iosSound ? { sound: iosSound } : {}),
      interruptionLevel: pSettings.volumeMode === 'LOUD' ? 'timeSensitive' : 'active',
    },
  });
}

/** One-off scheduled notification in `seconds` (no repeat) — good for device testing. */
export async function scheduleTestAdhanInSeconds(
  secondsFromNow: number,
  prayer: FiveDailyPrayer = 'Fajr',
  kind: 'lead' | 'atSalah' = 'atSalah',
): Promise<void> {
  const state = useAdhanSettingsStore.getState();
  const pSettings = state.byPrayer[prayer];
  const sampleTime = '05:30';
  const preStyle = kind === 'lead';
  const { meta, headline, detail } = buildSazdaNotificationCopy(prayer, sampleTime, preStyle);

  const channelId = await getOrCreateChannel(pSettings.soundId, pSettings.volumeMode, state.vibrationEnabled);
  const iosSound = buildIosSoundForAdhan(pSettings.volumeMode, pSettings.soundId, state.customSounds);
  const id = `sazda-test-trigger-${Date.now()}`;

  await notifee.createTriggerNotification(
    {
      id,
      title: headline,
      subtitle: meta,
      body: `${detail} (test in ${secondsFromNow}s)`,
      android: {
        channelId,
        category: AndroidCategory.ALARM,
        pressAction: { id: 'default' },
        style: adhanAndroidStyle(meta, headline, detail),
      },
      ios: {
        ...(iosSound ? { sound: iosSound } : {}),
        interruptionLevel: pSettings.volumeMode === 'LOUD' ? 'timeSensitive' : 'active',
      },
    },
    {
      type: TriggerType.TIMESTAMP,
      timestamp: Date.now() + Math.max(3, secondsFromNow) * 1000,
    },
  );
}
