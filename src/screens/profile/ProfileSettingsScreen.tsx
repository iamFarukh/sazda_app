import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SazdaSwitch } from '../../components/atoms/SazdaSwitch/SazdaSwitch';
import { PressableScale } from '../../components/atoms/PressableScale/PressableScale';
import { hapticSelection } from '../../utils/appHaptics';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft } from 'lucide-react-native';
import { useNavigateMainTab } from '../../navigation/useNavigateMainTab';
import type { ProfileStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { useQuranProgressStore } from '../../store/quranProgressStore';
import { useThemeStore, type ThemePreference } from '../../store/themeStore';
import { useThemePalette } from '../../theme/useThemePalette';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { fontFamilies } from '../../theme/typography';
import { hapticMedium } from '../../utils/appHaptics';
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from '../../constants/legal';

import DeviceInfo from 'react-native-device-info';

const APP_VERSION = DeviceInfo.getVersion();

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'ProfileSettings'>;

function ThemeChip({
  label,
  selected,
  onPress,
  colors: c,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useThemePalette>['colors'];
}) {
  return (
    <PressableScale
      onPress={() => {
        hapticSelection();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? c.primaryContainer : c.surfaceContainerLow,
          borderColor: selected ? c.primary : c.outlineVariant,
        },
      ]}>
      <Text
        style={[
          styles.chipText,
          { color: selected ? c.secondaryContainer : c.onSurfaceVariant },
        ]}>
        {label}
      </Text>
    </PressableScale>
  );
}

