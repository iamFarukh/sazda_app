import { useEffect, type PropsWithChildren } from 'react';
import { isGoogleSignInConfigured } from '../../config/firebasePublic';
import { configureNativeGoogleSignIn } from '../../services/configureNativeGoogleSignIn';
import { subscribeFirebaseAuth } from '../../store/authStore';

export function AuthBootstrap({ children }: PropsWithChildren) {
  useEffect(() => {
    if (isGoogleSignInConfigured()) {
      configureNativeGoogleSignIn();
    }
    const unsub = subscribeFirebaseAuth();
    return unsub;
  }, []);

  return children;
}
