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
import { usePrayerTrackerStore } from '../store/prayerTrackerStore';
import type { PrayerTimingsDay } from './prayerTimesApi';
import {
  showAndroidCustomPrayerNotification,
  type SazdaNotificationVariant,
} from '../native/sazdaCustomNotificationAndroid';
import { getIOSNotificationSoundFilename } from '../constants/adhanBuiltInSounds';
import type { CustomSound } from '../store/adhanSettingsStore';
import { ensureGeneralNotificationChannel } from './notifications/channels';

/** Adhan audio — fires after prayer time + configured delay. */
function notificationIdAdhan(prayer: FiveDailyPrayer): string {
  return `sazda-adhan-${prayer}`;
}

/** System default sound — fires after Adhan + reminder delay, only if not marked prayed (reschedule drops when done). */
function notificationIdFollowUp(prayer: FiveDailyPrayer): string {
  return `sazda-adhan-followup-${prayer}`;
}

function buildIosSoundForAdhan(
  volumeMode: 'LOUD' | 'SOFT' | 'SILENT',
  soundId: string,
  customSounds: CustomSound[],
): string | undefined {
  if (volumeMode === 'SILENT') return undefined;
  if (soundId === 'default') return 'default';
  const customSound = customSounds.find(c => c.id === soundId);
  if (customSound?.uri) {
    return customSound.uri.split('/').pop() || 'default';
  }
  return getIOSNotificationSoundFilename(soundId) ?? 'default';
}

/** Adhan notification copy (custom Adhan sound only). */
export function buildAdhanNotificationCopy(
  prayer: FiveDailyPrayer,
  timingsHhmm: string,
  adhanDelayMinutes: number,
): { meta: string; headline: string; detail: string } {
  const atLabel = formatHhmmTo12h(timingsHhmm);
  const meta = 'SAZDA • ADHAN';
  const headline = `${prayer}`;
  const detail =
    adhanDelayMinutes === 0
      ? `Prayer time begins at ${atLabel}.`
      : `${adhanDelayMinutes} min after prayer began (${atLabel}).`;
  return { meta, headline, detail };
}

