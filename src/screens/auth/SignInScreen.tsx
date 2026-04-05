import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { SazdaText } from '../../components/atoms/SazdaText/SazdaText';
import { SazdaIcon } from '../../components/atoms/SazdaIcon/SazdaIcon';
import { GoogleGLogo } from '../../components/atoms/GoogleGLogo';
import { getFirebaseAuth } from '../../services/firebase/client';
import type { AuthStackParamList } from '../../navigation/types';
import { isFirebaseConfigured, isGoogleSignInConfigured } from '../../config/firebasePublic';
import { spacing } from '../../theme/spacing';
import { fontFamilies } from '../../theme/typography';
import { useAuthStore } from '../../store/authStore';
import { useThemePalette } from '../../theme/useThemePalette';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'SignIn'>;

const { height: SCREEN_H } = Dimensions.get('window');

function SignInDecor({ surface, primaryContainer, secondaryContainer }: { surface: string; primaryContainer: string; secondaryContainer: string }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View
        style={{
          position: 'absolute',
          top: -SCREEN_H * 0.08,
          left: -SCREEN_H * 0.12,
          width: SCREEN_H * 0.45,
          height: SCREEN_H * 0.45,
          borderRadius: SCREEN_H * 0.225,
          backgroundColor: secondaryContainer,
          opacity: 0.12,
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: -SCREEN_H * 0.1,
          right: -SCREEN_H * 0.1,
          width: SCREEN_H * 0.42,
          height: SCREEN_H * 0.42,
          borderRadius: SCREEN_H * 0.21,
          backgroundColor: primaryContainer,
          opacity: 0.08,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: SCREEN_H * 0.22,
          alignSelf: 'center',
          width: SCREEN_H * 0.7,
          height: SCREEN_H * 0.7,
          borderRadius: SCREEN_H * 0.35,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: surface,
          opacity: 0.06,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: SCREEN_H * 0.26,
          alignSelf: 'center',
          width: SCREEN_H * 0.55,
          height: SCREEN_H * 0.55,
          borderRadius: SCREEN_H * 0.275,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: primaryContainer,
          opacity: 0.05,
        }}
      />
    </View>
  );
}

