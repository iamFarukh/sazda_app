import RNFS from 'react-native-fs';
import { fetchSurahReaderData } from '../quranApi';
import {
  OFFLINE_EDITION_AUDIO,
  OFFLINE_EDITION_TEXT,
  OFFLINE_QURAN_VERSION,
} from './constants';
import { clearSurahOfflineData } from './clearSurah';
import { deleteAllOfflineQuranData } from './deleteAll';
import { ensureDir } from './fsUtils';
import {
  countCompleteSurahs,
  createEmptyManifest,
  isFullQuranOffline,
  isManifestEditionOk,
  isManifestVersionOk,
  readManifest,
  writeManifest,
} from './manifest';
import { getAyahAudioAbsPath, getAyahAudioRelPath, getOfflineQuranRoot } from './paths';
import { writeSurahPayload } from './surahFile';
import type { OfflineQuranManifest, StoredAyahRow } from './types';
import { getOfflineQuranHealth } from './reader';
import { sumDirectoryBytes } from './fsUtils';

const PAUSED_ERR = 'PAUSED';
const CANCELLED_ERR = 'CANCELLED';

async function downloadFileWithRetry(
  url: string,
  toFile: string,
  onBytes: (n: number) => void,
  shouldPause: () => boolean,
  shouldCancel: () => boolean,
): Promise<void> {
  const attempts = 4;
  for (let i = 0; i < attempts; i++) {
    if (shouldCancel()) throw new Error(CANCELLED_ERR);
    if (shouldPause()) throw new Error(PAUSED_ERR);
    try {
      const dir = toFile.slice(0, Math.max(0, toFile.lastIndexOf('/')));
      await ensureDir(dir);
      if (await RNFS.exists(toFile)) {
        await RNFS.unlink(toFile);
      }
      const res = await RNFS.downloadFile({ fromUrl: url, toFile }).promise;
      const code = res.statusCode ?? 0;
      const ok = code >= 200 && code < 300;
      if (ok) {
        const st = await RNFS.stat(toFile);
        const sz = Number(st.size ?? 0);
        if (sz > 0) {
          onBytes(sz);
          return;
        }
      }
    } catch (e) {
      if (e instanceof Error && (e.message === PAUSED_ERR || e.message === CANCELLED_ERR)) {
        throw e;
      }
    }
    await new Promise<void>(resolve => setTimeout(resolve, 500 * (i + 1)));
  }
  throw new Error('Audio download failed');
}

async function validateSurahAudioOnDisk(
  surahNumber: number,
  rows: StoredAyahRow[],
): Promise<boolean> {
  const root = getOfflineQuranRoot();
  for (const r of rows) {
    if (!r.remoteAudioUrl || !r.localAudioRel) continue;
    const abs = `${root}/${r.localAudioRel}`;
    const ex = await RNFS.exists(abs);
    if (!ex) return false;
    const st = await RNFS.stat(abs);
    if (Number(st.size ?? 0) <= 0) return false;
  }
  return true;
}

export type DownloadRunnerPatch = {
  job?: 'running' | 'paused' | 'completed' | 'error' | 'idle';
  currentSurah?: number;
  surahsCompleted?: number;
  progress01?: number;
  activeSurahProgress01?: number;
  bytesDownloaded?: number;
  lastError?: string | null;
  statusLine?: string;
  storageBytes?: number;
};

export type SingleSurahResult = 'ok' | 'paused' | 'cancelled' | 'error';

/**
 * Download one surah (text + all ayah audio). Skips work if already complete unless forced.
 */
