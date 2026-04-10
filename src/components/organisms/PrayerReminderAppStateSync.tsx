import { useCallback, useEffect, useMemo } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { usePrayerReminderStore } from '../../store/prayerReminderStore';
import { useAdhanSettingsStore } from '../../store/adhanSettingsStore';
import { useGeneralNotificationSettingsStore } from '../../store/generalNotificationSettingsStore';
import { usePrayerTrackerStore } from '../../store/prayerTrackerStore';
import { fetchPrayerTimings } from '../../services/prayerTimesApi';
import { cancelAllAdhanReminders, rescheduleAdhanReminders } from '../../services/prayerReminders';
import { rescheduleGeneralAndSeasonalReminders } from '../../services/generalReminders';
import { useSimpleGeolocation } from '../../hooks/useSimpleGeolocation';

/**
 * On app foreground (and mount), refresh scheduled salah reminders using latest API times.
 * Also reschedules streak / Quran / Ramadan reminders (default sound only — never Adhan).
 */
export function PrayerReminderAppStateSync() {
  const { coords } = useSimpleGeolocation();
  const dateKey = dayjs().format('DD-MM-YYYY');
  const ymd = useMemo(() => dayjs().format('YYYY-MM-DD'), [dateKey]);
  const masterEnabled = useAdhanSettingsStore(s => s.masterEnabled);
  const adhanDelayKey = useAdhanSettingsStore(s => s.adhanDelayMinutes);
  const byPrayer = usePrayerReminderStore(s => s.byPrayer);
  const reminderDelayKey = usePrayerReminderStore(s => s.reminderDelayMinutes);
  const followUpKey = usePrayerReminderStore(s => JSON.stringify(s.followUpByPrayer));
  const notificationPrefsKey = useGeneralNotificationSettingsStore(
    s =>
      `${s.streakReminderEnabled}|${s.quranReminderEnabled}|${s.quranReminderHour}|${s.quranReminderMinute}|${s.ramadanNotificationsEnabled}|${s.suhoorOffsetMinutes}|${s.iftarOffsetMinutes}|${s.lastTenNightsReminderEnabled}`,
  );
  const todayPrayerMarksKey = usePrayerTrackerStore(s => JSON.stringify(s.byDay[ymd] ?? {}));

  const { data: todayTimings } = useQuery({
    queryKey: ['prayerTimes', coords?.lat, coords?.lon, dateKey, 2],
    queryFn: () => fetchPrayerTimings(coords!.lat, coords!.lon, dateKey, 2),
    enabled: !!coords,
    staleTime: 1000 * 60 * 10,
  });

  const sync = useCallback(async () => {
    try {
      if (!todayTimings || !masterEnabled) {
        await cancelAllAdhanReminders();
      } else {
        await rescheduleAdhanReminders(todayTimings);
      }
      await rescheduleGeneralAndSeasonalReminders(todayTimings ?? null);
    } catch {
      /* native / permission */
    }
  }, [
    todayTimings,
    masterEnabled,
    adhanDelayKey,
    byPrayer,
    reminderDelayKey,
    followUpKey,
    notificationPrefsKey,
    todayPrayerMarksKey,
  ]);

  useEffect(() => {
    sync();
  }, [sync]);

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === 'active') {
        sync();
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [sync]);

  return null;
}
