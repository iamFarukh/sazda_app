import type { RangeStats } from './prayerTrackerStats';
import { PRAYERS_PER_DAY } from './prayerTrackerStats';

export type EncouragementContext = {
  streak: number;
  todayPrayed: number;
  todayMissed: number;
  todayPending: number;
  weekly: RangeStats;
  monthly: RangeStats;
};

const FULL_DAY_LINES = [
  'All five prayers logged — Barakallahu feek. 🔥',
  'Perfect day. Consistency is worship in motion.',
  'Five for five. Keep this energy.',
  'Masha’Allah — your discipline today is inspiring.',
];

const STREAK_30 = [
  'A month of full days — that’s rare. Stay humble, stay steady.',
  '30+ day streak energy. You’re building something real.',
];

const STREAK_14 = ['Two weeks strong. Habits are forming. 💚', 'Fourteen days of showing up. Beautiful.'];

const STREAK_7 = [
  'One week streak — the hardest part is behind you.',
  'Seven days of five prayers. That’s habit territory.',
];

const STREAK_3 = ['Three perfect days in a row. Momentum is yours.', 'Third day streak — keep stacking wins.'];

const STREAK_1 = ['First full day locked in. Come back tomorrow.', 'Day one complete. Small steps, big barakah.'];

const WEEKLY_CRUSH = [
  'You’re crushing this week — stay consistent.',
  'Weekly completion looking strong. Don’t drop the ball now.',
];

const CATCH_UP = [
  'Still time today — mark what you prayed with honesty.',
  'Every salah you catch counts. Bismillah.',
  'Missed happens — intention and tawbah matter. Log what’s true.',
];

const START_FRESH = [
  'Start with the next prayer. One tick at a time.',
  'No streak yet? Today is the best day to begin.',
  'Small daily wins beat perfect plans you never start.',
];

/** When browsing a past day in the tracker (dateKey &lt; todayKey). */
export function getPastDayEncouragement(
  prayed: number,
  missed: number,
  _pending: number,
): string {
  if (prayed === PRAYERS_PER_DAY) return 'Perfect day on the record. 🌙';
  if (prayed + missed === 0) return 'No marks yet — update if you remember how this day went.';
  if (missed > 0 && prayed + missed === PRAYERS_PER_DAY)
    return 'Fully logged: honesty builds the habit more than a perfect score.';
  if (prayed > 0) return `${prayed} prayed logged — you can still adjust with ✓ or ✗.`;
  return 'Tap ✓ or ✗ to keep your history accurate.';
}

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length]!;
}

/** Stable-ish message from context (seed avoids flicker on re-render). */
export function getEncouragementMessage(ctx: EncouragementContext, seed = 0): string {
  const { streak, todayPrayed, todayMissed, todayPending, weekly, monthly } = ctx;

  if (todayPrayed === PRAYERS_PER_DAY) {
    if (streak >= 30) return pick(STREAK_30, seed);
    if (streak >= 14) return pick(STREAK_14, seed);
    if (streak >= 7) return pick(STREAK_7, seed);
    if (streak >= 3) return pick(STREAK_3, seed);
    if (streak === 1) return pick(STREAK_1, seed);
    return pick(FULL_DAY_LINES, seed);
  }

  if (weekly.maxPrayers > 0 && weekly.prayed / weekly.maxPrayers >= 0.85 && todayPending > 0) {
    return pick(WEEKLY_CRUSH, seed + 1);
  }

  if (
    monthly.maxPrayers > 0 &&
    monthly.prayed / monthly.maxPrayers >= 0.8 &&
    todayPending === PRAYERS_PER_DAY
  ) {
    return 'Your month has been solid — log today’s prayers to keep the wave going.';
  }

  if (todayMissed > 0 && todayPrayed + todayMissed < PRAYERS_PER_DAY) {
    return pick(CATCH_UP, seed + 2);
  }

  if (todayPrayed > 0 && todayPending > 0) {
    return `${todayPending} left today — you’ve got this.`;
  }

  if (streak === 0 && todayPrayed === 0 && todayMissed === 0) {
    return pick(START_FRESH, seed + 3);
  }

  return pick(CATCH_UP, seed + 4);
}
