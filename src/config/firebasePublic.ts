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

export const firebasePublicConfig = {
  apiKey: 'AIzaSyBRrjy7rnuOC7EKZT520EPCzn48PWHglP0',
  authDomain: 'sazda-ce392.firebaseapp.com',
  projectId: 'sazda-ce392',
  storageBucket: 'sazda-ce392.firebasestorage.app',
  messagingSenderId: '589686095543',
  appId: '1:589686095543:web:4072fc713b3d6c0da1d732',
  measurementId: 'G-YH5P64XNL4',
};

/**
 * OAuth 2.0 **Web** client ID (ends with `.apps.googleusercontent.com`).
 * Required by `@react-native-google-signin/google-signin` for `idToken` → Firebase Auth.
 */
export const googleWebClientId =
  '589686095543-52du413vosth04mpb7inptm9gsidn39t.apps.googleusercontent.com';

/** iOS OAuth client ID — must match `CLIENT_ID` in `ios/Sazda/GoogleService-Info.plist`. */
export const googleIosClientId =
  '589686095543-e1esqc195ghm75kh5p7tv4du2mkrhvgq.apps.googleusercontent.com';

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
