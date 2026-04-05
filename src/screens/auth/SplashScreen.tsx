import { useMemo } from 'react';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AuthStackParamList } from '../../navigation/types';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useAuthStore } from '../../store/authStore';
import { useThemePalette } from '../../theme/useThemePalette';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Splash'>;

export function SplashScreen() {
  const navigation = useNavigation<Nav>();
  const signInAsGuest = useAuthStore(s => s.signInAsGuest);
  const { colors: c } = useThemePalette();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing.lg,
          backgroundColor: c.surface,
        },
        logo: {
          ...typography.headlineLarge,
          color: c.primary,
        },
        tagline: {
          ...typography.body,
          color: c.onSurfaceVariant,
          marginTop: spacing.xs,
          marginBottom: spacing.xl,
        },
        primaryBtn: {
          backgroundColor: c.primaryContainer,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.xl,
          borderRadius: 24,
          minWidth: 200,
          alignItems: 'center',
        },
        primaryBtnText: {
          ...typography.bodyMedium,
          color: c.onPrimaryContainer,
        },
        ghostBtn: {
          marginTop: spacing.md,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.lg,
        },
        ghostBtnText: {
          ...typography.bodyMedium,
          color: c.primary,
        },
        pressed: { opacity: 0.85 },
      }),
    [c],
  );

  return (
    <View style={styles.root}>
      <Text style={styles.logo}>Sazda</Text>
      <Text style={styles.tagline}>Connect. Reflect. Grow.</Text>
      <Pressable
        style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
        onPress={() => navigation.navigate('SignIn')}>
        <Text style={styles.primaryBtnText}>Get started</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
        onPress={signInAsGuest}>
        <Text style={styles.ghostBtnText}>Continue as guest</Text>
      </Pressable>
    </View>
  );
}
