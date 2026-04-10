import type { AyahReaderRow, QuranApiSurah } from '../quranApi';
import {
  OFFLINE_EDITION_AUDIO,
  OFFLINE_EDITION_TEXT,
  OFFLINE_QURAN_VERSION,
} from './constants';
import {
  createEmptyManifest,
  readManifest,
  writeManifest,
} from './manifest';
import { writeSurahPayload } from './surahFile';
import type { StoredAyahRow, SurahOfflinePayload } from './types';
import { validateSurahPayload } from './validatePayload';

/**
 * After a successful network fetch when opening a surah, persist text + audio URLs locally
 * (no audio file downloads). Silent no-op if validation fails.
 */
export async function persistSurahOnDemandAfterFetch(
  surahNumber: number,
  data: { surah: QuranApiSurah; ayahs: AyahReaderRow[] },
): Promise<void> {
  const storedAyahs: StoredAyahRow[] = data.ayahs.map(a => ({
    numberInSurah: a.numberInSurah,
    arabic: a.arabic,
    translation: a.translation,
    remoteAudioUrl: a.audioUrl ?? null,
    localAudioRel: null,
  }));

  const payload: SurahOfflinePayload = {
    surah: data.surah,
    ayahs: storedAyahs,
  };

  const v = validateSurahPayload(payload);
  if (!v.ok) return;

  await writeSurahPayload(surahNumber, payload);

  let m = (await readManifest()) ?? createEmptyManifest();
  m.version = OFFLINE_QURAN_VERSION;
  m.editionText = OFFLINE_EDITION_TEXT;
  m.editionAudio = OFFLINE_EDITION_AUDIO;
  m.surahs[String(surahNumber)] = {
    textComplete: true,
    audioComplete: true,
    expectedAyahs: data.surah.numberOfAyahs,
    ayahsWithAudio: storedAyahs.filter(x => x.remoteAudioUrl).length,
  };
  await writeManifest(m);
}
