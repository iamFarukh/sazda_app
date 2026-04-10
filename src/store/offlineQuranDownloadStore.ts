import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkv } from '../services/storage';
import { deleteAllOfflineQuranData } from '../services/offlineQuran/deleteAll';
import { clearSurahReaderMemoryCache } from '../services/offlineQuran/surahMemoryCache';
import { runFullOfflineDownload, runOfflineDownloadQueue } from '../services/offlineQuran/downloadRunner';
import { sumDirectoryBytes } from '../services/offlineQuran/fsUtils';
import {
  countCompleteSurahs,
  isFullQuranOffline,
  isSurahFullyOffline,
  readManifest,
} from '../services/offlineQuran/manifest';
import { getOfflineQuranRoot } from '../services/offlineQuran/paths';

/** First-visit Quran tab auto-download queue (MMKV). */
const OFFLINE_QURAN_BOOTSTRAP_MMKV_KEY = 'offline-quran-bootstrap-v2';
const PRIORITY_BOOTSTRAP = [1, 36, 67, 112] as const;
const PRIORITY_BOOTSTRAP_SET = new Set<number>(PRIORITY_BOOTSTRAP);

export type OfflineDownloadJob = 'idle' | 'running' | 'paused' | 'completed' | 'error';

type State = {
  /** Persisted: user-chosen download order. */
  queue: number[];
  cancelRequested: boolean;
  job: OfflineDownloadJob;
  pauseRequested: boolean;
  runnerBusy: boolean;
  currentSurah: number;
  surahsCompleted: number;
  progress01: number;
  activeSurahProgress01: number;
  bytesDownloaded: number;
  storageBytes: number;
  lastError: string | null;
  statusLine: string;

  bootstrap: () => Promise<void>;
  enqueueSurah: (surahNumber: number) => void;
  removeQueuedSurah: (surahNumber: number) => void;
  cancelActiveSurah: () => void;
  startQueueProcessor: () => void;
  downloadAllMissingSurahs: () => Promise<void>;
  pauseDownload: () => void;
  resumeDownload: () => void;
  retryAfterError: () => void;
  deleteAllData: () => Promise<void>;
  refreshStorage: () => Promise<void>;
  /** Legacy: download every missing surah in order without using the queue UI. */
  runFullDownloadSequential: () => void;
};

const mmkvStorage = createJSONStorage(() => ({
  getItem: (name: string) => mmkv.getString(name) ?? null,
  setItem: (name: string, value: string) => mmkv.set(name, value),
  removeItem: (name: string) => mmkv.remove(name),
}));

function applyPatch(
  set: (partial: Partial<State>) => void,
  patch: import('../services/offlineQuran/downloadRunner').DownloadRunnerPatch,
) {
  const next: Partial<State> = {};
  if (patch.job !== undefined) next.job = patch.job;
  if (patch.currentSurah !== undefined) next.currentSurah = patch.currentSurah;
  if (patch.surahsCompleted !== undefined) next.surahsCompleted = patch.surahsCompleted;
  if (patch.progress01 !== undefined) next.progress01 = patch.progress01;
  if (patch.activeSurahProgress01 !== undefined) next.activeSurahProgress01 = patch.activeSurahProgress01;
  if (patch.bytesDownloaded !== undefined) next.bytesDownloaded = patch.bytesDownloaded;
  if (patch.lastError !== undefined) next.lastError = patch.lastError;
  if (patch.statusLine !== undefined) next.statusLine = patch.statusLine;
  if (patch.storageBytes !== undefined) next.storageBytes = patch.storageBytes;
  set(next);
}

