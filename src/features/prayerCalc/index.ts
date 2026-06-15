import {
  CalculationMethod,
  Coordinates,
  HighLatitudeRule,
  Madhab,
  PrayerTimes,
} from 'adhan';
import {
  MAKRUH_BEFORE_DHUHR_MINUTES,
  MAKRUH_SUNRISE_MINUTES,
  MAKRUH_SUNSET_MINUTES,
} from '../../utils/prayerSchedule';
import type {
  DaySchedule,
  PrayerCalcConfig,
  PrayerName,
} from '../prayerTimesCache/types';

type Coords = { latitude: number; longitude: number };

const PRAYERS: PrayerName[] = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function formatHHmm(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function formatIsoDayKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function pickMethod(method: PrayerCalcConfig['method']) {
  switch (method) {
    case 'MWL':
      return CalculationMethod.MuslimWorldLeague();
    case 'ISNA':
      return CalculationMethod.NorthAmerica();
    case 'Egyptian':
      return CalculationMethod.Egyptian();
    case 'Karachi':
      return CalculationMethod.Karachi();
    case 'UmmAlQura':
      return CalculationMethod.UmmAlQura();
    case 'Dubai':
      return CalculationMethod.Dubai();
    case 'Qatar':
      return CalculationMethod.Qatar();
    case 'Kuwait':
      return CalculationMethod.Kuwait();
    case 'MoonsightingCommittee':
      return CalculationMethod.MoonsightingCommittee();
    case 'Singapore':
      return CalculationMethod.Singapore();
    case 'Turkey':
      return CalculationMethod.Turkey();
    case 'Tehran':
      return CalculationMethod.Tehran();
    default:
      return CalculationMethod.NorthAmerica();
  }
}

function pickHighLat(rule: PrayerCalcConfig['highLatitudeRule']) {
  switch (rule) {
    case 'middleOfTheNight':
      return HighLatitudeRule.MiddleOfTheNight;
    case 'seventhOfTheNight':
      return HighLatitudeRule.SeventhOfTheNight;
    case 'twilightAngle':
      return HighLatitudeRule.TwilightAngle;
    default:
      return HighLatitudeRule.MiddleOfTheNight;
  }
}

function pickMadhab(m: PrayerCalcConfig['asrMadhab']) {
  return m === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;
}

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addLocalDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export function defaultPrayerCalcConfig(): PrayerCalcConfig {
  return {
    method: 'ISNA',
    asrMadhab: 'shafi',
    highLatitudeRule: 'middleOfTheNight',
    offsetsMin: {},
  };
}

export function computeDaySchedule(date: Date, coords: Coords, config: PrayerCalcConfig): DaySchedule {
  const day0 = startOfLocalDay(date);
  const c = new Coordinates(coords.latitude, coords.longitude);
  const params = pickMethod(config.method);
  params.madhab = pickMadhab(config.asrMadhab);
  params.highLatitudeRule = pickHighLat(config.highLatitudeRule);

  // Adhan adjustments are in minutes.
  const adj = params.adjustments;
  const off = config.offsetsMin ?? {};
  adj.fajr += off.Fajr ?? 0;
  adj.sunrise += off.Sunrise ?? 0;
  adj.dhuhr += off.Dhuhr ?? 0;
  adj.asr += off.Asr ?? 0;
  adj.maghrib += off.Maghrib ?? 0;
  adj.isha += off.Isha ?? 0;

  const pt = new PrayerTimes(c, day0, params);

  const boundaryMs: Record<PrayerName, number> = {
    Fajr: pt.fajr.getTime(),
    Sunrise: pt.sunrise.getTime(),
    Dhuhr: pt.dhuhr.getTime(),
    Asr: pt.asr.getTime(),
    Maghrib: pt.maghrib.getTime(),
    Isha: pt.isha.getTime(),
  };

  // Sanity clamp: sunrise should not be before fajr (can happen with odd offsets).
  if (boundaryMs.Sunrise < boundaryMs.Fajr) boundaryMs.Sunrise = boundaryMs.Fajr;

  const wall: Record<PrayerName, string> = {
    Fajr: formatHHmm(new Date(boundaryMs.Fajr)),
    Sunrise: formatHHmm(new Date(boundaryMs.Sunrise)),
    Dhuhr: formatHHmm(new Date(boundaryMs.Dhuhr)),
    Asr: formatHHmm(new Date(boundaryMs.Asr)),
    Maghrib: formatHHmm(new Date(boundaryMs.Maghrib)),
    Isha: formatHHmm(new Date(boundaryMs.Isha)),
  };

  const makruh = [
    {
      startMs: boundaryMs.Fajr,
      endMs: boundaryMs.Sunrise,
      variant: 'post_fajr' as const,
    },
    {
      startMs: boundaryMs.Sunrise,
      endMs: boundaryMs.Sunrise + MAKRUH_SUNRISE_MINUTES * 60 * 1000,
      variant: 'ishraq' as const,
    },
    {
      startMs: Math.max(boundaryMs.Sunrise, boundaryMs.Dhuhr - MAKRUH_BEFORE_DHUHR_MINUTES * 60 * 1000),
      endMs: boundaryMs.Dhuhr,
      variant: 'zawal' as const,
    },
    {
      startMs: boundaryMs.Maghrib - MAKRUH_SUNSET_MINUTES * 60 * 1000,
      endMs: boundaryMs.Maghrib,
      variant: 'sunset' as const,
    },
  ].filter(r => r.endMs > r.startMs);

  return {
    dayKey: formatIsoDayKey(day0),
    wall,
    boundaryMs,
    makruh,
  };
}

export function computeRollingSchedules(
  startDate: Date,
  days: number,
  coords: Coords,
  config: PrayerCalcConfig,
): DaySchedule[] {
  const out: DaySchedule[] = [];
  const base = startOfLocalDay(startDate);
  for (let i = 0; i < days; i++) {
    out.push(computeDaySchedule(addLocalDays(base, i), coords, config));
  }
  return out;
}