export async function downloadSingleSurahFull(
  surahNumber: number,
  opts: {
    shouldPause: () => boolean;
    shouldCancel: () => boolean;
    apply: (patch: DownloadRunnerPatch) => void;
    skipIfComplete?: boolean;
  },
): Promise<SingleSurahResult> {
  const { shouldPause, shouldCancel, apply, skipIfComplete = true } = opts;
  let manifest: OfflineQuranManifest = (await readManifest()) ?? createEmptyManifest();
  manifest.version = OFFLINE_QURAN_VERSION;
  manifest.editionText = OFFLINE_EDITION_TEXT;
  manifest.editionAudio = OFFLINE_EDITION_AUDIO;

  const prev = manifest.surahs[String(surahNumber)];
  if (skipIfComplete && prev?.textComplete && prev?.audioComplete) {
    return 'ok';
  }

  let bytesTotal = await sumDirectoryBytes(getOfflineQuranRoot());

  apply({
    currentSurah: surahNumber,
    statusLine: `Downloading Surah ${surahNumber}…`,
    activeSurahProgress01: 0.02,
  });

  if (shouldCancel()) return 'cancelled';
  if (shouldPause()) return 'paused';

  const { surah, ayahs } = await fetchSurahReaderData(surahNumber);
  const storedAyahs: StoredAyahRow[] = ayahs.map(a => ({
    numberInSurah: a.numberInSurah,
    arabic: a.arabic,
    translation: a.translation,
    remoteAudioUrl: a.audioUrl,
    localAudioRel: a.audioUrl ? getAyahAudioRelPath(surahNumber, a.numberInSurah, a.audioUrl) : null,
  }));

  await writeSurahPayload(surahNumber, { surah, ayahs: storedAyahs });
  manifest.surahs[String(surahNumber)] = {
    textComplete: true,
    audioComplete: false,
    expectedAyahs: surah.numberOfAyahs,
    ayahsWithAudio: storedAyahs.filter(x => x.remoteAudioUrl).length,
  };
  await writeManifest(manifest);

  const withAudio = storedAyahs.filter(x => x.remoteAudioUrl && x.localAudioRel);
  let audioDone = 0;
  const nAudio = Math.max(1, withAudio.length);

  for (const row of withAudio) {
    if (shouldCancel()) return 'cancelled';
    if (shouldPause()) return 'paused';

    const url = row.remoteAudioUrl!;
    const abs = getAyahAudioAbsPath(surahNumber, row.numberInSurah, url);
    const ex = await RNFS.exists(abs);
    if (ex) {
      const st = await RNFS.stat(abs);
      if (Number(st.size ?? 0) > 0) {
        audioDone += 1;
        const frac = 0.02 + 0.98 * (audioDone / nAudio);
        apply({
          activeSurahProgress01: frac,
          statusLine: `Surah ${surahNumber}: audio ${audioDone}/${withAudio.length}`,
        });
        continue;
      }
    }
    try {
      await downloadFileWithRetry(
        url,
        abs,
        bt => {
          bytesTotal += bt;
          apply({ bytesDownloaded: bytesTotal });
        },
        shouldPause,
        shouldCancel,
      );
    } catch (e) {
      if (e instanceof Error && e.message === CANCELLED_ERR) return 'cancelled';
      if (e instanceof Error && e.message === PAUSED_ERR) return 'paused';
      throw e;
    }
    audioDone += 1;
    bytesTotal = await sumDirectoryBytes(getOfflineQuranRoot());
    apply({
      activeSurahProgress01: 0.02 + 0.98 * (audioDone / nAudio),
      statusLine: `Surah ${surahNumber}: audio ${audioDone}/${withAudio.length}`,
      bytesDownloaded: bytesTotal,
      storageBytes: bytesTotal,
    });
  }

  const audioOk = await validateSurahAudioOnDisk(surahNumber, storedAyahs);
  manifest = (await readManifest()) ?? manifest;
  manifest.surahs[String(surahNumber)] = {
    textComplete: true,
    audioComplete: audioOk,
    expectedAyahs: surah.numberOfAyahs,
    ayahsWithAudio: withAudio.length,
  };
  await writeManifest(manifest);

  if (!audioOk) {
    apply({
      lastError: `Validation failed for surah ${surahNumber}. Tap retry to try again.`,
      storageBytes: await sumDirectoryBytes(getOfflineQuranRoot()),
    });
    return 'error';
  }

  bytesTotal = await sumDirectoryBytes(getOfflineQuranRoot());
  apply({
    bytesDownloaded: bytesTotal,
    storageBytes: bytesTotal,
    activeSurahProgress01: 1,
    statusLine: `Saved Surah ${surahNumber}`,
  });
  return 'ok';
}

