export type PrayerName = 'Fajr' | 'Sunrise' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';

export type MakruhVariant = 'post_fajr' | 'ishraq' | 'zawal' | 'sunset';

export type MakruhRange = {
  /** Epoch ms in the device-local timezone at compute time. */
  startMs: number;
  endMs: number;
  variant: MakruhVariant;
};

export type DaySchedule = {
  /** Calendar key in local terms: YYYY-MM-DD (for the target location + timezone). */
  dayKey: string;
  /**
   * Wall-clock time strings (HH:mm) for display + deterministic recompute.
   * These are interpreted in `timezoneId`.
   */
  wall: Record<PrayerName, string>;
  /**
   * Precomputed epoch milliseconds for boundary-driven updates.
   * Widgets/alarms should prefer this and avoid recomputing.
   */
  boundaryMs: Record<PrayerName, number>;
  /** Makruh windows for this day (epoch ms). */
  makruh: MakruhRange[];
};

export type PrayerCalcMethod =
  | 'MWL'
  | 'ISNA'
  | 'Egyptian'
  | 'Karachi'
  | 'UmmAlQura'
  | 'Dubai'
  | 'Qatar'
  | 'Kuwait'
  | 'MoonsightingCommittee'
  | 'Singapore'
  | 'Turkey'
  | 'Tehran';

export type PrayerAsrMadhab = 'shafi' | 'hanafi';

export type HighLatitudeRule = 'middleOfTheNight' | 'seventhOfTheNight' | 'twilightAngle';

export type PrayerCalcConfig = {
  method: PrayerCalcMethod;
  asrMadhab: PrayerAsrMadhab;
  highLatitudeRule: HighLatitudeRule;
  /** Per-prayer offsets in minutes (can be negative). */
  offsetsMin: Partial<Record<PrayerName, number>>;
};

export type PrayerTimesCacheMeta = {
  schemaVersion: 1;
  lastUpdatedAtMs: number;
  latitude: number;
  longitude: number;
  /** Small city label for widgets. */
  city: string;
  /** IANA timezone id, e.g. "Asia/Kolkata". */
  timezoneId: string;
  /** Captured device timezone offset (minutes) at compute time as an additional change signal. */
  timezoneOffsetMin: number;
  calc: PrayerCalcConfig;
};

export type PrayerTimesCache = {
  v: 1;
  meta: PrayerTimesCacheMeta;
  /**
   * Day schedules keyed by YYYY-MM-DD.
   * Must contain at least 30 future days for offline-first operation.
   */
  days: Record<string, DaySchedule>;
};

