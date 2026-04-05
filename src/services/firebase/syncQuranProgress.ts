import type { FirebaseUserSnapshot } from '../../store/authStore';
import { useProfileStore } from '../../store/profileStore';
import { useQuranProgressStore } from '../../store/quranProgressStore';
import {
  readUserDocument,
  readUserBookmarks,
  writeUserProfileBasics,
  writeUserProfileExtras,
  writeUserQuranProgress,
  type FirestoreUserDoc,
} from './userDocument';

export async function pushLocalQuranToCloud(uid: string): Promise<void> {
  const s = useQuranProgressStore.getState();
  const at = Date.now();
  await writeUserQuranProgress(uid, {
    lastRead: s.lastRead,
    recentSurahs: s.recentSurahs,
    showTranslation: s.showTranslation,
    ayahsEngagedTotal: s.ayahsEngagedTotal,
    updatedAtMs: at,
  });
  s.markCloudPushed(at);
}

export async function pushLocalProfileExtrasToCloud(uid: string): Promise<void> {
  const p = useProfileStore.getState();
  await writeUserProfileExtras(uid, {
    tagline: p.tagline,
    featuredDua: p.featuredDua,
    duasShared: p.duasShared,
  });
}

async function mergeQuran(uid: string, remote: FirestoreUserDoc | null): Promise<void> {
  const rq = remote?.quran;
  const local = useQuranProgressStore.getState();
  
  // Merge Quran Progress Doc
  if (rq && typeof rq.updatedAtMs === 'number' && rq.updatedAtMs > local.lastFirestoreWriteMs) {
    useQuranProgressStore.getState().applyRemoteQuran(rq);
  } else {
    // If local is newer or remote is missing, push local. 
    // Wait intentionally, we don't block bookmarks on this.
    await pushLocalQuranToCloud(uid);
  }

  // Handle Bookmarks subcollection
  try {
    const remoteBookmarks = await readUserBookmarks(uid);
    // Simple strategy: Firestore subcollection is the source of truth across devices
    // Wait, what if offline user added a bookmark but hasn't pushed?
    // The Firebase client SDK usually persists offline writes. So readUserBookmarks will include pending writes!
    // Thus `remoteBookmarks` is perfectly fine to overwrite `local.bookmarks`.
    if (remoteBookmarks && remoteBookmarks.length > 0) {
      // Create a map to ensure no duplicates if needed, but the read should be clean.
      useQuranProgressStore.getState().setHydratedBookmarks(
        remoteBookmarks.sort((a, b) => b.createdAt - a.createdAt)
      );
    }
  } catch {
    // offline or failed - do nothing, let local persist
  }
}

function applyProfileFromAuthAndRemote(
  authProfile: FirebaseUserSnapshot,
  remote: FirestoreUserDoc | null,
): void {
  const authName = authProfile.displayName?.trim();
  const firstFromAuth = authName?.split(/\s+/)[0];
  const remoteName = remote?.displayName?.trim();
  const firstFromRemote = remoteName?.split(/\s+/)[0];
  const displayName = firstFromAuth || firstFromRemote || remoteName || 'Guest';

  const photoURL = authProfile.photoURL ?? remote?.photoURL ?? null;

  const p = useProfileStore.getState();
  const tagline =
    remote?.tagline != null && String(remote.tagline).trim() !== ''
      ? String(remote.tagline).trim()
      : p.tagline;
  const featuredDua =
    remote?.featuredDua != null && String(remote.featuredDua).trim() !== ''
      ? String(remote.featuredDua).trim()
      : p.featuredDua;
  const duasShared =
    typeof remote?.duasShared === 'number' && !Number.isNaN(remote.duasShared)
      ? Math.max(0, Math.floor(remote.duasShared))
      : p.duasShared;

  p.applyRemoteSync({
    displayName,
    photoURL,
    tagline,
    featuredDua,
    duasShared,
  });
}

/**
 * Pull Firestore user doc + auth profile into local stores; push Quran if cloud is not newer.
 */
export async function hydrateSignedInUserFromCloud(
  uid: string,
  authProfile: FirebaseUserSnapshot,
): Promise<void> {
  await writeUserProfileBasics(uid, {
    displayName: authProfile.displayName,
    email: authProfile.email,
    photoURL: authProfile.photoURL,
  });
  const remote = await readUserDocument(uid);
  await mergeQuran(uid, remote);
  applyProfileFromAuthAndRemote(authProfile, remote);
}

/** Used after Google sign-in success screen (same as full hydrate). */
export async function syncAfterGoogleLogin(uid: string, profile: FirebaseUserSnapshot): Promise<void> {
  // Update local UI immediately to prevent "Guest" fallback if network hangs
  const first = profile.displayName?.trim().split(/\s+/)[0];
  if (first) {
    useProfileStore.getState().setDisplayName(first);
  }
  
  await hydrateSignedInUserFromCloud(uid, profile);
}
