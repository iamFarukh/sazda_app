import { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import notifee, { AuthorizationStatus } from '@notifee/react-native';
import { fetchPrayerTimings, type PrayerTimingsDay } from '../../services/prayerTimesApi';
import { computePrayerHeroState } from '../../utils/prayerSchedule';
import { useSimpleGeolocation } from '../../hooks/useSimpleGeolocation';
import { useAdhanSettingsStore } from '../../store/adhanSettingsStore';
import { useNotificationOnboardingStore } from '../../store/notificationOnboardingStore';
import { useWelcomeNotificationStore } from '../../store/welcomeNotificationStore';
import { buildWelcomeContextNotificationPayload } from '../../services/welcomeContextNotification';
import { displayWelcomeContextNotification } from '../../services/prayerReminders';

const WELCOME_DELAY_MIN_MS = 5000;
const WELCOME_DELAY_MAX_MS = 10000;

/**
 * After the user enables notifications (modal or Adhan master toggle), sends one contextual
 * local notification 5–10s later with live prayer / makruh state at fire time.
 */
export function WelcomeContextNotificationScheduler() {
  const { coords } = useSimpleGeolocation();
  const [tick, setTick] = useState(0);
  const [dateKey, setDateKey] = useState(() => dayjs().format('DD-MM-YYYY'));

  const masterEnabled = useAdhanSettingsStore(s => s.masterEnabled);
  const pendingWelcome = useNotificationOnboardingStore(s => s.pendingWelcomeContextNotification);
  const setPendingWelcome = useNotificationOnboardingStore(s => s.setPendingWelcomeContextNotification);
  const hasSentWelcome = useWelcomeNotificationStore(s => s.hasSentWelcomeContextNotification);
  const markWelcomeSent = useWelcomeNotificationStore(s => s.markWelcomeContextSent);

  const prevMasterRef = useRef<boolean | null>(null);
  const masterFlipRef = useRef(false);
  const inFlightRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dataRef = useRef<{
    today: PrayerTimingsDay | null;
    tomorrow: PrayerTimingsDay | null;
    yesterday: PrayerTimingsDay | null;
    nowBeforeFajr: boolean;
  }>({ today: null, tomorrow: null, yesterday: null, nowBeforeFajr: false });

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    const id = setInterval(() => {
      setTick(t => t + 1);
      const d = dayjs().format('DD-MM-YYYY');
      setDateKey(prev => (d !== prev ? d : prev));
    }, 15_000);
    return () => clearInterval(id);
  }, []);

  const tomorrowKey = useMemo(() => dayjs().add(1, 'day').format('DD-MM-YYYY'), [dateKey]);
  const yesterdayKey = useMemo(() => dayjs().subtract(1, 'day').format('DD-MM-YYYY'), [dateKey]);

  const enabled = !!coords;

  const todayQuery = useQuery({
    queryKey: ['prayerTimes', coords?.lat, coords?.lon, dateKey, 2],
    queryFn: () => fetchPrayerTimings(coords!.lat, coords!.lon, dateKey, 2),
    enabled,
    staleTime: 1000 * 60 * 10,
  });

  const tomorrowQuery = useQuery({
    queryKey: ['prayerTimes', coords?.lat, coords?.lon, tomorrowKey, 2],
    queryFn: () => fetchPrayerTimings(coords!.lat, coords!.lon, tomorrowKey, 2),
    enabled,
    staleTime: 1000 * 60 * 10,
  });

  const nowBeforeFajr = useMemo(() => {
    if (!todayQuery.data) return false;
    const day0 = new Date();
    day0.setHours(0, 0, 0, 0);
    const match = todayQuery.data.Fajr.match(/(\d{1,2}):(\d{2})/);
    const h = match ? Number(match[1]) : Number(todayQuery.data.Fajr.split(':')[0]);
    const m = match ? Number(match[2]) : Number(todayQuery.data.Fajr.split(':')[1]);
    const fajr = new Date(day0);
    fajr.setHours(h, m, 0, 0);
    return tick >= 0 && Date.now() < fajr.getTime();
  }, [todayQuery.data, tick]);

  const yesterdayQuery = useQuery({
    queryKey: ['prayerTimes', coords?.lat, coords?.lon, yesterdayKey, 2],
    queryFn: () => fetchPrayerTimings(coords!.lat, coords!.lon, yesterdayKey, 2),
    enabled: enabled && nowBeforeFajr,
    staleTime: 1000 * 60 * 60 * 24,
  });

  const todayData = todayQuery.data ?? null;
  const tomorrowData = tomorrowQuery.data ?? null;
  const yesterdayData = yesterdayQuery.data ?? null;
  const yesterdayPending = yesterdayQuery.isPending;

  dataRef.current = {
    today: todayData,
    tomorrow: tomorrowData,
    yesterday: yesterdayData,
    nowBeforeFajr,
  };

  useEffect(() => {
    if (prevMasterRef.current === null) {
      prevMasterRef.current = masterEnabled;
      return;
    }
    if (!prevMasterRef.current && masterEnabled) {
      masterFlipRef.current = true;
    }
    prevMasterRef.current = masterEnabled;
  }, [masterEnabled]);

  const dataReady = Boolean(
    todayData && tomorrowData && (!nowBeforeFajr || !yesterdayPending),
  );

  useEffect(() => {
    if (hasSentWelcome || !dataReady || !masterEnabled) return;
    if (inFlightRef.current) return;

    const fromModal = pendingWelcome;
    const fromFlip = masterFlipRef.current;
    if (!fromModal && !fromFlip) return;

    inFlightRef.current = true;
    masterFlipRef.current = false;
    setPendingWelcome(false);

    void notifee.getNotificationSettings().then(settings => {
      const authorized =
        settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
        settings.authorizationStatus === AuthorizationStatus.PROVISIONAL;
      if (!authorized) {
        inFlightRef.current = false;
        return;
      }

      const delayMs =
        WELCOME_DELAY_MIN_MS + Math.floor(Math.random() * (WELCOME_DELAY_MAX_MS - WELCOME_DELAY_MIN_MS));

      timeoutRef.current = setTimeout(async () => {
        timeoutRef.current = null;
        if (useWelcomeNotificationStore.getState().hasSentWelcomeContextNotification) {
          inFlightRef.current = false;
          return;
        }
        try {
          const { today, tomorrow, yesterday, nowBeforeFajr: nb } = dataRef.current;
          if (!today || !tomorrow) {
            inFlightRef.current = false;
            return;
          }
          const y = nb && yesterday ? yesterday : null;
          const freshHero = computePrayerHeroState(new Date(), today, tomorrow, y);
          const payload = buildWelcomeContextNotificationPayload(freshHero);
          await displayWelcomeContextNotification(payload);
        } catch {
          /* notifee / native */
        } finally {
          markWelcomeSent();
          inFlightRef.current = false;
        }
      }, delayMs);
    });
  }, [hasSentWelcome, pendingWelcome, masterEnabled, dataReady, setPendingWelcome, markWelcomeSent]);

  return null;
}
