/**
 * Server-side data deletion for the "Delete my account" flow (Google Play User Data policy).
 *
 * Removes everything under users/{uid}: the profile doc plus every known subcollection
 * (bookmarks, zakatCycles, zakatPayments, prayerTracker, tasbeeh). Must run BEFORE the
 * Firebase Auth user is deleted — once the auth token is gone, Firestore rules
 * (request.auth.uid == userId) reject any further writes.
 */
import { collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { getFirebaseApp, getFirebaseDb } from './client';

/** Every per-user subcollection the app writes to. Keep in sync with the *Firestore.ts helpers. */
const USER_SUBCOLLECTIONS = [
  'bookmarks',
  'zakatCycles',
  'zakatPayments',
  'prayerTracker',
  'tasbeeh',
] as const;

async function deleteCollectionDocs(uid: string, name: string): Promise<void> {
  const snap = await getDocs(collection(getFirebaseDb(), 'users', uid, name));
  await Promise.allSettled(snap.docs.map(d => deleteDoc(d.ref)));
}

/**
 * Deletes all Firestore data for a user. Resolves even if some deletes fail so the
 * caller can still proceed to delete the auth account; throws only on a hard setup error.
 */
export async function deleteAllUserData(uid: string): Promise<void> {
  if (!getFirebaseApp()) return;
  await Promise.allSettled(
    USER_SUBCOLLECTIONS.map(name => deleteCollectionDocs(uid, name)),
  );
  // Delete the top-level profile document last.
  await deleteDoc(doc(getFirebaseDb(), 'users', uid)).catch(() => {
    /* doc may not exist; ignore */
  });
}
