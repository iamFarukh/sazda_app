import type {
  ZakatCycle,
  ZakatInsights,
  ZakatPayment,
  ZakatPaymentCategory,
} from './types';

export function paymentsForCycle(
  paymentsById: Record<string, ZakatPayment>,
  cycleId: string,
): ZakatPayment[] {
  return Object.values(paymentsById)
    .filter(p => p.cycleId === cycleId)
    .sort((a, b) => b.paidAtIso.localeCompare(a.paidAtIso) || b.createdAtMs - a.createdAtMs);
}

export function computeInsights(payments: ZakatPayment[]): ZakatInsights {
  const byCategory = new Map<ZakatPaymentCategory, number>();
  const byMonth: Record<string, number> = {};
  let largest: ZakatPayment | null = null;
  const catCount = new Map<ZakatPaymentCategory, number>();

  for (const p of payments) {
    const amt = Math.max(0, p.amountPaise);
    byCategory.set(p.category, (byCategory.get(p.category) ?? 0) + amt);
    const month = p.paidAtIso.slice(0, 7);
    if (month.length === 7) {
      byMonth[month] = (byMonth[month] ?? 0) + amt;
    }
    catCount.set(p.category, (catCount.get(p.category) ?? 0) + 1);
    if (!largest || amt > largest.amountPaise) largest = p;
  }

  let mostFrequent: ZakatPaymentCategory | null = null;
  let maxC = 0;
  catCount.forEach((c, k) => {
    if (c > maxC) {
      maxC = c;
      mostFrequent = k;
    }
  });

  const byCategoryArr = Array.from(byCategory.entries())
    .map(([category, totalPaise]) => ({ category, totalPaise }))
    .sort((a, b) => b.totalPaise - a.totalPaise);

  return {
    byCategory: byCategoryArr,
    byMonth,
    largestPayment: largest,
    mostFrequentCategory: mostFrequent,
    paymentCount: payments.length,
  };
}

export function orderedCycles(cyclesById: Record<string, ZakatCycle>, cycleIds: string[]): ZakatCycle[] {
  return cycleIds.map(id => cyclesById[id]).filter(Boolean) as ZakatCycle[];
}

export function pickActiveCycle(
  cyclesById: Record<string, ZakatCycle>,
  cycleIds: string[],
  activeCycleId: string | null,
): ZakatCycle | null {
  if (activeCycleId && cyclesById[activeCycleId]) return cyclesById[activeCycleId];
  const first = cycleIds[0];
  return first ? cyclesById[first] ?? null : null;
}
