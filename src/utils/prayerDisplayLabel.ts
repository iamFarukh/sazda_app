/**
 * Maps canonical prayer keys (API / Aladhan, stores, widgets) to user-visible copy.
 * Internal identifiers stay `Dhuhr`; only call this at display boundaries.
 */
export function prayerDisplayLabel(canonicalName: string): string {
  if (canonicalName === 'Dhuhr' || canonicalName === 'Dhuhar') {
    return 'Zohar';
  }
  return canonicalName;
}
