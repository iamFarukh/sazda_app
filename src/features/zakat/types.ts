/** Payment destination — extendable for future detailed zakāt categories. */
export type ZakatPaymentCategory = 'masjid' | 'poor' | 'relative' | 'other';

export type ZakatCycle = {
  id: string;
  /** Display title e.g. "Ramadan 2026" */
  label: string;
  /** Calendar year metadata (not used for logic). */
  year: number;
  startDateIso: string;
  endDateIso: string | null;
  /** Obligation in paise (INR × 100). Immutable w.r.t. payments when changed — payments stay as-is. */
  totalZakatPaise: number;
  /** Optional: zakatable wealth used for 2.5% (paise). */
  zakatableWealthPaise: number | null;
  notes: string;
  archived: boolean;
  createdAtMs: number;
  updatedAtMs: number;
};

export type ZakatPayment = {
  id: string;
  cycleId: string;
  amountPaise: number;
  category: ZakatPaymentCategory;
  /** ISO date (calendar day of payment). */
  paidAtIso: string;
  note: string;
  createdAtMs: number;
  updatedAtMs: number;
};

export type ZakatDerivedCycle = {
  cycleId: string;
  totalPaise: number;
  paidPaise: number;
  remainingPaise: number;
  overpayPaise: number;
  progress01: number;
};

export type ZakatCategoryBreakdown = { category: ZakatPaymentCategory; totalPaise: number };

export type ZakatInsights = {
  byCategory: ZakatCategoryBreakdown[];
  /** yyyy-mm -> paise */
  byMonth: Record<string, number>;
  largestPayment: ZakatPayment | null;
  mostFrequentCategory: ZakatPaymentCategory | null;
  paymentCount: number;
};
