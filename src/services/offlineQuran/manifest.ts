import RNFS from 'react-native-fs';
import {
  OFFLINE_EDITION_AUDIO,
  OFFLINE_EDITION_TEXT,
  OFFLINE_QURAN_VERSION,
} from './constants';
import { ensureDir } from './fsUtils';
import { getManifestPath, getOfflineQuranRoot } from './paths';
import type { OfflineQuranManifest, SurahOfflineEntry } from './types';

export function createEmptyManifest(): OfflineQuranManifest {
  return {
    version: OFFLINE_QURAN_VERSION,
    editionText: OFFLINE_EDITION_TEXT,
    editionAudio: OFFLINE_EDITION_AUDIO,
    updatedAt: Date.now(),
    surahs: {},
  };
}

export async function readManifest(): Promise<OfflineQuranManifest | null> {
  const p = getManifestPath();
  try {
    const exists = await RNFS.exists(p);
    if (!exists) return null;
    const raw = await RNFS.readFile(p, 'utf8');
    const parsed = JSON.parse(raw) as OfflineQuranManifest;
    if (!parsed || typeof parsed.version !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function writeManifest(m: OfflineQuranManifest): Promise<void> {
  const root = getOfflineQuranRoot();
  await ensureDir(root);
  m.updatedAt = Date.now();
  await RNFS.writeFile(getManifestPath(), JSON.stringify(m), 'utf8');
}

export function isManifestVersionOk(m: OfflineQuranManifest | null): boolean {
  if (!m) return true;
  return m.version === OFFLINE_QURAN_VERSION;
}

export function isManifestEditionOk(m: OfflineQuranManifest | null): boolean {
  if (!m) return true;
  return m.editionText === OFFLINE_EDITION_TEXT && m.editionAudio === OFFLINE_EDITION_AUDIO;
}

export function getSurahEntry(
  m: OfflineQuranManifest | null,
  surahNumber: number,
): SurahOfflineEntry | undefined {
  return m?.surahs[String(surahNumber)];
}

export function isSurahFullyOffline(
  m: OfflineQuranManifest | null,
  surahNumber: number,
): boolean {
  if (!m || !isManifestVersionOk(m) || !isManifestEditionOk(m)) return false;
  const e = m.surahs[String(surahNumber)];
  return Boolean(e?.textComplete && e?.audioComplete);
}

export function countCompleteSurahs(m: OfflineQuranManifest | null): number {
  if (!m || !isManifestVersionOk(m) || !isManifestEditionOk(m)) return 0;
  let n = 0;
  for (let i = 1; i <= 114; i++) {
    const e = m.surahs[String(i)];
    if (e?.textComplete && e?.audioComplete) n += 1;
  }
  return n;
}

export function isFullQuranOffline(m: OfflineQuranManifest | null): boolean {
  return countCompleteSurahs(m) === 114;
}
