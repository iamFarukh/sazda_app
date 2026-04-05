import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { fetchPrayerTimings, type PrayerTimingsDay } from '../services/prayerTimesApi';
import { fetchAndPersistPrayerLocation } from '../services/prayerLocationGps';
import { usePrayerLocationStore } from '../store/prayerLocationStore';
import {
  computePrayerHeroState,
  formatCountdown,
  formatTime12h,
  type PrayerHeroState,
} from '../utils/prayerSchedule';

export type UsePrayerTimesHomeResult = {
  coords: { lat: number; lon: number } | null;
  permissionDenied: boolean;
  locationError: string | null;
  requestLocation: () => Promise<void>;
  prayerLoading: boolean;
  prayerError: boolean;
  refetchPrayers: () => void;
  /** Live hero state; null until data ready */
  hero: PrayerHeroState | null;
  /** Updates every tick for countdown */
  countdownLabel: string;
  currentPrayerLabel: string;
  currentPrayerTimeLabel: string;
  nextPrayerLabel: string;
  locationLine: string;
  /** City for header / location bar */
  locationCityLabel: string;
  /** Aladhan method name for small print */
  methodNote: string;
  /** Waiting on yesterday’s times for pre-Fajr night state */
  waitingNightData: boolean;
  /** Today’s full timings row (for lists); null until loaded */
  todayTimings: PrayerTimingsDay | null;
  /** Makruh / between-prayers guidance from `computePrayerHeroState` */
  prayerPeriodNote: string | null;
  /** Local calendar day key `DD-MM-YYYY` (rolls with home tick). */
  todayDateKey: string;
  /** For widgets / glance UI (same queries as hero). */
  tomorrowTimings: PrayerTimingsDay | null;
  yesterdayTimings: PrayerTimingsDay | null;
  /** True when local time is before today's Fajr (night / next Fajr). */
  nowBeforeFajr: boolean;
};

export function usePrayerTimesHome(): UsePrayerTimesHomeResult {
  const saved = usePrayerLocationStore(s => s.saved);
  const coords = useMemo(
    () =>
      saved
        ? { lat: saved.latitude, lon: saved.longitude }
        : null,
    [saved],
  );

  const [permissionDenied, setPermissionDenied] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [dateKey, setDateKey] = useState(() => dayjs().format('DD-MM-YYYY'));

  const yesterdayKey = useMemo(() => {
    if (!dateKey) return '';
    return dayjs().subtract(1, 'day').format('DD-MM-YYYY');
  }, [dateKey]);
  const tomorrowKey = useMemo(() => {
    if (!dateKey) return '';
    return dayjs().add(1, 'day').format('DD-MM-YYYY');
  }, [dateKey]);

  const requestLocation = useCallback(async () => {
    setLocationError(null);
    setPermissionDenied(false);
    const r = await fetchAndPersistPrayerLocation();
    if (r === 'permission_denied') {
      setPermissionDenied(true);
      return;
    }
    if (typeof r === 'object') {
      setLocationError(r.error);
    }
  }, []);

  // Real-time: refresh countdown often; roll calendar day at local midnight
  useEffect(() => {
    const id = setInterval(() => {
      setTick(t => t + 1);
      const d = dayjs().format('DD-MM-YYYY');
      setDateKey(prev => (d !== prev ? d : prev));
    }, 15_000);
    return () => clearInterval(id);
  }, []);

  const enabled = !!coords;

  const todayQuery = useQuery({
    queryKey: ['prayerTimes', coords?.lat, coords?.lon, dateKey, 2],
    queryFn: () => fetchPrayerTimings(coords!.lat, coords!.lon, dateKey, 2),
    enabled,
    staleTime: 1000 * 60 * 15,
  });

  const tomorrowQuery = useQuery({
    queryKey: ['prayerTimes', coords?.lat, coords?.lon, tomorrowKey, 2],
    queryFn: () => fetchPrayerTimings(coords!.lat, coords!.lon, tomorrowKey, 2),
    enabled,
    staleTime: 1000 * 60 * 15,
  });

  const nowBeforeFajr = useMemo(() => {
    if (!todayQuery.data) return false;
    const day0 = new Date();
    day0.setHours(0, 0, 0, 0);
    const [h, m] = todayQuery.data.Fajr.split(':').map(Number);
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

  const hero = useMemo((): PrayerHeroState | null => {
    if (!todayQuery.data || !tomorrowQuery.data) return null;
    if (nowBeforeFajr && yesterdayQuery.isPending) return null;
    if (tick < 0) return null;
    return computePrayerHeroState(
      new Date(),
      todayQuery.data,
      tomorrowQuery.data,
      yesterdayQuery.data ?? null,
    );
  }, [
    todayQuery.data,
    tomorrowQuery.data,
    yesterdayQuery.data,
    yesterdayQuery.isPending,
    nowBeforeFajr,
    tick,
  ]);

  const countdownLabel = hero ? formatCountdown(hero.countdownMs) : '—';

  const currentPrayerLabel = hero
    ? hero.currentPeriod === 'Night'
      ? 'Night (after Isha)'
      : hero.currentPeriod === 'BetweenFajrDhuhr'
        ? 'Between prayers'
        : hero.currentPeriod === 'MakruhBeforeDhuhr'
          ? 'Makruh time'
          : hero.currentPeriod
    : '—';

  const currentPrayerTimeLabel =
    hero && !hero.hideCurrentAdhanTime ? formatTime12h(hero.headlineTime) : '—';

  const nextPrayerLabel = hero ? hero.countdownTargetName : '—';

  const prayerPeriodNote = hero?.periodNote ?? null;

  const locationCityLabel = !saved
    ? 'Set location'
    : saved.city === '…'
      ? 'Locating…'
      : saved.city;

  const locationLine = saved
    ? `${saved.city === '…' ? `${saved.latitude.toFixed(2)}°, ${saved.longitude.toFixed(2)}°` : saved.city} · updates every 15s`
    : 'Location needed for salah times';

  const refetchPrayers = useCallback(() => {
    todayQuery.refetch();
    tomorrowQuery.refetch();
    yesterdayQuery.refetch();
  }, [todayQuery, tomorrowQuery, yesterdayQuery]);

  const waitingNightData =
    enabled &&
    todayQuery.isSuccess &&
    tomorrowQuery.isSuccess &&
    nowBeforeFajr &&
    yesterdayQuery.isPending;

  return {
    coords,
    permissionDenied,
    locationError,
    requestLocation,
    prayerLoading: enabled && (todayQuery.isPending || tomorrowQuery.isPending),
    prayerError: todayQuery.isError || tomorrowQuery.isError,
    refetchPrayers: refetchPrayers,
    hero,
    countdownLabel,
    currentPrayerLabel,
    currentPrayerTimeLabel,
    nextPrayerLabel,
    locationLine,
    locationCityLabel,
    methodNote: 'ISNA method (Aladhan). Change later in settings.',
    waitingNightData,
    todayTimings: todayQuery.data ?? null,
    prayerPeriodNote,
    todayDateKey: dateKey,
    tomorrowTimings: tomorrowQuery.data ?? null,
    yesterdayTimings: yesterdayQuery.data ?? null,
    nowBeforeFajr,
  };
}