export async function runOfflineDownloadQueue(opts: {
  shouldPause: () => boolean;
  shouldCancel: () => boolean;
  getQueue: () => number[];
  setQueue: (next: number[]) => void;
  apply: (patch: DownloadRunnerPatch) => void;
  /** Reset UI cancel flag after a cancelled surah is removed from the queue. */
  onCancelProcessed?: () => void;
  onFinally?: () => void;
}): Promise<void> {
  const { shouldPause, shouldCancel, getQueue, setQueue, apply, onCancelProcessed, onFinally } = opts;
  try {
    const health = await getOfflineQuranHealth();
    if (health.needsUpdate) {
      await deleteAllOfflineQuranData();
      setQueue([]);
    }

    while (true) {
      const qPeek = getQueue();
      if (qPeek.length === 0) {
        const manifest = (await readManifest()) ?? createEmptyManifest();
        const bytes = await sumDirectoryBytes(getOfflineQuranRoot());
        const done = countCompleteSurahs(manifest);
        const full = isFullQuranOffline(manifest);
        apply({
          job: full ? 'completed' : 'idle',
          currentSurah: 0,
          activeSurahProgress01: 0,
          surahsCompleted: done,
          progress01: full ? 1 : done / 114,
          lastError: null,
          statusLine: full
            ? 'Full Quran is saved on this device.'
            : 'Tap the cloud on any surah to add it to your queue.',
          storageBytes: bytes,
        });
        return;
      }

      if (shouldPause() && !shouldCancel()) {
        apply({
          job: 'paused',
          statusLine: 'Download paused.',
          storageBytes: await sumDirectoryBytes(getOfflineQuranRoot()),
        });
        return;
      }

      const manifestBefore = (await readManifest()) ?? createEmptyManifest();
      const completedBefore = countCompleteSurahs(manifestBefore);

      const s = getQueue()[0];
      apply({
        job: 'running',
        currentSurah: s,
        lastError: null,
        statusLine: `Downloading Surah ${s}…`,
        surahsCompleted: completedBefore,
        progress01: Math.min(1, (completedBefore + 0.02) / 114),
      });

      const result = await downloadSingleSurahFull(s, {
        shouldPause,
        shouldCancel,
        skipIfComplete: true,
        apply: patch => {
          const frac = patch.activeSurahProgress01 ?? 0;
          apply({
            ...patch,
            progress01: Math.min(1, (completedBefore + frac) / 114),
            surahsCompleted: completedBefore,
          });
        },
      });

      const completedAfter = countCompleteSurahs(await readManifest());
      const bytes = await sumDirectoryBytes(getOfflineQuranRoot());

      if (result === 'paused') {
        apply({
          job: 'paused',
          statusLine: 'Download paused.',
          currentSurah: s,
          surahsCompleted: completedAfter,
          progress01: completedAfter / 114,
          storageBytes: bytes,
        });
        return;
      }

      if (result === 'cancelled') {
        await clearSurahOfflineData(s);
        setQueue(getQueue().slice(1));
        const done = countCompleteSurahs(await readManifest());
        onCancelProcessed?.();
        apply({
          currentSurah: 0,
          activeSurahProgress01: 0,
          surahsCompleted: done,
          progress01: done / 114,
          storageBytes: await sumDirectoryBytes(getOfflineQuranRoot()),
          statusLine: 'Surah removed from queue.',
          job: 'running',
        });
        continue;
      }

      if (result === 'error') {
        apply({
          job: 'error',
          currentSurah: s,
          surahsCompleted: completedAfter,
          storageBytes: bytes,
        });
        return;
      }

      setQueue(getQueue().slice(1));
      apply({
        surahsCompleted: completedAfter,
        progress01: completedAfter / 114,
        bytesDownloaded: bytes,
        storageBytes: bytes,
        activeSurahProgress01: 0,
        currentSurah: 0,
        statusLine: `Surah ${s} ready offline.`,
        job: 'running',
      });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    apply({
      job: 'error',
      lastError: msg || 'Download failed',
      storageBytes: await sumDirectoryBytes(getOfflineQuranRoot()),
    });
  } finally {
    onFinally?.();
  }
}

/** Sequential download of every incomplete surah (1–114). */
export async function runFullOfflineDownload(opts: {
  shouldPause: () => boolean;
  shouldCancel: () => boolean;
  apply: (patch: DownloadRunnerPatch) => void;
  onFinally?: () => void;
}): Promise<void> {
  const { shouldPause, shouldCancel, apply, onFinally } = opts;
  try {
    const health = await getOfflineQuranHealth();
    if (health.needsUpdate) {
      await deleteAllOfflineQuranData();
    }

    let manifest: OfflineQuranManifest = (await readManifest()) ?? createEmptyManifest();
    if (!isManifestVersionOk(manifest) || !isManifestEditionOk(manifest)) {
      manifest = createEmptyManifest();
    }
    manifest.version = OFFLINE_QURAN_VERSION;
    manifest.editionText = OFFLINE_EDITION_TEXT;
    manifest.editionAudio = OFFLINE_EDITION_AUDIO;

    if (isFullQuranOffline(manifest) && !shouldPause()) {
      const bytes = await sumDirectoryBytes(getOfflineQuranRoot());
      apply({
        job: 'completed',
        progress01: 1,
        currentSurah: 114,
        surahsCompleted: 114,
        lastError: null,
        statusLine: 'Full Quran is saved on this device.',
        storageBytes: bytes,
      });
      return;
    }

    let bytesTotal = await sumDirectoryBytes(getOfflineQuranRoot());
    const done0 = countCompleteSurahs(manifest);
    apply({
      job: 'running',
      lastError: null,
      bytesDownloaded: bytesTotal,
      surahsCompleted: done0,
      progress01: done0 / 114,
    });

    for (let s = 1; s <= 114; s++) {
      if (shouldCancel()) {
        apply({ job: 'idle', storageBytes: await sumDirectoryBytes(getOfflineQuranRoot()) });
        return;
      }
      if (shouldPause()) {
        const done = countCompleteSurahs(await readManifest());
        apply({
          job: 'paused',
          statusLine: 'Download paused.',
          currentSurah: s,
          surahsCompleted: done,
          progress01: done / 114,
          storageBytes: await sumDirectoryBytes(getOfflineQuranRoot()),
        });
        return;
      }

      manifest = (await readManifest()) ?? manifest;
      const ent = manifest.surahs[String(s)];
      if (ent?.textComplete && ent?.audioComplete) {
        const done = countCompleteSurahs(manifest);
        apply({
          currentSurah: s,
          surahsCompleted: done,
          progress01: done / 114,
          statusLine: `Surah ${s} of 114 (already saved)`,
        });
        continue;
      }

      const completedBefore = countCompleteSurahs(manifest);
      const r = await downloadSingleSurahFull(s, {
        shouldPause,
        shouldCancel,
        skipIfComplete: true,
        apply: patch => {
          const frac = patch.activeSurahProgress01 ?? 0;
          apply({
            ...patch,
            progress01: Math.min(1, (completedBefore + frac) / 114),
            surahsCompleted: completedBefore,
          });
        },
      });

      manifest = (await readManifest()) ?? manifest;
      const completedAfter = countCompleteSurahs(manifest);
      bytesTotal = await sumDirectoryBytes(getOfflineQuranRoot());

      if (r === 'paused') {
        apply({
          job: 'paused',
          statusLine: 'Download paused.',
          currentSurah: s,
          surahsCompleted: completedAfter,
          progress01: completedAfter / 114,
          storageBytes: bytesTotal,
        });
        return;
      }
      if (r === 'cancelled') {
        apply({ job: 'idle', storageBytes: bytesTotal });
        return;
      }
      if (r === 'error') {
        apply({
          job: 'error',
          currentSurah: s,
          surahsCompleted: completedAfter,
          storageBytes: bytesTotal,
        });
        return;
      }
    }

    apply({
      job: 'completed',
      progress01: 1,
      currentSurah: 114,
      surahsCompleted: 114,
      lastError: null,
      statusLine: 'Full Quran downloaded for offline use.',
      storageBytes: await sumDirectoryBytes(getOfflineQuranRoot()),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === PAUSED_ERR) {
      apply({
        job: 'paused',
        statusLine: 'Download paused.',
        storageBytes: await sumDirectoryBytes(getOfflineQuranRoot()),
      });
    } else {
      apply({
        job: 'error',
        lastError: msg || 'Download failed',
        storageBytes: await sumDirectoryBytes(getOfflineQuranRoot()),
      });
    }
  } finally {
    onFinally?.();
  }
}

export async function repairSurahAudioOnly(
  surahNumber: number,
  shouldPause: () => boolean,
  apply: (patch: DownloadRunnerPatch) => void,
): Promise<void> {
  const manifest = await readManifest();
  if (!manifest) return;

  apply({ statusLine: `Repairing surah ${surahNumber}…`, job: 'running' });
  const r = await downloadSingleSurahFull(surahNumber, {
    shouldPause,
    shouldCancel: () => false,
    skipIfComplete: false,
    apply,
  });
  const audioOk = r === 'ok';
  apply({
    job: 'idle',
    statusLine: audioOk ? `Surah ${surahNumber} repaired.` : 'Repair incomplete.',
    storageBytes: await sumDirectoryBytes(getOfflineQuranRoot()),
  });
}
