import type { DaySchedule, PrayerName, PrayerTimesCache } from './types';

const PRAYERS: PrayerName[] = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

function isIsoDayKey(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function isWallTime(v: unknown): v is string {
  return typeof v === 'string' && /^(\d{1,2}):(\d{2})$/.test(v);
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

export function validateDaySchedule(day: unknown): day is DaySchedule {
  if (!day || typeof day !== 'object') return false;
  const d = day as DaySchedule;
  if (!isIsoDayKey(d.dayKey)) return false;
  if (!d.wall || typeof d.wall !== 'object') return false;
  if (!d.boundaryMs || typeof d.boundaryMs !== 'object') return false;

  for (const p of PRAYERS) {
    if (!isWallTime((d.wall as any)[p])) return false;
    if (!isFiniteNumber((d.boundaryMs as any)[p])) return false;
  }

  if (!Array.isArray(d.makruh)) return false;
  for (const r of d.makruh) {
    if (!r || typeof r !== 'object') return false;
    if (!isFiniteNumber((r as any).startMs)) return false;
    if (!isFiniteNumber((r as any).endMs)) return false;
    if ((r as any).endMs < (r as any).startMs) return false;
    const v = (r as any).variant;
    if (v !== 'post_fajr' && v !== 'ishraq' && v !== 'zawal' && v !== 'sunset') return false;
  }

  // Basic monotonic boundary sanity: sunrise >= fajr, isha >= maghrib, etc.
  const b = d.boundaryMs;
  if (b.Sunrise < b.Fajr) return false;
  if (b.Dhuhr < b.Sunrise) return false;
  if (b.Asr < b.Dhuhr) return false;
  if (b.Maghrib < b.Asr) return false;
  if (b.Isha < b.Maghrib) return false;

  return true;
}

export function validatePrayerTimesCache(cache: unknown): cache is PrayerTimesCache {
  if (!cache || typeof cache !== 'object') return false;
  const c = cache as PrayerTimesCache;
  if (c.v !== 1) return false;
  if (!c.meta || typeof c.meta !== 'object') return false;
  if (c.meta.schemaVersion !== 1) return false;
  if (!isFiniteNumber(c.meta.lastUpdatedAtMs)) return false;
  if (!isFiniteNumber(c.meta.latitude)) return false;
  if (!isFiniteNumber(c.meta.longitude)) return false;
  if (typeof c.meta.city !== 'string') return false;
  if (typeof c.meta.timezoneId !== 'string' || !c.meta.timezoneId) return false;
  if (!isFiniteNumber(c.meta.timezoneOffsetMin)) return false;
  if (!c.meta.calc || typeof c.meta.calc !== 'object') return false;
  if (typeof c.meta.calc.method !== 'string') return false;
  if (c.meta.calc.asrMadhab !== 'shafi' && c.meta.calc.asrMadhab !== 'hanafi') return false;
  if (
    c.meta.calc.highLatitudeRule !== 'middleOfTheNight' &&
    c.meta.calc.highLatitudeRule !== 'seventhOfTheNight' &&
    c.meta.calc.highLatitudeRule !== 'twilightAngle'
  ) {
    return false;
  }
  if (!c.days || typeof c.days !== 'object') return false;

  for (const [k, v] of Object.entries(c.days)) {
    if (!isIsoDayKey(k)) return false;
    if (!validateDaySchedule(v)) return false;
  }

  return true;
}

