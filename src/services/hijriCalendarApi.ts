import axios from 'axios';
import { dayjs } from '../utils/dayjs';

const client = axios.create({
  baseURL: 'https://api.aladhan.com/v1',
  timeout: 25_000,
  maxRedirects: 5,
});

/** Umm al-Qura–style calendar via Aladhan; Makkah reference (same Hijri dates globally). */
const HIJRI_CITY = 'Makkah';
const HIJRI_COUNTRY = 'Saudi Arabia';

export type HijriDayInfo = {
  hijriDay: number;
  hijriMonth: number;
  hijriMonthEn: string;
  hijriYear: number;
  gregorianDdMmYyyy: string;
  gregorianReadable: string;
  weekdayEn: string;
  timestampSec: number;
  holidays: string[];
};

type GToHResponse = {
  code: number;
  data: {
    hijri: {
      day: string;
      month: { number: number; en: string; days: number };
      year: string;
      holidays: string[];
    };
    gregorian: {
      date: string;
      day: string;
      month: { number: number; en: string };
      year: string;
      weekday: { en: string };
    };
  };
};

type HijriCalendarRow = {
  date: {
    readable: string;
    timestamp: string;
    gregorian: {
      date: string;
      weekday: { en: string };
    };
    hijri: {
      date: string;
      day: string;
      month: { number: number; en: string; days: number };
      year: string;
      holidays: string[];
    };
  };
};

type HijriCalendarResponse = {
  code: number;
  data: HijriCalendarRow[];
};

function parseRow(row: HijriCalendarRow): HijriDayInfo {
  const { hijri, gregorian, timestamp } = row.date;
  return {
    hijriDay: Number(hijri.day),
    hijriMonth: hijri.month.number,
    hijriMonthEn: hijri.month.en,
    hijriYear: Number(hijri.year),
    gregorianDdMmYyyy: gregorian.date,
    gregorianReadable: row.date.readable,
    weekdayEn: gregorian.weekday.en,
    timestampSec: Number(timestamp),
    holidays: hijri.holidays ?? [],
  };
}

/** Today’s Hijri + Gregorian from local calendar date (DD-MM-YYYY). */
export async function fetchGregorianToHijri(dateDdMmYyyy: string): Promise<HijriDayInfo> {
  const { data } = await client.get<GToHResponse>(`/gToH/${dateDdMmYyyy}`);
  if (data.code !== 200 || !data.data) {
    throw new Error('Invalid gToH response');
  }
  const { hijri, gregorian } = data.data;
  const [dd, mm, yy] = gregorian.date.split('-').map(Number);
  const ts = Math.floor(dayjs(`${yy}-${mm}-${dd}`).startOf('day').valueOf() / 1000);
  const readable = `${gregorian.day} ${gregorian.month.en} ${gregorian.year}`;
  return {
    hijriDay: Number(hijri.day),
    hijriMonth: hijri.month.number,
    hijriMonthEn: hijri.month.en,
    hijriYear: Number(hijri.year),
    gregorianDdMmYyyy: gregorian.date,
    gregorianReadable: readable,
    weekdayEn: gregorian.weekday.en,
    timestampSec: ts,
    holidays: hijri.holidays ?? [],
  };
}

/** Full Hijri month: each cell is one Hijri day with matching Gregorian date (live API). */
export async function fetchHijriMonth(hijriMonth: number, hijriYear: number): Promise<HijriDayInfo[]> {
  const { data } = await client.get<HijriCalendarResponse>('/hijriCalendarByCity', {
    params: {
      city: HIJRI_CITY,
      country: HIJRI_COUNTRY,
      month: hijriMonth,
      year: hijriYear,
    },
  });
  if (data.code !== 200 || !Array.isArray(data.data)) {
    throw new Error('Invalid hijri calendar response');
  }
  return data.data.map(parseRow);
}

export type IslamicEventRow = {
  id: string;
  title: string;
  description: string;
  hijriLabel: string;
  gregorianLine: string;
  gregorianDdMmYyyy: string;
  weekdayLine: string;
  timestampSec: number;
  accent: 'secondary' | 'primary' | 'muted';
};

function shortMonth(gregDdMmYyyy: string): string {
  const [d, m] = gregDdMmYyyy.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d} ${months[m - 1] ?? ''}`;
}

function hijriMonthShort(en: string): string {
  const t = en.trim();
  if (t.length <= 3) return t;
  return t.slice(0, 3);
}

/** Build event cards from API holidays (Umm al-Qura / Aladhan). */
export function buildIslamicEventsFromMonth(
  days: HijriDayInfo[],
  todayDdMmYyyy: string,
): IslamicEventRow[] {
  const rows: IslamicEventRow[] = [];
  let n = 0;
  for (const d of days) {
    for (const h of d.holidays) {
      rows.push({
        id: `${d.gregorianDdMmYyyy}-${n++}-${h.slice(0, 24)}`,
        title: h,
        description: 'Aladhan · Umm al-Qura (Makkah reference)',
        hijriLabel: `${d.hijriDay} ${hijriMonthShort(d.hijriMonthEn)}`,
        gregorianLine: shortMonth(d.gregorianDdMmYyyy),
        gregorianDdMmYyyy: d.gregorianDdMmYyyy,
        weekdayLine: d.weekdayEn,
        timestampSec: d.timestampSec,
        accent: 'primary',
      });
    }
  }
  rows.sort((a, b) => a.timestampSec - b.timestampSec);
  return rows.map((r, i) => {
    const isPast = compareDdMmYyyy(r.gregorianDdMmYyyy, todayDdMmYyyy) < 0;
    return {
      ...r,
      accent: isPast ? 'muted' : i % 2 === 0 ? 'secondary' : 'primary',
    } as IslamicEventRow;
  });
}

function compareDdMmYyyy(a: string, b: string): number {
  const [da, ma, ya] = a.split('-').map(Number);
  const [db, mb, yb] = b.split('-').map(Number);
  const ua = ya * 10000 + ma * 100 + da;
  const ub = yb * 10000 + mb * 100 + db;
  return ua - ub;
}
