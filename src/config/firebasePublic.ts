/**
 * Firebase Console → Project settings → Your apps → Web app (`firebaseConfig`).
 *
 * Google Sign-In also needs `googleWebClientId`: Google Cloud Console → APIs & Credentials
 * → OAuth 2.0 Client IDs → type "Web" (often named "Web client (auto created by Google Service)").
 * Example: https://console.cloud.google.com/apis/credentials?project=sazda-ce392
 *
 * iOS: set `googleIosClientId` to the **iOS** OAuth `CLIENT_ID` from `GoogleService-Info.plist`
 * (not the Web client). Native sign-in uses a custom URL scheme; Google rejects that for "Web" clients.
 * `Info.plist` → `CFBundleURLSchemes` must use the plist’s `REVERSED_CLIENT_ID` for that same iOS client.
 * Android: add SHA-1 in Firebase for package `com.sazda`.
 */

import {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID,
  FIREBASE_MEASUREMENT_ID,
  GOOGLE_WEB_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID,
} from '@env';

export const firebasePublicConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID,
  measurementId: FIREBASE_MEASUREMENT_ID,
};

/**
 * OAuth 2.0 **Web** client ID (ends with `.apps.googleusercontent.com`).
 * Required by `@react-native-google-signin/google-signin` for `idToken` → Firebase Auth.
 */
export const googleWebClientId = GOOGLE_WEB_CLIENT_ID;

/** iOS OAuth client ID — must match `CLIENT_ID` in `ios/Sazda/GoogleService-Info.plist`. */
export const googleIosClientId = GOOGLE_IOS_CLIENT_ID;

function looksLikePlaceholderWebConfig(): boolean {
  const { apiKey, projectId } = firebasePublicConfig;
  if (!apiKey || !projectId) return true;
  if (apiKey.includes('YOUR_') || projectId.includes('your-')) return true;
  return false;
}

/** Enough to initialize the Firebase app, Auth, and Firestore. */
export function isFirebaseConfigured(): boolean {
  return !looksLikePlaceholderWebConfig();
}

/** Web client ID is set (Google Sign-In + token exchange). */
export function isGoogleSignInConfigured(): boolean {
  return (
    !!googleWebClientId &&
    !googleWebClientId.includes('YOUR_') &&
    googleWebClientId.includes('.apps.googleusercontent.com')
  );
}
