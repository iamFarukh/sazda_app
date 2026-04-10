import notifee, { AndroidCategory, TriggerType } from '@notifee/react-native';
import { Platform } from 'react-native';
import dayjs from 'dayjs';
import { PRECOMPUTED_RAMADAN_DATES, checkIsRamadanLocal } from '../theme/islamicThemeConfig';
import { ANDROID_CHANNEL_GENERAL_ID } from '../constants/notificationChannels';
import { ensureGeneralNotificationChannel, ensureRamadanNotificationChannel } from './notifications/channels';
import type { PrayerTimingsDay } from './prayerTimesApi';
import { useAdhanSettingsStore } from '../store/adhanSettingsStore';
import { useGeneralNotificationSettingsStore } from '../store/generalNotificationSettingsStore';
import { FIVE_DAILY_PRAYERS } from '../store/prayerTrackerStore';
import { usePrayerTrackerStore } from '../store/prayerTrackerStore';

/** Stable trigger IDs — cancel before reschedule to avoid duplicates. */
export const GENERAL_TRIGGER_IDS = {
  streak: 'sazda-gen-streak',
  quran: 'sazda-gen-quran',
  ramadanSuhoor: 'sazda-ramadan-suhoor',
  ramadanIftar: 'sazda-ramadan-iftar',
  ramadanLaylat: 'sazda-ramadan-laylat',
} as const;

function parseHhMm(hhmm: string): { h: number; m: number } | null {
  const raw = hhmm.trim().split(/\s+/)[0];
  const [a, b] = raw.split(':');
  const h = Number(a);
  const m = Number(b);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return { h, m };
}

/** Next local fire time at `h:m` (today or tomorrow) strictly after `now`. */
function nextWallClockAfterNow(h: number, m: number, second = 0): number {
  const now = Date.now();
  const d = new Date();
  d.setHours(h, m, second, 0);
  while (d.getTime() <= now) {
    d.setDate(d.getDate() + 1);
  }
  return d.getTime();
}

/** Next fire for “minutes before” anchor time from today’s timings (recomputed daily). */
function nextMinutesBeforeAnchor(timings: PrayerTimingsDay, anchor: keyof PrayerTimingsDay, beforeMin: number): number | null {
  const parsed = parseHhMm(timings[anchor]);
  if (!parsed) return null;
  const d = new Date();
  d.setHours(parsed.h, parsed.m, 0, 0);
  d.setMilliseconds(0);
  d.setTime(d.getTime() - beforeMin * 60_000);
  const now = Date.now();
  while (d.getTime() <= now) {
    d.setDate(d.getDate() + 1);
  }
  return d.getTime();
}

function isLastTenNightsOfRamadan(date: Date): boolean {
  const t = date.getTime();
  for (const block of PRECOMPUTED_RAMADAN_DATES) {
    const start = new Date(`${block.start}T00:00:00`).getTime();
    const end = new Date(`${block.end}T23:59:59`).getTime();
    if (t < start || t > end) continue;
    const endNoon = new Date(`${block.end}T12:00:00`);
    const daysLeft = Math.ceil((endNoon.getTime() - date.getTime()) / 86_400_000);
    return daysLeft <= 10 && daysLeft >= 1;
  }
  return false;
}

function allFivePrayedForDateKey(dateKey: string): boolean {
  const log = usePrayerTrackerStore.getState().byDay[dateKey];
  if (!log) return false;
  return FIVE_DAILY_PRAYERS.every(p => log[p] === 'prayed');
}

async function scheduleOneShotDefaultSound(params: {
  id: string;
  title: string;
  subtitle: string;
  body: string;
  timestamp: number;
  channelId: string;
}): Promise<void> {
  await notifee.createTriggerNotification(
    {
      id: params.id,
      title: params.title,
      subtitle: params.subtitle,
      body: params.body,
      android: {
        channelId: params.channelId,
        category: AndroidCategory.REMINDER,
        pressAction: { id: 'default' },
      },
      ios: {
        sound: 'default',
        interruptionLevel: 'active',
      },
    },
    {
      type: TriggerType.TIMESTAMP,
      timestamp: params.timestamp,
    },
  );
}

