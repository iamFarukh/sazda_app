import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { selectAppUnlocked, useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { AuthStackNavigator } from './AuthStackNavigator';
import { MainShell } from './MainShell';
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen';
import { useAppNavigationTheme } from './useAppNavigationTheme';
import { useThemePalette } from '../theme/useThemePalette';
import { navigationRef } from './navigationRef';

export function RootNavigator() {
  const authReady = useAuthStore(s => s.authReady);
  const appUnlocked = useAuthStore(s => selectAppUnlocked(s));
  const hasSeenOnboarding = useAppStore(s => s.hasSeenOnboarding);
  const theme = useAppNavigationTheme();
  const { colors: c } = useThemePalette();

  return (
    <NavigationContainer theme={theme} ref={navigationRef}>
      {!hasSeenOnboarding ? (
        <OnboardingScreen />
      ) : !authReady ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.surface }}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      ) : appUnlocked ? (
        <MainShell />
      ) : (
        <AuthStackNavigator />
      )}
    </NavigationContainer>
  );
}
