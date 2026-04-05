import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import { CheckCircle2 } from 'lucide-react-native';
import { SazdaText } from '../../components/atoms/SazdaText/SazdaText';
import type { AuthStackParamList } from '../../navigation/types';
import { getFirebaseAuth } from '../../services/firebase/client';
import { syncAfterGoogleLogin } from '../../services/firebase/syncQuranProgress';
import type { FirebaseUserSnapshot } from '../../store/authStore';
import { useAuthStore } from '../../store/authStore';
import { spacing } from '../../theme/spacing';
import { fontFamilies } from '../../theme/typography';

type R = RouteProp<AuthStackParamList, 'SignInSuccess'>;

const AUTO_MS = 2800;

function snapshotFromAuth(): FirebaseUserSnapshot | null {
  try {
    const u = getFirebaseAuth().currentUser;
    if (!u) return null;
    return {
      uid: u.uid,
      email: u.email,
      displayName: u.displayName,
      photoURL: u.photoURL,
    };
  } catch {
    return null;
  }
}

export function SignInSuccessScreen() {
  const route = useRoute<R>();
  const { displayName } = route.params;
  const completeGoogleCelebration = useAuthStore(s => s.completeGoogleCelebration);
  const [syncing, setSyncing] = useState(false);
  const doneRef = useRef(false);

  const finish = useCallback(async () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setSyncing(true);
    try {
      const u = useAuthStore.getState().firebaseUser ?? snapshotFromAuth();
      if (u) {
        // Enforce a strict timeout so the user is never permanently stuck
        await Promise.race([
          syncAfterGoogleLogin(u.uid, u),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Sync timeout')), 4000)),
        ]);
      }
    } catch {
      /* still enter app; local data remains or sync failed silently */
    } finally {
      setSyncing(false);
      completeGoogleCelebration();
    }
  }, [completeGoogleCelebration]);

  useEffect(() => {
    const t = setTimeout(() => {
      finish();
    }, AUTO_MS);
    return () => clearTimeout(t);
  }, [finish]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: {
          flex: 1,
          backgroundColor: '#003527',
        },
        inner: {
          flex: 1,
          paddingHorizontal: spacing.lg,
          justifyContent: 'center',
          alignItems: 'center',
        },
        halo: {
          width: 120,
          height: 120,
          borderRadius: 60,
          backgroundColor: 'rgba(255,255,255,0.08)',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: 'rgba(255,255,255,0.12)',
          marginBottom: spacing.x3xl,
        },
        btn: {
          marginTop: spacing.x3xl,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.xxl,
          borderRadius: 999,
          backgroundColor: 'rgba(254, 214, 91, 0.95)',
          minWidth: 200,
          alignItems: 'center',
        },
        btnPressed: { opacity: 0.9 },
      }),
    [],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.inner}>
        <View style={styles.halo}>
          <CheckCircle2 size={64} color="#FED65B" strokeWidth={1.75} />
        </View>
        <SazdaText
          variant="headlineLarge"
          color="onPrimary"
          align="center"
          style={{
            fontFamily: fontFamilies.headline,
            fontWeight: '800',
            fontSize: 30,
            lineHeight: 36,
            marginBottom: spacing.md,
          }}>
          Assalamu Alaikum, {displayName}!
        </SazdaText>
        <SazdaText variant="bodyMedium" color="onPrimary" align="center" style={{ opacity: 0.88, maxWidth: 340 }}>
          Your sanctuary is ready. Your Quran progress will stay on this device and sync to your account when
          online.
        </SazdaText>

        <Pressable
          onPress={finish}
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed, syncing && { opacity: 0.7 }]}
          disabled={syncing}>
          <SazdaText variant="label" color="primary" style={{ fontWeight: '800' }}>
            {syncing ? 'Syncing…' : 'Continue'}
          </SazdaText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
