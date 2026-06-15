import { computeDaySchedule, defaultPrayerCalcConfig } from '../src/features/prayerCalc';
import { validateDaySchedule } from '../src/features/prayerTimesCache/validate';

describe('prayer times cache', () => {
  it('computes a valid day schedule with monotonic boundaries', () => {
    const cfg = defaultPrayerCalcConfig();
    const d = new Date('2026-04-14T12:00:00');
    const sched = computeDaySchedule(d, { latitude: 24.8607, longitude: 67.0011 }, cfg);
    expect(validateDaySchedule(sched)).toBe(true);

    const b = sched.boundaryMs;
    expect(b.Sunrise).toBeGreaterThanOrEqual(b.Fajr);
    expect(b.Dhuhr).toBeGreaterThanOrEqual(b.Sunrise);
    expect(b.Asr).toBeGreaterThanOrEqual(b.Dhuhr);
    expect(b.Maghrib).toBeGreaterThanOrEqual(b.Asr);
    expect(b.Isha).toBeGreaterThanOrEqual(b.Maghrib);
  });
});

