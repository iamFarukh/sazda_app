import { computeRollingSchedules, defaultPrayerCalcConfig, formatIsoDayKey } from '../prayerCalc';
import type { PrayerCalcConfig, PrayerTimesCache } from './types';
import { loadPrayerTimesCache, savePrayerTimesCache } from '../../services/prayerCacheStorage';

type EnsureArgs = {
  latitude: number;
  longitude: number;
  city: string;
  timezoneId: string;
  timezoneOffsetMin: number;
  /** Optional override; otherwise uses defaults. */
  calc?: PrayerCalcConfig;
  /** Rolling days, default 30. */
  rollingDays?: number;
  /** Location delta threshold in km, default 30. */
  locationThresholdKm?: number;
  /** Force recompute regardless of cache. */
  force?: boolean;
};

function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function stableStringify(v: unknown): string {
  return JSON.stringify(v, Object.keys(v as any).sort());
}

function shouldRecomputeAll(existing: PrayerTimesCache, args: Required<EnsureArgs>): boolean {
  if (args.force) return true;
  const km = haversineKm(
    { lat: existing.meta.latitude, lon: existing.meta.longitude },
    { lat: args.latitude, lon: args.longitude },
  );
  if (km > args.locationThresholdKm) return true;
  if (existing.meta.timezoneId !== args.timezoneId) return true;
  if (existing.meta.timezoneOffsetMin !== args.timezoneOffsetMin) return true;
  if (stableStringify(existing.meta.calc) !== stableStringify(args.calc)) return true;
  return false;
}

function pruneToWindow(days: PrayerTimesCache['days'], startDayKey: string, rollingDays: number) {
  const keep: PrayerTimesCache['days'] = {};
  const start = new Date(`${startDayKey}T00:00:00`);
  for (let i = 0; i < rollingDays; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const k = formatIsoDayKey(d);
    const v = days[k];
    if (v) keep[k] = v;
  }
  return keep;
}

/**
 * Ensures >= rollingDays schedules starting today are available offline.
 * Never throws; returns the final cache (existing or updated).
 */
export function ensurePrayerTimesCache(args: EnsureArgs): PrayerTimesCache | null {
  const rollingDays = args.rollingDays ?? 30;
  const locationThresholdKm = args.locationThresholdKm ?? 30;
  const calc = args.calc ?? defaultPrayerCalcConfig();

  const required: Required<EnsureArgs> = {
    latitude: args.latitude,
    longitude: args.longitude,
    city: args.city,
    timezoneId: args.timezoneId,
    timezoneOffsetMin: args.timezoneOffsetMin,
    calc,
    rollingDays,
    locationThresholdKm,
    force: args.force ?? false,
  };

  const now = new Date();
  const todayKey = formatIsoDayKey(now);

  const existing = loadPrayerTimesCache();
  try {
    if (existing && !shouldRecomputeAll(existing, required)) {
      // Ensure coverage by filling missing days only.
      const nextDays = pruneToWindow(existing.days, todayKey, rollingDays);
      const missing: string[] = [];
      for (let i = 0; i < rollingDays; i++) {
        const d = new Date(now);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + i);
        const k = formatIsoDayKey(d);
        if (!nextDays[k]) missing.push(k);
      }

      if (missing.length === 0) return existing;

      const schedules = computeRollingSchedules(now, rollingDays, { latitude: required.latitude, longitude: required.longitude }, required.calc);
      for (const s of schedules) nextDays[s.dayKey] = s;

      const updated: PrayerTimesCache = {
        v: 1,
        meta: {
          schemaVersion: 1,
          lastUpdatedAtMs: Date.now(),
          latitude: required.latitude,
          longitude: required.longitude,
          city: required.city,
          timezoneId: required.timezoneId,
          timezoneOffsetMin: required.timezoneOffsetMin,
          calc: required.calc,
        },
        days: pruneToWindow(nextDays, todayKey, rollingDays),
      };
      savePrayerTimesCache(updated);
      return updated;
    }

    // Recompute full window.
    const schedules = computeRollingSchedules(
      now,
      rollingDays,
      { latitude: required.latitude, longitude: required.longitude },
      required.calc,
    );
    const days: PrayerTimesCache['days'] = {};
    for (const s of schedules) days[s.dayKey] = s;
    const updated: PrayerTimesCache = {
      v: 1,
      meta: {
        schemaVersion: 1,
        lastUpdatedAtMs: Date.now(),
        latitude: required.latitude,
        longitude: required.longitude,
        city: required.city,
        timezoneId: required.timezoneId,
        timezoneOffsetMin: required.timezoneOffsetMin,
        calc: required.calc,
      },
      days,
    };
    savePrayerTimesCache(updated);
    return updated;
  } catch {
    // Preserve last-known-good cache.
    return existing;
  }
}

