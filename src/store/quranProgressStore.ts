import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { FirestoreQuranPayload } from '../services/firebase/userDocument';
import { writeUserBookmark, deleteUserBookmark } from '../services/firebase/userDocument';
import { useAuthStore } from './authStore';
import { mmkv } from '../services/storage';

export type QuranBookmark = {
  surahNumber: number;
  ayahNumber: number;
  createdAt: number;
};

export type RecentSurah = {
  surahNumber: number;
  lastReadAyah: number;
  updatedAt: number;
};

export type LastRead = {
  surahNumber: number;
  ayahNumber: number;
  updatedAt: number;
};

type QuranProgressState = {
  /** Last ayah the user was reading (drives “Continue reading”). */
  lastRead: LastRead | null;
  /** Recently opened surahs (most recent first). */
  recentSurahs: RecentSurah[];
  bookmarks: QuranBookmark[];
  /** Show English translation under Arabic in the reader. */
  showTranslation: boolean;
  /** Rough engagement metric: distinct ayah “visits” while reading (debounced in reader). */
  ayahsEngagedTotal: number;
  /** Last successful Firestore quran write or remote merge (for conflict ordering). */
  lastFirestoreWriteMs: number;
  _lastCountedAyahKey: string | null;
  setLastRead: (surahNumber: number, ayahNumber: number) => void;
  recordAyahEngagement: (surahNumber: number, ayahNumber: number) => void;
  touchRecentSurah: (surahNumber: number) => void;
  setShowTranslation: (value: boolean) => void;
  addBookmark: (surahNumber: number, ayahNumber: number) => void;
  removeBookmark: (surahNumber: number, ayahNumber: number) => void;
  isBookmarked: (surahNumber: number, ayahNumber: number) => boolean;
  setHydratedBookmarks: (bookmarks: QuranBookmark[]) => void;
  applyRemoteQuran: (remote: FirestoreQuranPayload) => void;
  markCloudPushed: (atMs: number) => void;
};

const mmkvStorage = createJSONStorage(() => ({
  getItem: (name: string) => mmkv.getString(name) ?? null,
  setItem: (name: string, value: string) => mmkv.set(name, value),
  removeItem: (name: string) => mmkv.remove(name),
}));

const MAX_RECENT = 10;

export const useQuranProgressStore = create<QuranProgressState>()(
  persist(
    (set, get) => ({
      lastRead: null,
      recentSurahs: [],
      bookmarks: [],
      showTranslation: true,
      ayahsEngagedTotal: 0,
      lastFirestoreWriteMs: 0,
      _lastCountedAyahKey: null,

      setLastRead: (surahNumber, ayahNumber) =>
        set({
          lastRead: { surahNumber, ayahNumber, updatedAt: Date.now() },
        }),

      recordAyahEngagement: (surahNumber, ayahNumber) => {
        const key = `${surahNumber}:${ayahNumber}`;
        set(s => {
          if (s._lastCountedAyahKey === key) return s;
          return {
            _lastCountedAyahKey: key,
            ayahsEngagedTotal: s.ayahsEngagedTotal + 1,
          };
        });
      },

      setShowTranslation: value => set({ showTranslation: value }),

      applyRemoteQuran: remote =>
        set(s => {
          if (!remote.updatedAtMs || remote.updatedAtMs <= s.lastFirestoreWriteMs) return s;

          // Merge lastRead (timestamp based)
          const localLastRead = s.lastRead;
          const remoteLastRead = remote.lastRead;
          let nextLastRead = localLastRead;
          if (
            remoteLastRead &&
            (!localLastRead || remoteLastRead.updatedAt > localLastRead.updatedAt)
          ) {
            nextLastRead = remoteLastRead;
          }

          // Merge recentSurahs (timestamp based by surahNumber)
          const mergedRecentsMap = new Map<number, RecentSurah>();
          s.recentSurahs.forEach(r => mergedRecentsMap.set(r.surahNumber, r));
          
          if (Array.isArray(remote.recentSurahs)) {
            remote.recentSurahs.forEach(r => {
              const existing = mergedRecentsMap.get(r.surahNumber);
              if (!existing || r.updatedAt > existing.updatedAt) {
                mergedRecentsMap.set(r.surahNumber, r);
              }
            });
          }

          const nextRecentSurahs = Array.from(mergedRecentsMap.values())
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .slice(0, MAX_RECENT);

          // NOTE: Bookmarks are no longer merged here because they live in a subcollection.
          // The application will hydrate bookmarks via a separate remote call and we can merge them independently.

          return {
            lastRead: nextLastRead,
            recentSurahs: nextRecentSurahs,
            showTranslation: remote.showTranslation ?? s.showTranslation,
            ayahsEngagedTotal: Math.max(s.ayahsEngagedTotal, remote.ayahsEngagedTotal || 0),
            lastFirestoreWriteMs: remote.updatedAtMs,
          };
        }),

      markCloudPushed: atMs => set({ lastFirestoreWriteMs: atMs }),

      touchRecentSurah: surahNumber =>
        set(state => {
          const now = Date.now();
          // We don't have the lastReadAyah here necessarily, so we fall back to 1.
          // However, we look at the existing recentSurahs or lastRead if it matches.
          let lastReadAyah = 1;
          const existing = state.recentSurahs.find(n => n.surahNumber === surahNumber);
          if (existing) {
            lastReadAyah = existing.lastReadAyah;
          } else if (state.lastRead?.surahNumber === surahNumber) {
            lastReadAyah = state.lastRead.ayahNumber;
          }

          const updatedCurrent: RecentSurah = { surahNumber, lastReadAyah, updatedAt: now };
          const others = state.recentSurahs.filter(n => n.surahNumber !== surahNumber);
          return { recentSurahs: [updatedCurrent, ...others].slice(0, MAX_RECENT) };
        }),

      addBookmark: (surahNumber, ayahNumber) => {
        const uid = useAuthStore.getState().firebaseUser?.uid;
        const b: QuranBookmark = { surahNumber, ayahNumber, createdAt: Date.now() };
        if (uid) {
          writeUserBookmark(uid, b).catch(() => {});
        }
        set(state => {
          if (state.bookmarks.some(x => x.surahNumber === surahNumber && x.ayahNumber === ayahNumber)) {
            return state;
          }
          return {
            bookmarks: [...state.bookmarks, b].sort((x, y) => y.createdAt - x.createdAt),
          };
        });
      },

      removeBookmark: (surahNumber, ayahNumber) => {
        const uid = useAuthStore.getState().firebaseUser?.uid;
        if (uid) {
          deleteUserBookmark(uid, surahNumber, ayahNumber).catch(() => {});
        }
        set(state => ({
          bookmarks: state.bookmarks.filter(
            x => !(x.surahNumber === surahNumber && x.ayahNumber === ayahNumber),
          ),
        }));
      },

      setHydratedBookmarks: bookmarks => set({ bookmarks }),

      isBookmarked: (surahNumber, ayahNumber) =>
        get().bookmarks.some(b => b.surahNumber === surahNumber && b.ayahNumber === ayahNumber),
    }),
    {
      name: 'sazda-quran-progress',
      storage: mmkvStorage,
      partialize: s => ({
        lastRead: s.lastRead,
        recentSurahs: s.recentSurahs,
        bookmarks: s.bookmarks,
        showTranslation: s.showTranslation,
        ayahsEngagedTotal: s.ayahsEngagedTotal,
        lastFirestoreWriteMs: s.lastFirestoreWriteMs,
      }),
    },
  ),
);
