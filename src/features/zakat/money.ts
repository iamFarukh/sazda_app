/** Default currency: Indian Rupee. Amounts stored as integer paise to avoid float drift. */
export const ZAKAT_RATE = 0.025;

export function rupeesToPaise(rupees: number): number {
  if (!Number.isFinite(rupees) || rupees < 0) return 0;
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

export function formatInrPaise(paise: number): string {
  const rupees = paiseToRupees(paise);
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(rupees);
  } catch {
    return `₹${rupees.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
}

export function parseRupeesInput(raw: string): number | null {
  const cleaned = raw.replace(/,/g, '').replace(/₹/g, '').trim();
  if (cleaned === '') return null;
  const n = Number.parseFloat(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}
