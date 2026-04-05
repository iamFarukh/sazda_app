import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { isFirebaseConfigured, isGoogleSignInConfigured } from '../config/firebasePublic';
import { configureNativeGoogleSignIn } from '../services/configureNativeGoogleSignIn';
import { getFirebaseApp, getFirebaseAuth } from '../services/firebase/client';
import { mmkv } from '../services/storage';
import { useProfileStore } from './profileStore';

export type FirebaseUserSnapshot = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
};

function mapUser(user: User | null): FirebaseUserSnapshot | null {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
}

type AuthState = {
  authReady: boolean;
  guestSession: boolean;
  /** Firebase signed-in user (may wait for celebration screen before app unlock). */
  firebaseUser: FirebaseUserSnapshot | null;
  /** After tapping Google, stay on auth stack until success screen finishes. */
  needsCelebration: boolean;
  googleSignInError: string | null;
  signInAsGuest: () => void;
  completeGoogleCelebration: () => void;
  signInWithGoogle: () => Promise<{ ok: true } | { ok: false; message: string }>;
  setAuthFromFirebaseListener: (user: FirebaseUserSnapshot | null) => void;
  setAuthReady: (v: boolean) => void;
  signOut: () => Promise<void>;
};

const mmkvStorage = createJSONStorage(() => ({
  getItem: (name: string) => mmkv.getString(name) ?? null,
  setItem: (name: string, value: string) => mmkv.set(name, value),
  removeItem: (name: string) => mmkv.remove(name),
}));

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      authReady: false,
      guestSession: false,
      firebaseUser: null,
      needsCelebration: false,
      googleSignInError: null,

      signInAsGuest: () =>
        set({
          guestSession: true,
          needsCelebration: false,
          googleSignInError: null,
        }),

      completeGoogleCelebration: () => set({ needsCelebration: false }),

      setAuthFromFirebaseListener: user => set({ firebaseUser: user }),

      setAuthReady: v => set({ authReady: v }),

      signInWithGoogle: async () => {
        if (!isFirebaseConfigured()) {
          return {
            ok: false,
            message: 'Add your Firebase web config in src/config/firebasePublic.ts',
          };
        }
        if (!isGoogleSignInConfigured()) {
          return {
            ok: false,
            message:
              'Set googleWebClientId in firebasePublic.ts (Google Cloud Console → APIs & Credentials → OAuth 2.0 → Web client ID).',
          };
        }
        set({ googleSignInError: null, needsCelebration: true });
        try {
          configureNativeGoogleSignIn();
          await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
          const response = await GoogleSignin.signIn();
          if (response.type !== 'success') {
            set({ needsCelebration: false });
            return { ok: false, message: 'Sign-in was cancelled.' };
          }
          let idToken = response.data.idToken;
          if (!idToken) {
            const tokens = await GoogleSignin.getTokens();
            idToken = tokens.idToken;
          }
          if (!idToken) {
            set({ needsCelebration: false });
            return { ok: false, message: 'Could not get Google credentials. Check Web client ID in Firebase.' };
          }
          const auth = getFirebaseAuth();
          const credential = GoogleAuthProvider.credential(idToken);
          await signInWithCredential(auth, credential);
          return { ok: true };
        } catch (e: unknown) {
          set({ needsCelebration: false });
          const msg = e instanceof Error ? e.message : 'Google sign-in failed';
          set({ googleSignInError: msg });
          return { ok: false, message: msg };
        }
      },

      signOut: async () => {
        try {
          if (isFirebaseConfigured() && getFirebaseApp()) {
            await GoogleSignin.signOut();
            const auth = getFirebaseAuth();
            await firebaseSignOut(auth);
          }
        } catch {
          /* still clear local session */
        }
        useProfileStore.getState().resetToGuestDefaults();
        set({
          guestSession: false,
          firebaseUser: null,
          needsCelebration: false,
          googleSignInError: null,
        });
      },
    }),
    {
      name: 'sazda-auth-session',
      storage: mmkvStorage,
      partialize: s => ({
        guestSession: s.guestSession,
      }),
    },
  ),
);

export function subscribeFirebaseAuth() {
  if (!isFirebaseConfigured() || !getFirebaseApp()) {
    useAuthStore.getState().setAuthReady(true);
    return () => {};
  }
  const auth = getFirebaseAuth();
  const unsub = onAuthStateChanged(auth, user => {
    useAuthStore.getState().setAuthFromFirebaseListener(mapUser(user));
    useAuthStore.getState().setAuthReady(true);
  });
  return unsub;
}

/** Unlocks main app: guest, or Google user past celebration screen. */
export function selectAppUnlocked(s: {
  guestSession: boolean;
  firebaseUser: FirebaseUserSnapshot | null;
  needsCelebration: boolean;
}): boolean {
  if (s.guestSession) return true;
  if (s.firebaseUser && !s.needsCelebration) return true;
  return false;
}
