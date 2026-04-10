import { useCallback } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft } from 'lucide-react-native';
import type { ProfileStackParamList } from '../../navigation/types';
import { useThemePalette } from '../../theme/useThemePalette';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { fontFamilies } from '../../theme/typography';
import { useGeneralNotificationSettingsStore } from '../../store/generalNotificationSettingsStore';
import { requestNotificationPermission } from '../../services/prayerReminders';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'NotificationPreferences'>;

export function NotificationPreferencesScreen() {
  const navigation = useNavigation<Nav>();
  const { colors: c } = useThemePalette();

  const streakReminderEnabled = useGeneralNotificationSettingsStore(s => s.streakReminderEnabled);
  const setStreakReminderEnabled = useGeneralNotificationSettingsStore(s => s.setStreakReminderEnabled);
  const quranReminderEnabled = useGeneralNotificationSettingsStore(s => s.quranReminderEnabled);
  const setQuranReminderEnabled = useGeneralNotificationSettingsStore(s => s.setQuranReminderEnabled);
  const quranReminderHour = useGeneralNotificationSettingsStore(s => s.quranReminderHour);
  const quranReminderMinute = useGeneralNotificationSettingsStore(s => s.quranReminderMinute);
  const setQuranReminderTime = useGeneralNotificationSettingsStore(s => s.setQuranReminderTime);
  const ramadanNotificationsEnabled = useGeneralNotificationSettingsStore(s => s.ramadanNotificationsEnabled);
  const setRamadanNotificationsEnabled = useGeneralNotificationSettingsStore(s => s.setRamadanNotificationsEnabled);
  const suhoorOffsetMinutes = useGeneralNotificationSettingsStore(s => s.suhoorOffsetMinutes);
  const setSuhoorOffsetMinutes = useGeneralNotificationSettingsStore(s => s.setSuhoorOffsetMinutes);
  const iftarOffsetMinutes = useGeneralNotificationSettingsStore(s => s.iftarOffsetMinutes);
  const setIftarOffsetMinutes = useGeneralNotificationSettingsStore(s => s.setIftarOffsetMinutes);
  const lastTenNightsReminderEnabled = useGeneralNotificationSettingsStore(s => s.lastTenNightsReminderEnabled);
  const setLastTenNightsReminderEnabled = useGeneralNotificationSettingsStore(s => s.setLastTenNightsReminderEnabled);

  const ensurePerm = useCallback(async () => {
    await requestNotificationPermission();
  }, []);

  const formatQuranTime = () => {
    const h = quranReminderHour % 12 || 12;
    const ampm = quranReminderHour < 12 ? 'AM' : 'PM';
    const m = String(quranReminderMinute).padStart(2, '0');
    return `${h}:${m} ${ampm}`;
  };

  const bumpQuranTime = (deltaMin: number) => {
    let total = quranReminderHour * 60 + quranReminderMinute + deltaMin;
    total = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
    setQuranReminderTime(Math.floor(total / 60), total % 60);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.surface }]} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}>
          <ChevronLeft size={28} color={c.primary} strokeWidth={2.25} />
        </Pressable>
        <Text style={[styles.title, { color: c.primary }]}>Notifications</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.lead, { color: c.onSurfaceVariant }]}>
          Prayer-time alerts with Adhan audio are in Adhan Settings. Here you can enable gentle reminders that
          always use your system default sound — never the Adhan.
        </Text>

        <Text style={[styles.sectionLabel, { color: c.onSurfaceVariant }]}>Reminders</Text>
        <View style={[styles.card, { backgroundColor: c.surfaceContainerLow }]}>
          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={[styles.rowTitle, { color: c.onSurface }]}>Evening streak check-in</Text>
              <Text style={[styles.rowHint, { color: c.onSurfaceVariant }]}>
                Once around 9:10 PM if you have not marked all five daily prayers yet.
              </Text>
            </View>
            <Switch
              value={streakReminderEnabled}
              onValueChange={async v => {
                await ensurePerm();
                setStreakReminderEnabled(v);
              }}
              trackColor={{ false: c.outlineVariant, true: c.primaryContainer }}
              thumbColor={streakReminderEnabled ? c.secondaryContainer : c.surfaceContainerHighest}
            />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: c.surfaceContainerLow }]}>
          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={[styles.rowTitle, { color: c.onSurface }]}>Daily Quran nudge</Text>
              <Text style={[styles.rowHint, { color: c.onSurfaceVariant }]}>
                Quiet prompt to open the Quran ({formatQuranTime()}).
              </Text>
            </View>
            <Switch
              value={quranReminderEnabled}
              onValueChange={async v => {
                await ensurePerm();
                setQuranReminderEnabled(v);
              }}
              trackColor={{ false: c.outlineVariant, true: c.primaryContainer }}
              thumbColor={quranReminderEnabled ? c.secondaryContainer : c.surfaceContainerHighest}
            />
          </View>
          {quranReminderEnabled ? (
            <View style={styles.timeAdjust}>
              <Pressable
                onPress={() => bumpQuranTime(-15)}
                style={({ pressed }) => [styles.timeBtn, { borderColor: c.outlineVariant }, pressed && { opacity: 0.85 }]}>
                <Text style={[styles.timeBtnText, { color: c.primary }]}>−15m</Text>
              </Pressable>
              <Text style={[styles.timeDisplay, { color: c.primary }]}>{formatQuranTime()}</Text>
              <Pressable
                onPress={() => bumpQuranTime(15)}
                style={({ pressed }) => [styles.timeBtn, { borderColor: c.outlineVariant }, pressed && { opacity: 0.85 }]}>
                <Text style={[styles.timeBtnText, { color: c.primary }]}>+15m</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        <Text style={[styles.sectionLabel, { color: c.onSurfaceVariant }]}>Ramadan (seasonal)</Text>
        <Text style={[styles.microHint, { color: c.onSurfaceVariant }]}>
          Uses approximate local Ramadan dates. Suhoor and Iftar times follow your location prayer times.
        </Text>
        <View style={[styles.card, { backgroundColor: c.surfaceContainerLow }]}>
          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={[styles.rowTitle, { color: c.onSurface }]}>Ramadan helpers</Text>
              <Text style={[styles.rowHint, { color: c.onSurfaceVariant }]}>
                Suhoor before Fajr, Iftar before Maghrib — default sound only.
              </Text>
            </View>
            <Switch
              value={ramadanNotificationsEnabled}
              onValueChange={async v => {
                await ensurePerm();
                setRamadanNotificationsEnabled(v);
              }}
              trackColor={{ false: c.outlineVariant, true: c.primaryContainer }}
              thumbColor={ramadanNotificationsEnabled ? c.secondaryContainer : c.surfaceContainerHighest}
            />
          </View>
          {ramadanNotificationsEnabled ? (
            <>
              <Text style={[styles.subLabel, { color: c.onSurfaceVariant }]}>Minutes before Fajr (Suhoor)</Text>
              <View style={styles.stepRow}>
                <Pressable onPress={() => setSuhoorOffsetMinutes(suhoorOffsetMinutes - 5)} style={styles.stepBtn}>
                  <Text style={{ color: c.primary }}>−</Text>
                </Pressable>
                <Text style={[styles.stepVal, { color: c.primary }]}>{suhoorOffsetMinutes} min</Text>
                <Pressable onPress={() => setSuhoorOffsetMinutes(suhoorOffsetMinutes + 5)} style={styles.stepBtn}>
                  <Text style={{ color: c.primary }}>+</Text>
                </Pressable>
              </View>
              <Text style={[styles.subLabel, { color: c.onSurfaceVariant }]}>Minutes before Maghrib (Iftar)</Text>
              <View style={styles.stepRow}>
                <Pressable onPress={() => setIftarOffsetMinutes(iftarOffsetMinutes - 5)} style={styles.stepBtn}>
                  <Text style={{ color: c.primary }}>−</Text>
                </Pressable>
                <Text style={[styles.stepVal, { color: c.primary }]}>{iftarOffsetMinutes} min</Text>
                <Pressable onPress={() => setIftarOffsetMinutes(iftarOffsetMinutes + 5)} style={styles.stepBtn}>
                  <Text style={{ color: c.primary }}>+</Text>
                </Pressable>
              </View>
              <View style={[styles.switchRow, { marginTop: spacing.md }]}>
                <View style={styles.switchTextCol}>
                  <Text style={[styles.rowTitle, { color: c.onSurface }]}>Last nights of Ramadan</Text>
                  <Text style={[styles.rowHint, { color: c.onSurfaceVariant }]}>
                    A single gentle reminder in the final ten days.
                  </Text>
                </View>
                <Switch
                  value={lastTenNightsReminderEnabled}
                  onValueChange={async v => {
                    await ensurePerm();
                    setLastTenNightsReminderEnabled(v);
                  }}
                  trackColor={{ false: c.outlineVariant, true: c.primaryContainer }}
                  thumbColor={lastTenNightsReminderEnabled ? c.secondaryContainer : c.surfaceContainerHighest}
                />
              </View>
            </>
          ) : null}
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
  lead: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    fontFamily: fontFamilies.body,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginTop: spacing.sm,
  },
  microHint: {
    fontFamily: fontFamilies.body,
    fontSize: 12,
    lineHeight: 17,
    marginTop: -spacing.xs,
  },
  card: {
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  switchTextCol: { flex: 1 },
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
    marginTop: 4,
  },
  subLabel: {
    fontFamily: fontFamilies.body,
    fontSize: 12,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  stepBtn: {
    minWidth: 40,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  stepVal: {
    fontFamily: fontFamilies.body,
    fontSize: 16,
    fontWeight: '700',
    minWidth: 72,
    textAlign: 'center',
  },
  timeAdjust: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  timeBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  timeBtnText: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    fontWeight: '700',
  },
  timeDisplay: {
    fontFamily: fontFamilies.body,
    fontSize: 17,
    fontWeight: '800',
    minWidth: 100,
    textAlign: 'center',
  },
});
