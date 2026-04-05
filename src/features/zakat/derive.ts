import type { ZakatCycle, ZakatDerivedCycle, ZakatPayment } from './types';

/**
 * Derived values only — never persist. Recomputed whenever cycle total or payment list changes.
 */
export function deriveCycle(cycle: ZakatCycle, payments: ZakatPayment[]): ZakatDerivedCycle {
  const totalPaise = Math.max(0, Math.round(cycle.totalZakatPaise));
  const paidPaise = payments.reduce((s, p) => s + Math.max(0, Math.round(p.amountPaise)), 0);
  const overpayPaise = paidPaise > totalPaise ? paidPaise - totalPaise : 0;
  const remainingPaise = Math.max(0, totalPaise - paidPaise);
  const progress01 =
    totalPaise <= 0 ? (paidPaise > 0 ? 1 : 0) : Math.min(1, paidPaise / totalPaise);

  return {
    cycleId: cycle.id,
    totalPaise,
    paidPaise,
    remainingPaise,
    overpayPaise,
    progress01,
  };
}

export function validatePaymentAmountPaise(paise: number): string | null {
  if (!Number.isFinite(paise) || !Number.isInteger(paise)) return 'Enter a valid amount';
  if (paise <= 0) return 'Amount must be greater than zero';
  return null;
}

export function validateCycleTotalPaise(paise: number): string | null {
  if (!Number.isFinite(paise) || !Number.isInteger(paise)) return 'Enter a valid amount';
  if (paise < 0) return 'Zakat total cannot be negative';
  return null;
}
