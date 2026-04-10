const INDIC = '٠١٢٣٤٥٦٧٨٩';

/** Eastern Arabic numerals (٠–٩) for ayah / page markers. */
export function toArabicIndicDigits(n: number): string {
  return String(Math.max(0, Math.floor(n)))
    .split('')
    .map(ch => INDIC[parseInt(ch, 10)] ?? ch)
    .join('');
}
