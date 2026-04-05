import type { DailyPrayerName } from '../../utils/prayerSchedule';

export type PrayerWidgetMode = 'active' | 'makruh' | 'night' | 'between';

export type PrayerWidgetMakruhVariant = 'post_fajr' | 'ishraq' | 'zawal' | 'sunset';

/** Serializable for WidgetKit / Android widgets + in-app glance UI. */
export type PrayerWidgetSnapshot = {
  v: 1;
  computedAtMs: number;
  /** Local calendar key DD-MM-YYYY used for the schedule. */
  dateKey: string;
  mode: PrayerWidgetMode;
  makruhVariant?: PrayerWidgetMakruhVariant;
  /** Primary line (e.g. "Now: Asr", "Makruh time", "Next: Fajr") */
  title: string;
  /** Secondary line (e.g. "Next: Maghrib in 43 min") */
  subtitle: string;
  /** Which of the five salāh to highlight; null during Makruh / night / between. */
  highlight: DailyPrayerName | null;
  nextName: DailyPrayerName;
  /** ms until next adhān / target the subtitle refers to */
  countdownToNextMs: number;
  /** Minute-rounded label (updates on 1-min cadence in UI). */
  countdownLabelMin: string;
  periodNote?: string;
  schedule: { name: DailyPrayerName; time12: string }[];
};
