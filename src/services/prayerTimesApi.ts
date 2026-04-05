import axios from 'axios';

const client = axios.create({
  baseURL: 'https://api.aladhan.com/v1',
  timeout: 20_000,
});

/** Timings we use (12-hour strings from API, local wall time for the location). */
export type PrayerTimingsDay = {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Sunset: string;
  Maghrib: string;
  Isha: string;
};

type TimingsResponse = {
  data: { timings: PrayerTimingsDay };
};

/**
 * @param dateDdMmYyyy e.g. "20-03-2026"
 * @param method Aladhan calculation method (2 = ISNA; 3 = MWL; 5 = Egyptian)
 */
export async function fetchPrayerTimings(
  latitude: number,
  longitude: number,
  dateDdMmYyyy: string,
  method: number = 2,
): Promise<PrayerTimingsDay> {
  const { data } = await client.get<TimingsResponse>(`/timings/${dateDdMmYyyy}`, {
    params: { latitude, longitude, method },
  });
  if (!data?.data?.timings) {
    throw new Error('Invalid prayer times response');
  }
  return data.data.timings;
}
