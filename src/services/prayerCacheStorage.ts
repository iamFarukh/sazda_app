import { mmkv } from './storage';
import type { PrayerTimesCache } from '../features/prayerTimesCache/types';
import { validatePrayerTimesCache } from '../features/prayerTimesCache/validate';

const KEY = 'sazda-prayer-times-cache-v1';

export function loadPrayerTimesCache(): PrayerTimesCache | null {
  const raw = mmkv.getString(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!validatePrayerTimesCache(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function savePrayerTimesCache(cache: PrayerTimesCache): void {
  mmkv.set(KEY, JSON.stringify(cache));
}

export function clearPrayerTimesCache(): void {
  mmkv.remove(KEY);
}

