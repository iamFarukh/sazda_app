import { useCallback, useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { usePrayerReminderStore } from '../../store/prayerReminderStore';
import { useAdhanSettingsStore } from '../../store/adhanSettingsStore';
import { fetchPrayerTimings } from '../../services/prayerTimesApi';
import { cancelAllAdhanReminders, rescheduleAdhanReminders } from '../../services/prayerReminders';
import { useSimpleGeolocation } from '../../hooks/useSimpleGeolocation';

/**
 * On app foreground (and mount), refresh scheduled salah reminders using latest API times.
 * Avoids drift from repeating triggers vs shifting prayer times.
 */
export function PrayerReminderAppStateSync() {
  const { coords } = useSimpleGeolocation();
  const dateKey = dayjs().format('DD-MM-YYYY');
  const masterEnabled = useAdhanSettingsStore(s => s.masterEnabled);
  const preReminderEnabled = useAdhanSettingsStore(s => s.preReminderEnabled);
  const byPrayer = usePrayerReminderStore(s => s.byPrayer);

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
        return;
      }
      await rescheduleAdhanReminders(todayTimings);
    } catch {
      /* native / permission */
    }
  }, [todayTimings, masterEnabled, preReminderEnabled, byPrayer]);

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