export function SignInScreen() {
  const navigation = useNavigation<Nav>();
  const signInAsGuest = useAuthStore(s => s.signInAsGuest);
  const signInWithGoogle = useAuthStore(s => s.signInWithGoogle);
  const { colors: c, scheme } = useThemePalette();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1, backgroundColor: c.surface },
        scrollContent: {
          flexGrow: 1,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.x3xl,
          paddingBottom: spacing.xl,
          minHeight: SCREEN_H * 0.92,
          justifyContent: 'space-between',
        },
        header: { alignItems: 'center', marginBottom: spacing.xl },
        brandIcon: {
          width: 64,
          height: 64,
          borderRadius: 12,
          backgroundColor: c.primaryContainer,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.md,
          shadowColor: '#003527',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.22,
          shadowRadius: 14,
          elevation: 8,
        },
        hero: { alignItems: 'center', paddingHorizontal: spacing.sm, marginBottom: spacing.x3xl },
        googleBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.md,
          backgroundColor: c.surfaceContainerLowest,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: scheme === 'dark' ? c.outlineVariant : 'rgba(191, 201, 195, 0.45)',
          paddingVertical: spacing.lg,
          paddingHorizontal: spacing.xl,
          borderRadius: 999,
          minHeight: 56,
          maxWidth: 400,
          alignSelf: 'center',
          width: '100%',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 3,
          elevation: 2,
        },
        guestBtn: { paddingVertical: spacing.lg, alignItems: 'center' },
        guestText: {
          fontFamily: fontFamilies.body,
          fontSize: 16,
          fontWeight: '600',
        },
        footer: { alignItems: 'center', paddingVertical: spacing.lg, opacity: 0.4 },
        err: {
          marginTop: spacing.md,
          textAlign: 'center',
          maxWidth: 340,
          alignSelf: 'center',
          paddingHorizontal: spacing.sm,
        },
        pressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
        centerBlock: { flex: 1, justifyContent: 'center' },
      }),
    [c, scheme],
  );

  const onGoogle = async () => {
    setError(null);
    if (!isFirebaseConfigured()) {
      setError(
        'Firebase web config is missing or still has placeholders in src/config/firebasePublic.ts.',
      );
      return;
    }
    if (!isGoogleSignInConfigured()) {
      setError(
        'Add googleWebClientId in firebasePublic.ts: Google Cloud Console → APIs & Credentials → OAuth 2.0 Client IDs → open the Web client → copy Client ID.',
      );
      return;
    }
    setBusy(true);
    try {
      const r = await signInWithGoogle();
      if (!r.ok) {
        setError(r.message);
        return;
      }
      const auth = getFirebaseAuth();
      const dn = auth.currentUser?.displayName?.trim() || 'Friend';
      const first = dn.split(/\s+/)[0] ?? 'Friend';
      navigation.navigate('SignInSuccess', { displayName: first });
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <SignInDecor surface={c.surface} primaryContainer={c.primaryContainer} secondaryContainer={c.secondaryContainer} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View>
          <View style={styles.header}>
            <View style={styles.brandIcon}>
              <SazdaIcon name="mosque" size={36} color={c.surface} fill={1} />
            </View>
            <SazdaText
              variant="headlineLarge"
              color="primary"
              style={{
                fontFamily: fontFamilies.headline,
                fontSize: 34,
                fontWeight: '800',
                letterSpacing: -0.5,
              }}>
              Sazda
            </SazdaText>
          </View>

          <View style={styles.centerBlock}>
            <View style={styles.hero}>
              <SazdaText
                variant="headlineLarge"
                color="primary"
                align="center"
                style={{
                  fontFamily: fontFamilies.headline,
                  fontSize: 30,
                  lineHeight: 36,
                  fontWeight: '800',
                  marginBottom: spacing.md,
                  letterSpacing: -0.6,
                }}>
                Welcome to your Digital Sanctuary
              </SazdaText>
              <SazdaText variant="bodyMedium" color="onSurfaceVariant" align="center" style={{ maxWidth: 360, opacity: 0.82, lineHeight: 24 }}>
                Sign in to sync your spiritual journey, progress, and daily insights across all your devices.
              </SazdaText>
            </View>

            <Pressable
              disabled={busy}
              onPress={onGoogle}
              accessibilityRole="button"
              accessibilityLabel="Sign in with Google"
              style={({ pressed }) => [styles.googleBtn, pressed && !busy && styles.pressed, busy && { opacity: 0.72 }]}>
              {busy ? (
                <ActivityIndicator color={c.primary} />
              ) : (
                <>
                  <GoogleGLogo size={24} />
                  <SazdaText
                    variant="bodyMedium"
                    color="onSurface"
                    style={{ fontWeight: '600', letterSpacing: 0.25 }}>
                    Sign in with Google
                  </SazdaText>
                </>
              )}
            </Pressable>

            {error ? (
              <SazdaText variant="caption" color="error" align="center" style={styles.err}>
                {error}
              </SazdaText>
            ) : !isFirebaseConfigured() ? (
              <SazdaText variant="caption" color="onSurfaceVariant" align="center" style={styles.err}>
                Add your Firebase web app config in firebasePublic.ts.
              </SazdaText>
            ) : !isGoogleSignInConfigured() ? (
              <SazdaText variant="caption" color="onSurfaceVariant" align="center" style={styles.err}>
                Set googleWebClientId (OAuth Web client from Google Cloud Console) to finish Google sign-in.
              </SazdaText>
            ) : null}

            <Pressable
              onPress={signInAsGuest}
              style={({ pressed }) => [styles.guestBtn, pressed && { opacity: 0.85 }]}
              accessibilityRole="button"
              accessibilityLabel="Continue as guest">
              <SazdaText variant="bodyMedium" color="primary" style={styles.guestText}>
                Continue as guest
              </SazdaText>
            </Pressable>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.secondary }} />
            <View style={{ width: 96, height: 1, backgroundColor: c.secondaryContainer }} />
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.secondary }} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
