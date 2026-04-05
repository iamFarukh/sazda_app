import { Platform } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import {
  googleIosClientId,
  googleWebClientId,
  isGoogleSignInConfigured,
} from '../config/firebasePublic';

/**
 * iOS: `webClientId` must be the **Web** client (Firebase / id token audience).
 * `iosClientId` must be the **iOS** client from GoogleService-Info.plist — never the Web client,
 * or Google returns "Custom scheme URIs are not allowed for 'WEB' client type."
 */
export function configureNativeGoogleSignIn(): void {
  if (!isGoogleSignInConfigured()) return;

  const web = googleWebClientId;
  const ios = googleIosClientId.trim();

  if (Platform.OS === 'ios') {
    const hasIosClient = ios.length > 0 && !ios.includes('YOUR_');
    GoogleSignin.configure({
      webClientId: web,
      ...(hasIosClient ? { iosClientId: ios } : {}),
      offlineAccess: false,
    });
    return;
  }

  GoogleSignin.configure({
    webClientId: web,
    offlineAccess: false,
  });
}
