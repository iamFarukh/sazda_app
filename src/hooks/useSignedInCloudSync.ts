import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useProfileStore } from '../store/profileStore';
import { useQuranProgressStore } from '../store/quranProgressStore';
import {
  hydrateSignedInUserFromCloud,
  pushLocalProfileExtrasToCloud,
  pushLocalQuranToCloud,
} from '../services/firebase/syncQuranProgress';

const PROFILE_DEBOUNCE_MS = 3500;
const QURAN_DEBOUNCE_MS = 4500;

/**
 * After Google sign-in (or cold start with a session): hydrate profile + Quran from Firestore,
 * then debounce-push local edits to the cloud.
 */
export function useSignedInCloudSync() {
  const uid = useAuthStore(s => s.firebaseUser?.uid);
  const needsCelebration = useAuthStore(s => s.needsCelebration);
  const guestSession = useAuthStore(s => s.guestSession);
  const authFingerprint = useAuthStore(s =>
    s.firebaseUser
      ? `${s.firebaseUser.uid}|${s.firebaseUser.displayName ?? ''}|${s.firebaseUser.photoURL ?? ''}`
      : '',
  );

  const [hydrated, setHydrated] = useState(false);
  const qTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (guestSession || needsCelebration || !uid) {
      setHydrated(false);
      return;
    }

    const user = useAuthStore.getState().firebaseUser;
    if (!user) {
      setHydrated(false);
      return;
    }

    let cancelled = false;
    setHydrated(false);

    (async () => {
      try {
        await Promise.race([
          hydrateSignedInUserFromCloud(uid, user),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Hydration timeout')), 5000)),
        ]);
      } catch {
        /* offline / rules — still allow app use */
      }
      if (!cancelled) {
        setHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uid, guestSession, needsCelebration, authFingerprint]);

  useEffect(() => {
    if (!hydrated || !uid) return;

    void pushLocalProfileExtrasToCloud(uid).catch(() => {});

    const scheduleQuran = () => {
      if (qTimerRef.current) clearTimeout(qTimerRef.current);
      qTimerRef.current = setTimeout(() => {
        pushLocalQuranToCloud(uid).catch(() => {});
      }, QURAN_DEBOUNCE_MS);
    };

    const scheduleProfile = () => {
      if (pTimerRef.current) clearTimeout(pTimerRef.current);
      pTimerRef.current = setTimeout(() => {
        pushLocalProfileExtrasToCloud(uid).catch(() => {});
      }, PROFILE_DEBOUNCE_MS);
    };

    const unQ = useQuranProgressStore.subscribe(scheduleQuran);
    const unP = useProfileStore.subscribe(scheduleProfile);

    return () => {
      unQ();
      unP();
      if (qTimerRef.current) clearTimeout(qTimerRef.current);
      if (pTimerRef.current) clearTimeout(pTimerRef.current);
    };
  }, [hydrated, uid]);
}
