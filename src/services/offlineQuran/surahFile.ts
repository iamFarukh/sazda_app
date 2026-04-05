import RNFS from 'react-native-fs';
import { getOfflineQuranRoot, getSurahJsonPath } from './paths';
import type { SurahOfflinePayload } from './types';
import { ensureDir } from './fsUtils';

export async function writeSurahPayload(
  surahNumber: number,
  payload: SurahOfflinePayload,
): Promise<void> {
  const root = getOfflineQuranRoot();
  await ensureDir(`${root}/surah`);
  await RNFS.writeFile(getSurahJsonPath(surahNumber), JSON.stringify(payload), 'utf8');
}

export async function readSurahPayload(
  surahNumber: number,
): Promise<SurahOfflinePayload | null> {
  const p = getSurahJsonPath(surahNumber);
  try {
    const exists = await RNFS.exists(p);
    if (!exists) return null;
    const raw = await RNFS.readFile(p, 'utf8');
    return JSON.parse(raw) as SurahOfflinePayload;
  } catch {
    return null;
  }
}
