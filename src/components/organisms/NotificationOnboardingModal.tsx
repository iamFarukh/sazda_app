import { useCallback, useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { useThemePalette } from '../../theme/useThemePalette';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Button } from '../atoms/Button/Button';
import { useNotificationOnboardingStore } from '../../store/notificationOnboardingStore';
import { useAdhanSettingsStore } from '../../store/adhanSettingsStore';
import { usePrayerReminderStore } from '../../store/prayerReminderStore';
import { requestNotificationPermission } from '../../services/prayerReminders';
import type { MainDrawerParamList } from '../../navigation/types';
import { hapticMedium } from '../../utils/appHaptics';

type DrawerNav = DrawerNavigationProp<MainDrawerParamList>;

const PREVIEW_ROWS: { title: string; body: string; meta: string }[] = [
  {
    meta: 'Sazda • Now',
    title: 'Fajr time',
    body: 'It is time for Fajr prayer.',
  },
  {
    meta: 'Sazda • reminder',
    title: 'Dhuhr in 10 minutes',
    body: 'Prepare for your afternoon prayer.',
  },
  {
    meta: 'Sazda • status',
    title: 'Prayer ongoing',
    body: 'Silent mode can match your adhan settings.',
  },
];

export function NotificationOnboardingModal() {
  const { colors: c } = useThemePalette();
  const navigation = useNavigation<DrawerNav>();
  const hasSeen = useNotificationOnboardingStore(s => s.hasSeenNotificationPrompt);
  const complete = useNotificationOnboardingStore(s => s.completeNotificationPrompt);
  const setPendingWelcome = useNotificationOnboardingStore(s => s.setPendingWelcomeContextNotification);
  const setAdhanMaster = useAdhanSettingsStore(s => s.setMasterEnabled);
  const setReminderMaster = usePrayerReminderStore(s => s.setMasterEnabled);

  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (hasSeen) {
      setOpen(false);
      return;
    }
    const t = setTimeout(() => setOpen(true), 800);
    return () => clearTimeout(t);
  }, [hasSeen]);

  const dismiss = useCallback(() => {
    complete();
    setOpen(false);
  }, [complete]);

  const onEnable = useCallback(async () => {
    hapticMedium();
    setPendingWelcome(true);
    await requestNotificationPermission();
    setAdhanMaster(true);
    setReminderMaster(true);
    dismiss();
  }, [dismiss, setAdhanMaster, setReminderMaster, setPendingWelcome]);

  const onCustomize = useCallback(() => {
    hapticMedium();
    dismiss();
    navigation.navigate('MainTabs', {
      screen: 'ProfileTab',
      params: { screen: 'AdhanSettings' },
    });
  }, [dismiss, navigation]);

  const onMaybeLater = useCallback(() => {
    hapticMedium();
    dismiss();
  }, [dismiss]);

  return (
    <Modal visible={open} animationType="fade" transparent onRequestClose={onMaybeLater}>
      <Pressable style={[styles.backdrop, { backgroundColor: 'rgba(0, 53, 39, 0.45)' }]} onPress={onMaybeLater} />
      <View style={styles.center} pointerEvents="box-none">
        <Pressable
          onPress={() => {}}
          style={[styles.sheet, { backgroundColor: c.surface, borderColor: c.outlineVariant }]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            bounces={false}>
            <Text style={[typography.headlineMedium, { color: c.primary }]}>Stay mindful</Text>
            <Text style={[typography.bodyMedium, styles.subtitle, { color: c.onSurfaceVariant }]}>
              Get prayer time alerts on this device. You can change sounds and reminders anytime in settings.
            </Text>

            <View style={styles.previewStack}>
              {PREVIEW_ROWS.map((row, i) => (
                <View
                  key={i}
                  style={[
                    styles.previewCard,
                    {
                      backgroundColor: c.surfaceContainerLow,
                      borderColor: c.outlineVariant,
                    },
                  ]}>
                  <Text style={[typography.label, { color: c.primary, opacity: 0.7 }]}>{row.meta}</Text>
                  <Text style={[typography.titleSm, { color: c.primary, marginTop: 4 }]}>{row.title}</Text>
                  <Text style={[typography.caption, { color: c.onSurfaceVariant, marginTop: 2 }]}>{row.body}</Text>
                </View>
              ))}
            </View>

            <Button title="Turn on notifications" variant="primary" size="lg" onPress={onEnable} />
            <View style={styles.gapSm} />
            <Button title="Customize in settings" variant="secondary" size="md" onPress={onCustomize} />
            <Pressable onPress={onMaybeLater} style={styles.maybeLater} hitSlop={12}>
              <Text style={[typography.bodyMedium, { color: c.onSurfaceVariant }]}>Maybe later</Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  sheet: {
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    maxHeight: '88%',
    overflow: 'hidden',
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  subtitle: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  previewStack: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  previewCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  gapSm: {
    height: spacing.sm,
  },
  maybeLater: {
    alignSelf: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
  },
});
