import type { QuranApiSurah } from '../quranApi';

export type SurahOfflineEntry = {
  /** Arabic + English text stored and validated. */
  textComplete: boolean;
  /** Per-ayah audio URLs stored in JSON (streaming; not necessarily cached on disk). */
  audioComplete: boolean;
  expectedAyahs: number;
  ayahsWithAudio: number;
};

export type OfflineQuranManifest = {
  version: number;
  editionText: string;
  editionAudio: string;
  updatedAt: number;
  /** Keys "1" … "114" */
  surahs: Record<string, SurahOfflineEntry>;
};

export type StoredAyahRow = {
  numberInSurah: number;
  arabic: string;
  translation?: string;
  remoteAudioUrl?: string | null;
  /** Relative to offline root, e.g. audio/001/005.mp3 */
  localAudioRel?: string | null;
};

export type SurahOfflinePayload = {
  surah: QuranApiSurah;
  ayahs: StoredAyahRow[];
};