export const useOfflineQuranDownloadStore = create<State>()(
  persist(
    (set, get) => ({
      queue: [],
      cancelRequested: false,
      job: 'idle',
      pauseRequested: false,
      runnerBusy: false,
      currentSurah: 0,
      surahsCompleted: 0,
      progress01: 0,
      activeSurahProgress01: 0,
      bytesDownloaded: 0,
      storageBytes: 0,
      lastError: null,
      statusLine: '',

      bootstrap: async () => {
        const m = await readManifest();
        const bytes = await sumDirectoryBytes(getOfflineQuranRoot());
        const full = isFullQuranOffline(m);
        const done = countCompleteSurahs(m);
        const prev = get();
        let nextJob: OfflineDownloadJob;
        if (full) nextJob = 'completed';
        else if (prev.job === 'running' || prev.job === 'paused' || prev.job === 'error') {
          nextJob = prev.job;
        } else nextJob = 'idle';

        const statusLine =
          prev.job === 'running' && prev.statusLine
            ? prev.statusLine
            : full
              ? 'Full Quran is available offline.'
              : done > 0
                ? `${done} surahs saved. Add more from the list below.`
                : 'Choose surahs to download — Arabic, English, and streaming audio URLs.';

        set({
          storageBytes: bytes,
          surahsCompleted: done,
          progress01: full ? 1 : Math.max(prev.progress01, done / 114),
          job: nextJob,
          bytesDownloaded: bytes,
          activeSurahProgress01: prev.job === 'running' ? prev.activeSurahProgress01 : 0,
          statusLine,
        });
      },

      refreshStorage: async () => {
        const bytes = await sumDirectoryBytes(getOfflineQuranRoot());
        set({ storageBytes: bytes, bytesDownloaded: bytes });
      },

      enqueueSurah: (surahNumber: number) => {
        if (surahNumber < 1 || surahNumber > 114) return;
        const { queue } = get();
        if (queue.includes(surahNumber)) return;
        set({ queue: [...queue, surahNumber], lastError: null });
        const after = get();
        if (!after.runnerBusy && after.job !== 'paused') {
          after.startQueueProcessor();
        }
      },

      removeQueuedSurah: (surahNumber: number) => {
        const { queue, job, runnerBusy } = get();
        const head = queue[0];
        if (head === surahNumber && job === 'running' && runnerBusy) {
          set({ cancelRequested: true });
          return;
        }
        set({ queue: queue.filter(n => n !== surahNumber) });
      },

      cancelActiveSurah: () => {
        const { job, runnerBusy } = get();
        if (job !== 'running' || !runnerBusy) return;
        set({ cancelRequested: true });
      },

      startQueueProcessor: () => {
        if (get().runnerBusy) return;
        if (get().queue.length === 0) return;
        set({
          runnerBusy: true,
          job: 'running',
          pauseRequested: false,
          cancelRequested: false,
          lastError: null,
        });
        void runOfflineDownloadQueue({
          shouldPause: () => get().pauseRequested,
          shouldCancel: () => get().cancelRequested,
          getQueue: () => get().queue,
          setQueue: q => set({ queue: q }),
          apply: patch => applyPatch(set, patch),
          onCancelProcessed: () => set({ cancelRequested: false }),
          onFinally: () => set({ runnerBusy: false, cancelRequested: false }),
        });
      },

      downloadAllMissingSurahs: async () => {
        const m = await readManifest();
        const { queue } = get();
        const toAdd: number[] = [];
        for (let s = 1; s <= 114; s++) {
          if (!isSurahFullyOffline(m, s) && !queue.includes(s)) {
            toAdd.push(s);
          }
        }
        if (toAdd.length === 0) return;
        set({ queue: [...get().queue, ...toAdd], lastError: null });
        get().startQueueProcessor();
      },

      pauseDownload: () => {
        if (get().job !== 'running') return;
        set({ pauseRequested: true, statusLine: 'Pausing…' });
      },

      resumeDownload: () => {
        set({ pauseRequested: false, lastError: null, cancelRequested: false });
        get().startQueueProcessor();
      },

      retryAfterError: () => {
        set({ lastError: null, job: 'idle' });
        get().startQueueProcessor();
      },

      runFullDownloadSequential: () => {
        if (get().runnerBusy) return;
        set({
          runnerBusy: true,
          job: 'running',
          pauseRequested: false,
          cancelRequested: false,
          lastError: null,
          statusLine: 'Preparing full download…',
        });
        void runFullOfflineDownload({
          shouldPause: () => get().pauseRequested,
          shouldCancel: () => get().cancelRequested,
          apply: patch => applyPatch(set, patch),
          onFinally: () => set({ runnerBusy: false, cancelRequested: false }),
        });
      },

      deleteAllData: async () => {
        set({ pauseRequested: true, cancelRequested: false });
        await deleteAllOfflineQuranData();
        clearSurahReaderMemoryCache();
        mmkv.remove(OFFLINE_QURAN_BOOTSTRAP_MMKV_KEY);
        set({
          queue: [],
          job: 'idle',
          pauseRequested: false,
          runnerBusy: false,
          currentSurah: 0,
          surahsCompleted: 0,
          progress01: 0,
          activeSurahProgress01: 0,
          bytesDownloaded: 0,
          storageBytes: 0,
          lastError: null,
          statusLine: 'Offline data removed.',
        });
      },
    }),
    {
      name: 'offline-quran-download',
      storage: mmkvStorage,
      partialize: s => ({ queue: s.queue }),
    },
  ),
);

export function resetOfflineQuranBootstrapFlag(): void {
  mmkv.remove(OFFLINE_QURAN_BOOTSTRAP_MMKV_KEY);
}

/** On first Quran tab visit: enqueue priority surahs then the rest (idempotent). */
export function scheduleOfflineQuranBootstrapIfNeeded(): void {
  if (mmkv.getBoolean(OFFLINE_QURAN_BOOTSTRAP_MMKV_KEY)) return;

  void (async () => {
    try {
      const m = await readManifest();
      if (isFullQuranOffline(m)) {
        mmkv.set(OFFLINE_QURAN_BOOTSTRAP_MMKV_KEY, true);
        return;
      }

      const ordered: number[] = [];
      for (const p of PRIORITY_BOOTSTRAP) {
        if (!isSurahFullyOffline(m, p)) ordered.push(p);
      }
      for (let s = 1; s <= 114; s++) {
        if (PRIORITY_BOOTSTRAP_SET.has(s)) continue;
        if (!isSurahFullyOffline(m, s)) ordered.push(s);
      }

      if (ordered.length === 0) {
        mmkv.set(OFFLINE_QURAN_BOOTSTRAP_MMKV_KEY, true);
        return;
      }

      const store = useOfflineQuranDownloadStore.getState();
      const seen = new Set(store.queue);
      const merged = [...store.queue];
      for (const n of ordered) {
        if (!seen.has(n)) {
          merged.push(n);
          seen.add(n);
        }
      }

      useOfflineQuranDownloadStore.setState({ queue: merged, lastError: null });
      store.startQueueProcessor();
      mmkv.set(OFFLINE_QURAN_BOOTSTRAP_MMKV_KEY, true);
    } catch {
      /* Retry on next visit */
    }
  })();
}
