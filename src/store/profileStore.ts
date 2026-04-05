import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkv } from '../services/storage';

export const DEFAULT_GUEST_TAGLINE = 'Journeying towards Taqwa';
export const DEFAULT_FEATURED_DUA =
  'O Allah, I ask You for knowledge that is of benefit, a good provision, and deeds that will be accepted.';

type ProfileState = {
  displayName: string;
  /** Google / Firestore avatar URL when signed in. */
  photoURL: string | null;
  tagline: string;
  /** Count for profile stat tile (user-facing “shared” duas). */
  duasShared: number;
  /** Quote shown on profile “My Duas” card. */
  featuredDua: string;
  setDisplayName: (v: string) => void;
  setPhotoURL: (v: string | null) => void;
  setTagline: (v: string) => void;
  setFeaturedDua: (v: string) => void;
  bumpDuasShared: () => void;
  /** Merge fields from Firebase sync (only defined keys apply). */
  applyRemoteSync: (patch: {
    displayName?: string;
    photoURL?: string | null;
    tagline?: string;
    featuredDua?: string;
    duasShared?: number;
  }) => void;
  /** After sign-out — avoid showing another account’s name. */
  resetToGuestDefaults: () => void;
};

const mmkvStorage = createJSONStorage(() => ({
  getItem: (name: string) => mmkv.getString(name) ?? null,
  setItem: (name: string, value: string) => mmkv.set(name, value),
  removeItem: (name: string) => mmkv.remove(name),
}));

const guestBaseline = (): Pick<
  ProfileState,
  'displayName' | 'photoURL' | 'tagline' | 'duasShared' | 'featuredDua'
> => ({
  displayName: 'Guest',
  photoURL: null,
  tagline: DEFAULT_GUEST_TAGLINE,
  duasShared: 0,
  featuredDua: DEFAULT_FEATURED_DUA,
});

export const useProfileStore = create<ProfileState>()(
  persist(
    set => ({
      ...guestBaseline(),

      setDisplayName: v => set({ displayName: v.trim() || 'Guest' }),
      setPhotoURL: v => set({ photoURL: v }),
      setTagline: v => set({ tagline: v }),
      setFeaturedDua: v => set({ featuredDua: v }),
      bumpDuasShared: () => set(s => ({ duasShared: s.duasShared + 1 })),

      applyRemoteSync: patch =>
        set(s => ({
          displayName:
            patch.displayName !== undefined ? patch.displayName.trim() || 'Guest' : s.displayName,
          photoURL: patch.photoURL !== undefined ? patch.photoURL : s.photoURL,
          tagline: patch.tagline !== undefined ? patch.tagline : s.tagline,
          featuredDua: patch.featuredDua !== undefined ? patch.featuredDua : s.featuredDua,
          duasShared:
            patch.duasShared !== undefined ? Math.max(0, Math.floor(patch.duasShared)) : s.duasShared,
        })),

      resetToGuestDefaults: () => set(guestBaseline()),
    }),
    {
      name: 'sazda-profile',
      storage: mmkvStorage,
      partialize: s => ({
        displayName: s.displayName,
        photoURL: s.photoURL,
        tagline: s.tagline,
        duasShared: s.duasShared,
        featuredDua: s.featuredDua,
      }),
    },
  ),
);
