import type { ZakatPaymentCategory } from './types';

export const PAYMENT_CATEGORY_LABEL: Record<ZakatPaymentCategory, string> = {
  masjid: 'Masjid',
  poor: 'Poor / needy',
  relative: 'Relative',
  other: 'Other',
};

export const PAYMENT_CATEGORIES: ZakatPaymentCategory[] = ['masjid', 'poor', 'relative', 'other'];
