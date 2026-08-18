import { View, StyleSheet } from 'react-native';
import { PrayerReminderAppStateSync } from '../components/organisms/PrayerReminderAppStateSync';
import { NotificationOnboardingModal } from '../components/organisms/NotificationOnboardingModal';
import { WelcomeContextNotificationScheduler } from '../components/organisms/WelcomeContextNotificationScheduler';
import { useSignedInCloudSync } from '../hooks/useSignedInCloudSync';
import { AppTabs } from './AppTabs';

/**
 * Authenticated app shell: bottom tabs plus the always-mounted side-effect
 * organisms (reminder sync, welcome scheduler, notification onboarding).
 */
export function MainShell() {
  useSignedInCloudSync();

  return (
    <View style={styles.flex}>
      <PrayerReminderAppStateSync />
      <WelcomeContextNotificationScheduler />
      <NotificationOnboardingModal />
      <AppTabs />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
