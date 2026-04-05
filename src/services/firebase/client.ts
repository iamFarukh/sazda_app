import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebasePublicConfig, isFirebaseConfigured } from '../../config/firebasePublic';

let appInstance: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) return null;
  if (appInstance) return appInstance;
  if (getApps().length > 0) {
    appInstance = getApp();
    return appInstance;
  }
  appInstance = initializeApp(firebasePublicConfig);
  return appInstance;
}

/** Call only after getFirebaseApp() is non-null. */
export function getFirebaseAuth() {
  const app = getFirebaseApp();
  if (!app) throw new Error('Firebase not configured');
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage) as import('firebase/auth').Persistence,
    });
  } catch {
    return getAuth(app);
  }
}

export function getFirebaseDb() {
  const app = getFirebaseApp();
  if (!app) throw new Error('Firebase not configured');
  return getFirestore(app);
}
