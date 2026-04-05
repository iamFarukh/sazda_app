import RNFS from 'react-native-fs';
import { fetchSurahReaderData, type AyahReaderRow } from '../quranApi';
import { getOfflineQuranRoot } from './paths';
import {
  isSurahFullyOffline,
  readManifest,
  isManifestVersionOk,
  isManifestEditionOk,
} from './manifest';
import { readSurahPayload } from './surahFile';

function toFileUri(absPath: string): string {
  if (absPath.startsWith('file://')) return absPath;
  return `file://${absPath}`;
}

export async function loadSurahReaderDataOfflineFirst(surahNumber: number): Promise<{
  surah: import('../quranApi').QuranApiSurah;
  ayahs: AyahReaderRow[];
}> {
  const manifest = await readManifest();
  if (isSurahFullyOffline(manifest, surahNumber)) {
    const local = await readOfflineSurahReaderRows(surahNumber);
    if (local) return local;
  }
  return fetchSurahReaderData(surahNumber);
}

export async function readOfflineSurahReaderRows(surahNumber: number): Promise<{
  surah: import('../quranApi').QuranApiSurah;
  ayahs: AyahReaderRow[];
} | null> {
  const manifest = await readManifest();
  if (!isSurahFullyOffline(manifest, surahNumber)) return null;
  const payload = await readSurahPayload(surahNumber);
  if (!payload?.surah || !payload.ayahs?.length) return null;

  const root = getOfflineQuranRoot();
  const ayahs: AyahReaderRow[] = [];
  for (const row of payload.ayahs) {
    let audioUrl: string | null | undefined = row.remoteAudioUrl ?? null;
    if (row.localAudioRel) {
      const abs = `${root}/${row.localAudioRel}`;
      const ok = await RNFS.exists(abs);
      if (ok) {
        audioUrl = toFileUri(abs);
      }
    }
    ayahs.push({
      numberInSurah: row.numberInSurah,
      arabic: row.arabic,
      translation: row.translation,
      audioUrl,
    });
  }
  return { surah: payload.surah, ayahs };
}

/** Public helper for UI: surah ready for offline-only read without hitting API. */
export async function canReadSurahOffline(surahNumber: number): Promise<boolean> {
  const m = await readManifest();
  return isSurahFullyOffline(m, surahNumber);
}

export type OfflineQuranHealth = {
  needsUpdate: boolean;
  reason: 'none' | 'version' | 'edition';
};

export async function getOfflineQuranHealth(): Promise<OfflineQuranHealth> {
  const m = await readManifest();
  if (!m) return { needsUpdate: false, reason: 'none' };
  if (!isManifestVersionOk(m)) return { needsUpdate: true, reason: 'version' };
  if (!isManifestEditionOk(m)) return { needsUpdate: true, reason: 'edition' };
  return { needsUpdate: false, reason: 'none' };
}
