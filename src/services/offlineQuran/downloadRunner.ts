import { fetchSurahReaderDataWithRetry } from '../quranApi';
import {
  OFFLINE_EDITION_AUDIO,
  OFFLINE_EDITION_TEXT,
  OFFLINE_QURAN_VERSION,
} from './constants';
import { clearSurahOfflineData } from './clearSurah';
import { deleteAllOfflineQuranData } from './deleteAll';
import {
  countCompleteSurahs,
  createEmptyManifest,
  isFullQuranOffline,
  isManifestEditionOk,
  isManifestVersionOk,
  readManifest,
  writeManifest,
} from './manifest';
import { getOfflineQuranRoot } from './paths';
import { writeSurahPayload } from './surahFile';
import type { OfflineQuranManifest, StoredAyahRow } from './types';
import { getOfflineQuranHealth } from './reader';
import { sumDirectoryBytes } from './fsUtils';
import { validateSurahPayload } from './validatePayload';

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
 * Download one surah: Arabic + translation + per-ayah audio **URLs** (JSON only).
 * Audio files are not stored; playback streams from URLs. Validates before marking complete.
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
    activeSurahProgress01: 0.15,
  });

  if (shouldCancel()) return 'cancelled';
  if (shouldPause()) return 'paused';

  const { surah, ayahs } = await fetchSurahReaderDataWithRetry(surahNumber);

  const storedAyahs: StoredAyahRow[] = ayahs.map(a => ({
    numberInSurah: a.numberInSurah,
    arabic: a.arabic,
    translation: a.translation,
    remoteAudioUrl: a.audioUrl ?? null,
    localAudioRel: null,
  }));

  const payload = { surah, ayahs: storedAyahs };
  const validation = validateSurahPayload(payload);
  if (!validation.ok) {
    apply({
      lastError: validation.reason,
      storageBytes: await sumDirectoryBytes(getOfflineQuranRoot()),
    });
    return 'error';
  }

  await writeSurahPayload(surahNumber, payload);

  manifest = (await readManifest()) ?? manifest;
  manifest.surahs[String(surahNumber)] = {
    textComplete: true,
    audioComplete: true,
    expectedAyahs: surah.numberOfAyahs,
    ayahsWithAudio: storedAyahs.filter(x => x.remoteAudioUrl).length,
  };
  await writeManifest(manifest);

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
    apply({
      job: 'error',
      lastError: msg || 'Download failed',
      storageBytes: await sumDirectoryBytes(getOfflineQuranRoot()),
    });
  } finally {
    onFinally?.();
  }
}

/** Re-download and validate one surah (e.g. after corruption). */
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
  const ok = r === 'ok';
  apply({
    job: 'idle',
    statusLine: ok ? `Surah ${surahNumber} repaired.` : 'Repair incomplete.',
    storageBytes: await sumDirectoryBytes(getOfflineQuranRoot()),
  });
}
