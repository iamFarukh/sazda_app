import { deleteDoc, collection, doc, getDocs, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import type { LastRead, RecentSurah, QuranBookmark } from '../../store/quranProgressStore';
import { getFirebaseApp, getFirebaseDb } from './client';

export type FirestoreQuranPayload = {
  lastRead: LastRead | null;
  recentSurahs: RecentSurah[];
  showTranslation: boolean;
  ayahsEngagedTotal: number;
  updatedAtMs: number;
  // Note: bookmarks are now handled in a separate subcollection to prevent document bloat
};

export type FirestoreUserDoc = {
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
  /** Profile card / tools — synced with local profileStore when signed in. */
  tagline?: string | null;
  featuredDua?: string | null;
  duasShared?: number;
  quran?: FirestoreQuranPayload;
};

const MAX_CLOUD_BOOKMARKS = 48;

export function userDocRef(uid: string) {
  return doc(getFirebaseDb(), 'users', uid);
}

export async function readUserDocument(uid: string): Promise<FirestoreUserDoc | null> {
  if (!getFirebaseApp()) return null;
  const snap = await getDoc(userDocRef(uid));
  if (!snap.exists()) return null;
  return snap.data() as FirestoreUserDoc;
}

export async function writeUserQuranProgress(
  uid: string,
  partial: Omit<FirestoreQuranPayload, 'updatedAtMs'> & { updatedAtMs?: number },
): Promise<void> {
  if (!getFirebaseApp()) return;
  const payload: FirestoreQuranPayload = {
    lastRead: partial.lastRead,
    recentSurahs: partial.recentSurahs,
    showTranslation: partial.showTranslation,
    ayahsEngagedTotal: partial.ayahsEngagedTotal,
    updatedAtMs: partial.updatedAtMs ?? Date.now(),
  };
  await setDoc(
    userDocRef(uid),
    {
      quran: payload,
      quranSyncedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function readUserBookmarks(uid: string): Promise<QuranBookmark[]> {
  if (!getFirebaseApp()) return [];
  const ref = collection(getFirebaseDb(), 'users', uid, 'bookmarks');
  const snap = await getDocs(ref);
  return snap.docs.map(d => d.data() as QuranBookmark);
}

export async function writeUserBookmark(uid: string, bookmark: QuranBookmark): Promise<void> {
  if (!getFirebaseApp()) return;
  const id = `${bookmark.surahNumber}_${bookmark.ayahNumber}`;
  const ref = doc(getFirebaseDb(), 'users', uid, 'bookmarks', id);
  await setDoc(ref, bookmark);
}

export async function deleteUserBookmark(uid: string, surahNumber: number, ayahNumber: number): Promise<void> {
  if (!getFirebaseApp()) return;
  const id = `${surahNumber}_${ayahNumber}`;
  const ref = doc(getFirebaseDb(), 'users', uid, 'bookmarks', id);
  await deleteDoc(ref);
}

export async function writeUserProfileBasics(
  uid: string,
  profile: { displayName: string | null; email: string | null; photoURL: string | null },
): Promise<void> {
  if (!getFirebaseApp()) return;
  await setDoc(
    userDocRef(uid),
    {
      displayName: profile.displayName,
      email: profile.email,
      photoURL: profile.photoURL,
      profileUpdatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export type FirestoreProfileExtras = {
  tagline: string;
  featuredDua: string;
  duasShared: number;
};

export async function writeUserProfileExtras(uid: string, extras: FirestoreProfileExtras): Promise<void> {
  if (!getFirebaseApp()) return;
  await setDoc(
    userDocRef(uid),
    {
      tagline: extras.tagline,
      featuredDua: extras.featuredDua,
      duasShared: extras.duasShared,
      profileUpdatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