export function ProfileSettingsScreen() {
  const navigation = useNavigation<Nav>();
  const goTab = useNavigateMainTab();
  const { colors: c } = useThemePalette();
  const preference = useThemeStore(s => s.preference);
  const setPreference = useThemeStore(s => s.setPreference);
  const showTranslation = useQuranProgressStore(s => s.showTranslation);
  const setShowTranslation = useQuranProgressStore(s => s.setShowTranslation);
  const signOut = useAuthStore(s => s.signOut);
  const deleteAccount = useAuthStore(s => s.deleteAccount);
  const [deleting, setDeleting] = useState(false);

  const setTheme = useCallback(
    (p: ThemePreference) => {
      hapticMedium();
      setPreference(p);
    },
    [setPreference],
  );

  const onTranslationChange = useCallback(
    (v: boolean) => {
      hapticMedium();
      setShowTranslation(v);
    },
    [setShowTranslation],
  );

  const openUrl = useCallback((url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Could not open link', url);
    });
  }, []);

  const onDeleteAccount = useCallback(() => {
    if (deleting) return;
    Alert.alert(
      'Delete account',
      'This permanently deletes your Sazda account and all synced data (bookmarks, Zakat records, prayer tracker, and profile). This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            const r = await deleteAccount();
            setDeleting(false);
            if (r.ok) {
              goTab('HomeTab');
              navigation.goBack();
            } else {
              Alert.alert('Could not delete account', r.message);
            }
          },
        },
      ],
    );
  }, [deleting, deleteAccount, goTab, navigation]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.surface }]} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}>
          <ChevronLeft size={28} color={c.primary} strokeWidth={2.25} />
        </Pressable>
        <Text style={[styles.title, { color: c.primary }]}>Settings</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionLabel, { color: c.onSurfaceVariant }]}>Appearance</Text>
        <View style={[styles.card, { backgroundColor: c.surfaceContainerLow }]}>
          <Text style={[styles.rowTitle, { color: c.onSurface }]}>Theme</Text>
          <Text style={[styles.rowHint, { color: c.onSurfaceVariant }]}>
            Light, dark, or follow the system.
          </Text>
          <View style={styles.chipRow}>
            <ThemeChip
              label="Light"
              selected={preference === 'light'}
              onPress={() => setTheme('light')}
              colors={c}
            />
            <ThemeChip
              label="Dark"
              selected={preference === 'dark'}
              onPress={() => setTheme('dark')}
              colors={c}
            />
            <ThemeChip
              label="System"
              selected={preference === 'system'}
              onPress={() => setTheme('system')}
              colors={c}
            />
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: c.onSurfaceVariant }]}>Quran</Text>
        <View style={[styles.card, { backgroundColor: c.surfaceContainerLow }]}>
          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={[styles.rowTitle, { color: c.onSurface }]}>Show translation</Text>
              <Text style={[styles.rowHint, { color: c.onSurfaceVariant }]}>
                English under Arabic in the reader.
              </Text>
            </View>
            <SazdaSwitch
              value={showTranslation}
              onValueChange={onTranslationChange}
              trackColor={{ false: c.outlineVariant, true: c.primaryContainer }}
              thumbColor={showTranslation ? c.secondaryContainer : c.surfaceContainerHighest}
            />
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: c.onSurfaceVariant }]}>Notifications</Text>
        <Pressable
          onPress={() => navigation.navigate('NotificationPreferences')}
          style={({ pressed }) => [
            styles.card,
            styles.linkCard,
            { backgroundColor: c.surfaceContainerLow },
            pressed && { opacity: 0.92 },
          ]}>
          <Text style={[styles.rowTitle, { color: c.onSurface }]}>Reminders & Ramadan</Text>
          <Text style={[styles.rowHint, { color: c.onSurfaceVariant }]}>
            Streak check-ins, Quran nudge, and seasonal Ramadan helpers — default sound only.
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            navigation.navigate('AdhanSettings');
          }}
          style={({ pressed }) => [
            styles.card,
            styles.linkCard,
            { backgroundColor: c.surfaceContainerLow },
            pressed && { opacity: 0.92 },
          ]}>
          <Text style={[styles.rowTitle, { color: c.onSurface }]}>Adhan (prayer times)</Text>
          <Text style={[styles.rowHint, { color: c.onSurfaceVariant }]}>
            Five daily prayer alerts with Adhan audio and per-prayer sound options.
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            goTab('ToolsTab', 'PrayerTracker');
            navigation.goBack();
          }}
          style={({ pressed }) => [
            styles.card,
            styles.linkCard,
            { backgroundColor: c.surfaceContainerLow },
            pressed && { opacity: 0.92 },
          ]}>
          <Text style={[styles.rowTitle, { color: c.onSurface }]}>Prayer tracker</Text>
          <Text style={[styles.rowHint, { color: c.onSurfaceVariant }]}>
            Mark prayers and see your streak on the Tools tab.
          </Text>
        </Pressable>

        <Text style={[styles.sectionLabel, { color: c.onSurfaceVariant }]}>Account</Text>
        <Pressable
          onPress={() => {
            void signOut();
            goTab('HomeTab');
            navigation.goBack();
          }}
          style={({ pressed }) => [
            styles.card,
            styles.dangerCard,
            { borderColor: c.error },
            pressed && { opacity: 0.9 },
          ]}>
          <Text style={[styles.rowTitle, { color: c.error }]}>Sign out</Text>
          <Text style={[styles.rowHint, { color: c.onSurfaceVariant }]}>
            Ends Google or guest session on this device.
          </Text>
        </Pressable>

        <Pressable
          onPress={onDeleteAccount}
          disabled={deleting}
          style={({ pressed }) => [
            styles.card,
            styles.dangerCard,
            { borderColor: c.error },
            pressed && { opacity: 0.9 },
            deleting && { opacity: 0.6 },
          ]}>
          <View style={styles.deleteRow}>
            <View style={styles.switchTextCol}>
              <Text style={[styles.rowTitle, { color: c.error }]}>Delete account</Text>
              <Text style={[styles.rowHint, { color: c.onSurfaceVariant }]}>
                Permanently removes your account and all cloud data. This cannot be undone.
              </Text>
            </View>
            {deleting ? <ActivityIndicator color={c.error} /> : null}
          </View>
        </Pressable>

        <Text style={[styles.sectionLabel, { color: c.onSurfaceVariant }]}>Legal</Text>
        <Pressable
          onPress={() => openUrl(PRIVACY_POLICY_URL)}
          style={({ pressed }) => [
            styles.card,
            styles.linkCard,
            { backgroundColor: c.surfaceContainerLow },
            pressed && { opacity: 0.92 },
          ]}>
          <Text style={[styles.rowTitle, { color: c.onSurface }]}>Privacy Policy</Text>
          <Text style={[styles.rowHint, { color: c.onSurfaceVariant }]}>
            How Sazda handles your data.
          </Text>
        </Pressable>
        <Pressable
          onPress={() => openUrl(TERMS_OF_SERVICE_URL)}
          style={({ pressed }) => [
            styles.card,
            styles.linkCard,
            { backgroundColor: c.surfaceContainerLow },
            pressed && { opacity: 0.92 },
          ]}>
          <Text style={[styles.rowTitle, { color: c.onSurface }]}>Terms of Service</Text>
          <Text style={[styles.rowHint, { color: c.onSurfaceVariant }]}>
            The terms you agree to when using Sazda.
          </Text>
        </Pressable>

        <View style={styles.brandingMutedGroup}>
          <Text style={[styles.muted, { color: c.onSurfaceVariant, marginTop: 0 }]}>
            Sazda v{APP_VERSION}
          </Text>
          <Text style={[styles.muted, { color: c.onSurfaceVariant, marginTop: 4, opacity: 0.7 }]}>
            App developed by farukhchenda
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: {
    fontFamily: fontFamilies.headline,
    fontSize: 20,
    fontWeight: '800',
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.x3xl,
    gap: spacing.md,
  },
  sectionLabel: {
    fontFamily: fontFamilies.body,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginTop: spacing.sm,
  },
  card: {
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  linkCard: { marginBottom: spacing.xs },
  rowTitle: {
    fontFamily: fontFamilies.body,
    fontSize: 16,
    fontWeight: '700',
  },
  rowHint: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  chip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  switchTextCol: { flex: 1 },
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  dangerCard: {
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(186, 26, 26, 0.08)',
  },
  brandingMutedGroup: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  muted: {
    fontFamily: fontFamilies.body,
    fontSize: 12,
    textAlign: 'center',
  },
});
