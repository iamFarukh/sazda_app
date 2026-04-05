/** Pull HH:mm from strings like "05:12 (GMT)" or "5:12 am". */
export function extractHhmm(hhmm: string): string | null {
  const m = hhmm.trim().match(/(\d{1,2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : null;
}

/** Format Aladhan-style "HH:mm" (24h) to local 12h display. */
export function formatHhmmTo12h(hhmm: string): string {
  const core = extractHhmm(hhmm);
  if (!core) return hhmm.trim();
  const parts = core.split(':');
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  const d = new Date(2000, 0, 1, h, m, 0, 0);
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