/** Follow-up reminder — system default sound only. */
export function buildFollowUpNotificationCopy(prayer: FiveDailyPrayer): {
  meta: string;
  headline: string;
  detail: string;
} {
  return {
    meta: 'SAZDA • REMINDER',
    headline: `Still time for ${prayer}`,
    detail: 'If you have not prayed yet, this is a gentle reminder.',
  };
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

/**
 * Adhan / prayer-time notifications ONLY. Custom sound + high importance.
 * Do not use for follow-up reminders.
 */
export async function getOrCreateAdhanChannel(
  soundId: string,
  volumeMode: 'LOUD' | 'SOFT' | 'SILENT',
  vibrationEnabled: boolean,
): Promise<string> {
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

  const id = `sazda2-adhan-${soundId}-${volumeMode.toLowerCase()}`;
  const legacyId = `sazda-adhan-${soundId}-${volumeMode.toLowerCase()}`;
  let soundPath = 'default';

  if (soundId !== 'default') {
    const customSound = useAdhanSettingsStore.getState().customSounds.find(c => c.id === soundId);
    if (customSound && customSound.uri) {
      soundPath = customSound.uri;
    } else {
      soundPath = soundId;
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
    bypassDnd: volumeMode === 'LOUD',
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

/** Next local occurrence of prayer clock time (today or a future day), strictly after now. */
function nextPrayerWallTimeMs(h: number, m: number): number {
  const now = Date.now();
  const d = new Date();
  d.setHours(h, m, 0, 0);
  d.setMilliseconds(0);
  while (d.getTime() <= now) {
    d.setDate(d.getDate() + 1);
  }
  return d.getTime();
}

function todaysDateKeyYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

export async function cancelAllAdhanReminders(): Promise<void> {
  for (const p of FIVE_DAILY_PRAYERS) {
    try {
      await notifee.cancelTriggerNotification(notificationIdAdhan(p));
      await notifee.cancelTriggerNotification(notificationIdFollowUp(p));
      await notifee.cancelTriggerNotification(`sazda-salah-${p}`);
    } catch {
      /* legacy ids */
    }
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
  const channelId = await ensureGeneralNotificationChannel(state.vibrationEnabled);

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
 * Schedules:
 * 1) Adhan — only after prayer time + adhanDelay (custom Adhan sound).
 * 2) Follow-up — adhan time + reminderDelay, default sound, only if prayer not marked completed (skipped on reschedule when done).
 */
export async function rescheduleAdhanReminders(timings: PrayerTimingsDay): Promise<void> {
  await cancelAllAdhanReminders();

  const state = useAdhanSettingsStore.getState();
  if (!state.masterEnabled) return;

  const prStore = usePrayerReminderStore.getState();
  const prayerEnabled = prStore.byPrayer;
  const followUpEnabled = prStore.followUpByPrayer;
  const reminderDelayMs = prStore.reminderDelayMinutes * 60_000;
  const adhanDelayMs = state.adhanDelayMinutes * 60_000;

  const dateKey = todaysDateKeyYmd();

  for (const prayer of FIVE_DAILY_PRAYERS) {
    if (!prayerEnabled[prayer]) continue;

    const parsed = parseHhMm(timings[prayer]);
    if (!parsed) continue;

    const pSettings = state.byPrayer[prayer];
    const channelAdhan = await getOrCreateAdhanChannel(
      pSettings.soundId,
      pSettings.volumeMode,
      state.vibrationEnabled,
    );
    const iosAdhanSound = buildIosSoundForAdhan(pSettings.volumeMode, pSettings.soundId, state.customSounds);

    const prayerStartMs = nextPrayerWallTimeMs(parsed.h, parsed.m);
    const adhanTs = prayerStartMs + adhanDelayMs;

    const { meta, headline, detail } = buildAdhanNotificationCopy(
      prayer,
      timings[prayer],
      state.adhanDelayMinutes,
    );

    await notifee.createTriggerNotification(
      {
        id: notificationIdAdhan(prayer),
        title: headline,
        subtitle: meta,
        body: detail,
        android: {
          channelId: channelAdhan,
          category: AndroidCategory.ALARM,
          pressAction: { id: 'default' },
          style: adhanAndroidStyle(meta, headline, detail),
        },
        ios: {
          ...(iosAdhanSound ? { sound: iosAdhanSound } : {}),
          interruptionLevel: pSettings.volumeMode === 'LOUD' ? 'timeSensitive' : 'active',
        },
      },
      {
        type: TriggerType.TIMESTAMP,
        timestamp: adhanTs,
        repeatFrequency: RepeatFrequency.DAILY,
      },
    );

    const completed = usePrayerTrackerStore.getState().byDay[dateKey]?.[prayer] === 'prayed';
    if (followUpEnabled[prayer] && !completed) {
      const followUpTs = adhanTs + reminderDelayMs;
      const generalChannel = await ensureGeneralNotificationChannel(state.vibrationEnabled);
      const f = buildFollowUpNotificationCopy(prayer);

      await notifee.createTriggerNotification(
        {
          id: notificationIdFollowUp(prayer),
          title: f.headline,
          subtitle: f.meta,
          body: f.detail,
          android: {
            channelId: generalChannel,
            category: AndroidCategory.REMINDER,
            pressAction: { id: 'default' },
            style: adhanAndroidStyle(f.meta, f.headline, f.detail),
          },
          ios: {
            sound: 'default',
            interruptionLevel: 'active',
          },
        },
        {
          type: TriggerType.TIMESTAMP,
          timestamp: followUpTs,
          repeatFrequency: RepeatFrequency.DAILY,
        },
      );
    }
  }
}

/** Immediate on-screen test (Adhan channel + sound only). */
export async function sendTestAdhanNotification(prayer: FiveDailyPrayer = 'Fajr'): Promise<void> {
  const state = useAdhanSettingsStore.getState();
  const pSettings = state.byPrayer[prayer];
  const sampleTime = '05:30';
  const { meta, headline, detail } = buildAdhanNotificationCopy(prayer, sampleTime, state.adhanDelayMinutes);

  const channelId = await getOrCreateAdhanChannel(pSettings.soundId, pSettings.volumeMode, state.vibrationEnabled);
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

/** One-off scheduled Adhan test in `seconds` (no repeat). */
export async function scheduleTestAdhanInSeconds(secondsFromNow: number, prayer: FiveDailyPrayer = 'Fajr'): Promise<void> {
  const state = useAdhanSettingsStore.getState();
  const pSettings = state.byPrayer[prayer];
  const sampleTime = '05:30';
  const { meta, headline, detail } = buildAdhanNotificationCopy(prayer, sampleTime, state.adhanDelayMinutes);

  const channelId = await getOrCreateAdhanChannel(pSettings.soundId, pSettings.volumeMode, state.vibrationEnabled);
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