export async function cancelGeneralAndSeasonalReminders(): Promise<void> {
  for (const id of Object.values(GENERAL_TRIGGER_IDS)) {
    try {
      await notifee.cancelTriggerNotification(id);
    } catch {
      /* id may not exist */
    }
  }
}

/**
 * Schedules non-Adhan reminders: streak (evening), optional Quran time, optional Ramadan.
 * Uses system default sound only. Safe to call after prayer times refresh.
 */
export async function rescheduleGeneralAndSeasonalReminders(timings: PrayerTimingsDay | null): Promise<void> {
  await cancelGeneralAndSeasonalReminders();

  const vibr = useAdhanSettingsStore.getState().vibrationEnabled;
  const gen = useGeneralNotificationSettingsStore.getState();

  const generalChannel =
    Platform.OS === 'android' ? await ensureGeneralNotificationChannel(vibr) : ANDROID_CHANNEL_GENERAL_ID;
  const ramadanChannel =
    Platform.OS === 'android' ? await ensureRamadanNotificationChannel(vibr) : generalChannel;

  const todayKey = dayjs().format('YYYY-MM-DD');

  // —— Streak (single quiet nudge, ~9:10 PM local if today’s five not all marked prayed) ——
  if (gen.streakReminderEnabled) {
    if (!allFivePrayedForDateKey(todayKey)) {
      const ts = nextWallClockAfterNow(21, 10, 0);
      await scheduleOneShotDefaultSound({
        id: GENERAL_TRIGGER_IDS.streak,
        title: 'Prayer streak',
        subtitle: 'Sazda',
        body: 'When you can, complete today’s prayers to keep your streak.',
        timestamp: ts,
        channelId: generalChannel,
      });
    }
  }

  // —— Quran reading ——
  if (gen.quranReminderEnabled) {
    const ts = nextWallClockAfterNow(gen.quranReminderHour, gen.quranReminderMinute, 0);
    await scheduleOneShotDefaultSound({
      id: GENERAL_TRIGGER_IDS.quran,
      title: 'Quran',
      subtitle: 'Sazda',
      body: 'A few minutes with the Quran can brighten the day.',
      timestamp: ts,
      channelId: generalChannel,
    });
  }

  // —— Ramadan (requires timings + local Ramadan window) ——
  if (!gen.ramadanNotificationsEnabled || !timings || !checkIsRamadanLocal(new Date())) {
    return;
  }

  const suhoorTs = nextMinutesBeforeAnchor(timings, 'Fajr', gen.suhoorOffsetMinutes);
  if (suhoorTs) {
    await scheduleOneShotDefaultSound({
      id: GENERAL_TRIGGER_IDS.ramadanSuhoor,
      title: 'Suhoor',
      subtitle: 'Ramadan',
      body: `About ${gen.suhoorOffsetMinutes} minutes before Fajr — time to close if you’re fasting.`,
      timestamp: suhoorTs,
      channelId: ramadanChannel,
    });
  }

  const iftarTs = nextMinutesBeforeAnchor(timings, 'Maghrib', gen.iftarOffsetMinutes);
  if (iftarTs) {
    await scheduleOneShotDefaultSound({
      id: GENERAL_TRIGGER_IDS.ramadanIftar,
      title: 'Iftar soon',
      subtitle: 'Ramadan',
      body: `About ${gen.iftarOffsetMinutes} minutes before Maghrib.`,
      timestamp: iftarTs,
      channelId: ramadanChannel,
    });
  }

  if (gen.lastTenNightsReminderEnabled && isLastTenNightsOfRamadan(new Date())) {
    const ts = nextWallClockAfterNow(21, 30, 0);
    await scheduleOneShotDefaultSound({
      id: GENERAL_TRIGGER_IDS.ramadanLaylat,
      title: 'Blessed nights',
      subtitle: 'Ramadan',
      body: 'The last nights of Ramadan are a good time for extra dua and reflection.',
      timestamp: ts,
      channelId: ramadanChannel,
    });
  }
}
