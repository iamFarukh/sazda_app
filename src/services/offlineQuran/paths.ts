import RNFS from 'react-native-fs';
import {
  OFFLINE_QURAN_ROOT_DIR,
  OFFLINE_QURAN_VERSION,
} from './constants';

export function getOfflineQuranRoot(): string {
  return `${RNFS.DocumentDirectoryPath}/${OFFLINE_QURAN_ROOT_DIR}/v${OFFLINE_QURAN_VERSION}`;
}

export function getManifestPath(): string {
  return `${getOfflineQuranRoot()}/manifest.json`;
}

export function getSurahJsonPath(surahNumber: number): string {
  const n = String(surahNumber).padStart(3, '0');
  return `${getOfflineQuranRoot()}/surah/${n}.json`;
}

export function getAyahAudioRelPath(
  surahNumber: number,
  ayahNumber: number,
  remoteUrl?: string,
): string {
  const s = String(surahNumber).padStart(3, '0');
  const a = String(ayahNumber).padStart(3, '0');
  const ext = remoteUrl ? audioExtFromUrl(remoteUrl) : '.mp3';
  const e = ext.startsWith('.') ? ext : `.${ext}`;
  return `audio/${s}/${a}${e}`;
}

export function getAyahAudioAbsPath(
  surahNumber: number,
  ayahNumber: number,
  remoteUrl?: string,
): string {
  return `${getOfflineQuranRoot()}/${getAyahAudioRelPath(surahNumber, ayahNumber, remoteUrl)}`;
}

export function audioExtFromUrl(url: string): string {
  const clean = url.split('?')[0] ?? url;
  const last = clean.split('.').pop()?.toLowerCase();
  if (last === 'mp3' || last === 'm4a' || last === 'aac') return `.${last}`;
  return '.mp3';
}
