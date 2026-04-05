import { createDrawerNavigator } from '@react-navigation/drawer';
import { View, StyleSheet } from 'react-native';
import { AppDrawerContent } from '../components/organisms/AppDrawerContent';
import { PrayerReminderAppStateSync } from '../components/organisms/PrayerReminderAppStateSync';
import { NotificationOnboardingModal } from '../components/organisms/NotificationOnboardingModal';
import { WelcomeContextNotificationScheduler } from '../components/organisms/WelcomeContextNotificationScheduler';
import { useSignedInCloudSync } from '../hooks/useSignedInCloudSync';
import { AppTabs } from './AppTabs';
import { useThemePalette } from '../theme/useThemePalette';
import type { MainDrawerParamList } from './types';

const Drawer = createDrawerNavigator<MainDrawerParamList>();

export function MainDrawer() {
  const { colors: c, scheme } = useThemePalette();
  useSignedInCloudSync();

  return (
    <View style={styles.flex}>
      <PrayerReminderAppStateSync />
      <WelcomeContextNotificationScheduler />
      <NotificationOnboardingModal />
      <Drawer.Navigator
        drawerContent={AppDrawerContent}
        screenOptions={{
          headerShown: false,
          drawerType: 'slide',
          overlayColor:
            scheme === 'dark' ? 'rgba(0, 0, 0, 0.55)' : 'rgba(0, 53, 39, 0.38)',
          drawerStyle: {
            width: '88%',
            maxWidth: 320,
            backgroundColor: c.surface,
          },
          swipeEnabled: true,
        }}>
        <Drawer.Screen
          name="MainTabs"
          component={AppTabs}
          options={{ title: 'Sazda' }}
        />
      </Drawer.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
