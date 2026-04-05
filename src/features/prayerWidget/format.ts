/**
 * Widget copy uses whole minutes (no per-second churn).
 * Uses ceil so "under a minute" still shows "1 min" until the adhān.
 */
export function formatCountdownMinutes(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return 'Now';
  const minutes = Math.ceil(ms / 60_000);
  if (minutes >= 120) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  }
  if (minutes === 1) return '1 min';
  return `${minutes} min`;
}

export function subtitleNextIn(name: string, timeLabel: string): string {
  return `Next: ${name} in ${timeLabel}`;
}
