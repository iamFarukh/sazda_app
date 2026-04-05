import axios from 'axios';

const client = axios.create({
  baseURL: 'https://api.alquran.cloud/v1',
  timeout: 25_000,
});

export type QuranApiSurah = {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
};

export type QuranApiAyah = {
  number: number;
  text: string;
  numberInSurah: number;
  juz?: number;
  page?: number;
  audio?: string;
};

/** One row for the reader: Arabic + optional translation + ayah audio URL. */
export type AyahReaderRow = {
  numberInSurah: number;
  arabic: string;
  translation?: string;
  audioUrl?: string | null;
};

type SurahListResponse = { data: QuranApiSurah[] };
type SurahDetailResponse = { data: QuranApiSurah & { ayahs: QuranApiAyah[] } };
type EditionSurah = QuranApiSurah & {
  ayahs: QuranApiAyah[];
  edition: { identifier: string };
};

export async function fetchAllSurahs(): Promise<QuranApiSurah[]> {
  const { data } = await client.get<SurahListResponse>('/surah');
  if (!Array.isArray(data.data)) {
    throw new Error('Invalid surah list response');
  }
  return data.data;
}

export async function fetchSurahAyahs(surahNumber: number): Promise<{
  surah: QuranApiSurah;
  ayahs: QuranApiAyah[];
}> {
  const { data } = await client.get<SurahDetailResponse>(`/surah/${surahNumber}/quran-uthmani`);
  const payload = data.data;
  const { ayahs, ...surah } = payload;
  if (!ayahs?.length) {
    throw new Error('No ayahs in response');
  }
  return { surah, ayahs };
}

/**
 * Arabic (Uthmani) + English (Sahih International) + per-ayah audio (Mishary Alafasy).
 */
export async function fetchSurahReaderData(surahNumber: number): Promise<{
  surah: QuranApiSurah;
  ayahs: AyahReaderRow[];
}> {
  const [editionsRes, audioRes] = await Promise.all([
    client.get<{ data: EditionSurah[] }>(`/surah/${surahNumber}/editions/quran-uthmani,en.sahih`),
    client.get<SurahDetailResponse>(`/surah/${surahNumber}/ar.alafasy`),
  ]);

  const editions = editionsRes.data.data;
  const arabicEdition = editions.find(e => e.edition.identifier === 'quran-uthmani');
  const enEdition = editions.find(e => e.edition.identifier === 'en.sahih');
  if (!arabicEdition?.ayahs?.length) {
    throw new Error('Arabic text missing');
  }

  const audioPayload = audioRes.data.data;
  const audioAyahs = audioPayload.ayahs;
  const audioMap = new Map<number, string | undefined>();
  audioAyahs?.forEach(a => {
    if (a.audio) audioMap.set(a.numberInSurah, a.audio);
  });

  const arAyahs = arabicEdition.ayahs;
  const surah: QuranApiSurah = {
    number: arabicEdition.number,
    name: arabicEdition.name,
    englishName: arabicEdition.englishName,
    englishNameTranslation: arabicEdition.englishNameTranslation,
    numberOfAyahs: arabicEdition.numberOfAyahs,
    revelationType: arabicEdition.revelationType,
  };

  const enByNum = new Map<number, string>();
  enEdition?.ayahs?.forEach(a => {
    enByNum.set(a.numberInSurah, a.text?.trim() ?? '');
  });

  const ayahs: AyahReaderRow[] = arAyahs.map(a => ({
    numberInSurah: a.numberInSurah,
    arabic: a.text.trim(),
    translation: enByNum.get(a.numberInSurah),
    audioUrl: audioMap.get(a.numberInSurah) ?? null,
  }));

  return { surah, ayahs };
}

export type AyahTafsirResult = {
  text: string;
  editionName: string;
  editionIdentifier: string;
};

/** Arabic tafsir (King Fahad Quran Complex — al-Muyassar). */
export async function fetchAyahTafsir(
  surahNumber: number,
  ayahNumber: number,
  editionId: string = 'ar.muyassar',
): Promise<AyahTafsirResult> {
  const { data } = await client.get<{
    data: {
      text: string;
      edition: { identifier: string; englishName?: string; name?: string };
    }[];
  }>(`/ayah/${surahNumber}:${ayahNumber}/editions/${editionId}`);

  const row = data.data?.[0];
  if (!row?.text) {
    throw new Error('Tafsir not available');
  }
  return {
    text: row.text.trim(),
    editionName: row.edition.englishName ?? row.edition.name ?? editionId,
    editionIdentifier: row.edition.identifier,
  };
}
