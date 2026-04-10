import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkv } from '../services/storage';
import type { MushafTheme } from '../services/mushaf/mushafTheme';

export type { MushafTheme } from '../services/mushaf/mushafTheme';

export type MushafBookmark = {
  page: number;
  surah: number;
  ayah: number;
  createdAt: number;
};

const mmkvStorage = createJSONStorage(() => ({
  getItem: (name: string) => mmkv.getString(name) ?? null,
  setItem: (name: string, value: string) => mmkv.set(name, value),
  removeItem: (name: string) => mmkv.remove(name),
}));

type State = {
  lastReadPage: number;
  fontScale: number;
  theme: MushafTheme;
  showTranslation: boolean;
  bookmarks: MushafBookmark[];
  setLastReadPage: (p: number) => void;
  setFontScale: (n: number) => void;
  setTheme: (t: MushafTheme) => void;
  setShowTranslation: (v: boolean) => void;
  addBookmark: (b: Omit<MushafBookmark, 'createdAt'>) => void;
  removeBookmark: (page: number, surah: number, ayah: number) => void;
  clearBookmarks: () => void;
};

export const useMushafReaderStore = create<State>()(
  persist(
    set => ({
      lastReadPage: 1,
      fontScale: 1,
      theme: 'light',
      showTranslation: false,
      bookmarks: [],

      setLastReadPage: p =>
        set({ lastReadPage: Math.max(1, Math.min(604, Math.round(p))) }),

      setFontScale: n => set({ fontScale: Math.min(1.45, Math.max(0.78, n)) }),

      setTheme: t => set({ theme: t }),

      setShowTranslation: v => set({ showTranslation: v }),

      addBookmark: ({ page, surah, ayah }) =>
        set(s => {
          const next = s.bookmarks.filter(
            b => !(b.page === page && b.surah === surah && b.ayah === ayah),
          );
          next.unshift({ page, surah, ayah, createdAt: Date.now() });
          return { bookmarks: next.slice(0, 40) };
        }),

      removeBookmark: (page, surah, ayah) =>
        set(s => ({
          bookmarks: s.bookmarks.filter(
            b => !(b.page === page && b.surah === surah && b.ayah === ayah),
          ),
        })),

      clearBookmarks: () => set({ bookmarks: [] }),
    }),
    {
      name: 'mushaf-reader-v1',
      storage: mmkvStorage,
    },
  ),
);
