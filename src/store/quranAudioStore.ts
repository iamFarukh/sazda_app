import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '../services/storage';
import { quranSoundPlayer } from '../audio/QuranSoundPlayer';

export type QuranAudioQueueItem = {
  surahNumber: number;
  surahEnglishName: string;
  ayahNumber: number;
  arabic: string;
  translation?: string;
  audioUrl: string;
};

export type QuranAudioState = {
  // Current
  currentSurahNumber: number | null;
  currentSurahEnglishName: string | null;
  currentAyahNumber: number | null;
  currentArabic: string | null;
  currentTranslation: string | null;
  audioUrl: string | null;

  // Playback
  isPlaying: boolean;
  isLoading: boolean;
  progressSec: number;
  durationSec: number;
  error: string | null;

  // Mode
  autoPlayNext: boolean;
  queue: QuranAudioQueueItem[];
  queueIndex: number;

  // UI
  uiExpanded: boolean;

  // Actions
  setUiExpanded: (v: boolean) => void;
  setAutoPlayNext: (v: boolean) => void;
  playAyah: (item: QuranAudioQueueItem, queue?: QuranAudioQueueItem[]) => Promise<void>;
  togglePlayPause: () => void;
  stop: () => void;
  next: () => Promise<void>;
  prev: () => Promise<void>;
  seek: (sec: number) => void;
  _setProgressFromEngine: (pos: number, duration: number) => void;
  _onEngineEnded: () => void;
};

function safeQueueIndex(queue: QuranAudioQueueItem[], index: number): number {
  if (!queue.length) return -1;
  return Math.max(0, Math.min(queue.length - 1, index));
}

export const useQuranAudioStore = create<QuranAudioState>()(
  persist(
    (set, get) => {
      quranSoundPlayer.setListeners({
        onProgress: (pos, duration) => get()._setProgressFromEngine(pos, duration),
        onEnd: () => get()._onEngineEnded(),
      });

      const loadAndPlay = async (item: QuranAudioQueueItem) => {
        set({
          error: null,
          isLoading: true,
          isPlaying: false,
          progressSec: 0,
          durationSec: 0,
          currentSurahNumber: item.surahNumber,
          currentSurahEnglishName: item.surahEnglishName,
          currentAyahNumber: item.ayahNumber,
          currentArabic: item.arabic,
          currentTranslation: item.translation ?? null,
          audioUrl: item.audioUrl,
        });

        const r = await quranSoundPlayer.load(item.audioUrl);
        if (!r.ok) {
          set({
            isLoading: false,
            isPlaying: false,
            error: r.message,
          });
          return;
        }
        set({ isLoading: false, durationSec: r.duration, isPlaying: true });
        quranSoundPlayer.play();
      };

      return {
        currentSurahNumber: null,
        currentSurahEnglishName: null,
        currentAyahNumber: null,
        currentArabic: null,
        currentTranslation: null,
        audioUrl: null,
        isPlaying: false,
        isLoading: false,
        progressSec: 0,
        durationSec: 0,
        error: null,
        autoPlayNext: true,
        queue: [],
        queueIndex: -1,
        uiExpanded: false,

        setUiExpanded: v => set({ uiExpanded: v }),
        setAutoPlayNext: v => set({ autoPlayNext: v }),

        playAyah: async (item, queueMaybe) => {
          const s = get();

          // Toggle if same ayah
          if (
            s.currentSurahNumber === item.surahNumber &&
            s.currentAyahNumber === item.ayahNumber &&
            s.audioUrl === item.audioUrl
          ) {
            if (s.isLoading) return;
            if (s.isPlaying) {
              quranSoundPlayer.pause();
              set({ isPlaying: false });
            } else {
              quranSoundPlayer.play();
              set({ isPlaying: true });
            }
            return;
          }

          // Stop any previous audio first
          quranSoundPlayer.stop();

          const queue = queueMaybe?.length ? queueMaybe : s.queue;
          let idx = queue.findIndex(
            q => q.surahNumber === item.surahNumber && q.ayahNumber === item.ayahNumber,
          );
          if (idx < 0) idx = 0;

          set({
            queue,
            queueIndex: queue.length ? safeQueueIndex(queue, idx) : -1,
          });

          await loadAndPlay(item);
        },

        togglePlayPause: () => {
          const s = get();
          if (!s.audioUrl || s.isLoading) return;
          if (s.isPlaying) {
            quranSoundPlayer.pause();
            set({ isPlaying: false });
          } else {
            quranSoundPlayer.play();
            set({ isPlaying: true });
          }
        },

        stop: () => {
          quranSoundPlayer.stop();
          set({
            isPlaying: false,
            isLoading: false,
            audioUrl: null,
            progressSec: 0,
            durationSec: 0,
            error: null,
            queueIndex: -1,
            queue: [],
            uiExpanded: false,
            currentSurahNumber: null,
            currentSurahEnglishName: null,
            currentAyahNumber: null,
            currentArabic: null,
            currentTranslation: null,
          });
        },

        next: async () => {
          const s = get();
          if (!s.queue.length) return;
          const nextIndex = safeQueueIndex(s.queue, s.queueIndex + 1);
          const nextItem = s.queue[nextIndex];
          set({ queueIndex: nextIndex });
          await get().playAyah(nextItem, s.queue);
        },

        prev: async () => {
          const s = get();
          if (!s.queue.length) return;
          const prevIndex = safeQueueIndex(s.queue, s.queueIndex - 1);
          const prevItem = s.queue[prevIndex];
          set({ queueIndex: prevIndex });
          await get().playAyah(prevItem, s.queue);
        },

        seek: sec => {
          quranSoundPlayer.seek(sec);
          set({ progressSec: Math.max(0, sec) });
        },

        _setProgressFromEngine: (pos, duration) => {
          const s = get();
          if (!s.audioUrl) return;
          set({
            progressSec: pos,
            durationSec: duration || s.durationSec,
          });
        },

        _onEngineEnded: () => {
          const s = get();
          set({ isPlaying: false, progressSec: s.durationSec || s.progressSec });
          if (!s.autoPlayNext) return;
          if (!s.queue.length) return;
          if (s.queueIndex < 0) return;
          const nextIndex = s.queueIndex + 1;
          if (nextIndex >= s.queue.length) return;
          // Fire-and-forget: keep callback lightweight
          void get().next();
        },
      };
    },
    {
      name: 'quran-audio-v1',
      storage: zustandStorage,
      partialize: s => ({
        autoPlayNext: s.autoPlayNext,
        currentSurahNumber: s.currentSurahNumber,
        currentAyahNumber: s.currentAyahNumber,
      }),
    },
  ),
);

