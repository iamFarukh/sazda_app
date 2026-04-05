import { ScrollView, StyleSheet, Switch, Text, View, Pressable, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, Volume2, Volume1, VolumeX, Timer, Vibrate, Music, Bell } from 'lucide-react-native';
import { useThemePalette } from '../../theme/useThemePalette';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { fontFamilies } from '../../theme/typography';
import { useAdhanSettingsStore, type AdhanVolumeMode } from '../../store/adhanSettingsStore';
import { getBuiltinAdhanDisplayName, getBuiltinAdhanBundleFile } from '../../constants/adhanBuiltInSounds';
import { FIVE_DAILY_PRAYERS, type FiveDailyPrayer } from '../../store/prayerTrackerStore';
import type { ProfileStackParamList } from '../../navigation/types';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useMemo, useState } from 'react';
import {
  requestNotificationPermission,
  sendTestAdhanNotification,
  scheduleTestAdhanInSeconds,
} from '../../services/prayerReminders';
import { playBundledAdhanPreview } from '../../services/adhanPreview';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'AdhanSettings'>;

function getSoundLabel(soundId: string) {
  return getBuiltinAdhanDisplayName(soundId) ?? 'Custom Sound';
}

export function AdhanSettingsScreen() {
  const navigation = useNavigation<Nav>();
  const { colors: c } = useThemePalette();
  
  const masterEnabled = useAdhanSettingsStore(s => s.masterEnabled);
  const setMasterEnabled = useAdhanSettingsStore(s => s.setMasterEnabled);
  const byPrayer = useAdhanSettingsStore(s => s.byPrayer);
  const preReminderEnabled = useAdhanSettingsStore(s => s.preReminderEnabled);
  const setPreReminderEnabled = useAdhanSettingsStore(s => s.setPreReminderEnabled);
  const vibrationEnabled = useAdhanSettingsStore(s => s.vibrationEnabled);
  const setVibrationEnabled = useAdhanSettingsStore(s => s.setVibrationEnabled);
  const setPrayerVolumeMode = useAdhanSettingsStore(s => s.setPrayerVolumeMode);

  const [testBusy, setTestBusy] = useState(false);

  const runNotificationTest = async (fn: () => Promise<void>) => {
    setTestBusy(true);
    try {
      const ok = await requestNotificationPermission();
      if (!ok) {
        Alert.alert('Permission needed', 'Allow notifications to hear and see test alerts.');
        return;
      }
      await fn();
      Alert.alert('Test sent', 'Check your notification shade or lock screen.');
    } catch (e) {
      Alert.alert('Test failed', e instanceof Error ? e.message : String(e));
    } finally {
      setTestBusy(false);
    }
  };

  const computedGlobalMode = useMemo(() => {
    const modes = Object.values(byPrayer).map(p => p.volumeMode);
    if (modes.every(m => m === 'LOUD')) return 'LOUD';
    if (modes.every(m => m === 'SOFT')) return 'SOFT';
    if (modes.every(m => m === 'SILENT')) return 'SILENT';
    return null;
  }, [byPrayer]);

  // Helper to change all prayers to one mode
  const setGlobalMode = (mode: AdhanVolumeMode) => {
    FIVE_DAILY_PRAYERS.forEach(p => setPrayerVolumeMode(p, mode));
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.surface }]} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}>
          <ChevronLeft size={28} color={c.primary} strokeWidth={2.25} />
        </Pressable>
        <Text style={[styles.title, { color: c.primary }]}>Adhan Settings</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        {/* Header Section */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.headerBox}>
          <Text style={[styles.heading, { color: c.primary }]}>Adhan Settings</Text>
          <Text style={[styles.subheading, { color: c.onSurfaceVariant }]}>
            Customize your call to prayer notifications and alerts.
          </Text>
        </Animated.View>

        {/* Master Toggle */}
        <Animated.View entering={FadeInDown.duration(400).delay(150)}>
          <View style={[styles.card, { backgroundColor: c.surfaceContainerLowest }]}>
            <View style={styles.row}>
              <View style={[styles.iconCircle, { backgroundColor: c.primaryContainer }]}>
                <Volume2 size={24} color={c.onPrimary} />
              </View>
              <View style={styles.textCol}>
                <Text style={[styles.rowTitle, { color: c.primary }]}>Enable Adhan</Text>
                <Text style={[styles.rowSub, { color: c.onSurfaceVariant }]}>Global prayer alerts</Text>
              </View>
              <Switch
                value={masterEnabled}
                onValueChange={setMasterEnabled}
                trackColor={{ false: c.surfaceContainerHighest, true: c.primaryContainer }}
                thumbColor={masterEnabled ? c.onPrimary : c.surfaceContainerHighest}
              />
            </View>
          </View>
        </Animated.View>

        {/* Prayer List */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.section}>
          <Text style={[styles.sectionLabel, { color: c.primary }]}>Prayer Timings</Text>
          {FIVE_DAILY_PRAYERS.map((prayer, index) => {
            const currentSet = byPrayer[prayer];
            const isOn = currentSet.volumeMode !== 'SILENT';
            
            return (
              <Pressable
                key={prayer}
                onPress={() => navigation.navigate('SoundSelection', { prayer })}
                style={({ pressed }) => [
                  styles.prayerRow,
                  { backgroundColor: c.surfaceContainerLow },
                  pressed && { backgroundColor: c.surfaceContainer }
                ]}
              >
                <View style={styles.prayerRowLeft}>
                  <View style={styles.timeBox}>
                    <Text style={[styles.prayerName, { color: c.primary }]}>{prayer}</Text>
                  </View>
                  <View style={[styles.divider, { backgroundColor: c.primary }]} />
                  <View>
                    <View style={styles.soundIndicator}>
                      <Music size={14} color={c.primary} style={{ opacity: 0.6 }} />
                      <Text style={[styles.soundLabel, { color: c.primary }]}>
                        {getSoundLabel(currentSet.soundId)}
                      </Text>
                    </View>
                  </View>
                </View>
                <Switch
                  value={isOn}
                  onValueChange={(val) => setPrayerVolumeMode(prayer, val ? 'LOUD' : 'SILENT')}
                  trackColor={{ false: c.surfaceContainerHighest, true: c.primary }}
                  thumbColor={c.onPrimary}
                />
              </Pressable>
            );
          })}
        </Animated.View>

        {/* Advanced Preferences */}
        <Animated.View entering={FadeInDown.duration(400).delay(250)} style={styles.section}>
          <Text style={[styles.sectionLabel, { color: c.primary }]}>Notification Preferences</Text>
          
          <View style={[styles.card, { backgroundColor: c.surfaceContainerLow, marginBottom: spacing.md }]}>
            <Text style={[styles.rowTitle, { color: c.primary, marginBottom: spacing.md }]}>
              Global Volume Mode
            </Text>
            <View style={[styles.segmentControl, { backgroundColor: c.surfaceContainer }]}>
              <Pressable 
                onPress={() => setGlobalMode('LOUD')}
                style={({ pressed }) => [styles.segmentBtn, pressed && { opacity: 0.8 }, computedGlobalMode === 'LOUD' && { backgroundColor: c.primaryContainer }]}>
                <Volume2 size={20} color={computedGlobalMode === 'LOUD' ? c.onPrimary : c.primary} opacity={computedGlobalMode === 'LOUD' ? 1 : 0.7} />
                <Text style={[styles.segmentText, { color: computedGlobalMode === 'LOUD' ? c.onPrimary : c.primary, opacity: computedGlobalMode === 'LOUD' ? 1 : 0.7 }]}>LOUD</Text>
              </Pressable>
              <Pressable 
                onPress={() => setGlobalMode('SOFT')}
                style={({ pressed }) => [styles.segmentBtn, pressed && { opacity: 0.8 }, computedGlobalMode === 'SOFT' && { backgroundColor: c.primaryContainer }]}>
                <Volume1 size={20} color={computedGlobalMode === 'SOFT' ? c.onPrimary : c.primary} opacity={computedGlobalMode === 'SOFT' ? 1 : 0.7} />
                <Text style={[styles.segmentText, { color: computedGlobalMode === 'SOFT' ? c.onPrimary : c.primary, opacity: computedGlobalMode === 'SOFT' ? 1 : 0.7 }]}>SOFT</Text>
              </Pressable>
              <Pressable 
                onPress={() => setGlobalMode('SILENT')}
                style={({ pressed }) => [styles.segmentBtn, pressed && { opacity: 0.8 }, computedGlobalMode === 'SILENT' && { backgroundColor: c.primaryContainer }]}>
                <VolumeX size={20} color={computedGlobalMode === 'SILENT' ? c.onPrimary : c.primary} opacity={computedGlobalMode === 'SILENT' ? 1 : 0.7} />
                <Text style={[styles.segmentText, { color: computedGlobalMode === 'SILENT' ? c.onPrimary : c.primary, opacity: computedGlobalMode === 'SILENT' ? 1 : 0.7 }]}>SILENT</Text>
              </Pressable>
            </View>
          </View>

          <View style={[styles.preferenceRow, { backgroundColor: c.surfaceContainerLow }]}>
            <View style={styles.rowLeft}>
              <Timer size={24} color={c.primary} opacity={0.6} />
              <View>
                <Text style={[styles.rowTitle, { color: c.primary }]}>Pre-reminder</Text>
                <Text style={[styles.rowSub, { color: c.onSurfaceVariant }]}>
                  10 min before salah, then again at prayer time
                </Text>
              </View>
            </View>
            <Switch
              value={preReminderEnabled}
              onValueChange={setPreReminderEnabled}
              trackColor={{ false: c.surfaceContainerHighest, true: c.primary }}
              thumbColor={c.onPrimary}
            />
          </View>

          <View style={[styles.preferenceRow, { backgroundColor: c.surfaceContainerLow }]}>
            <View style={styles.rowLeft}>
              <Vibrate size={24} color={c.primary} opacity={0.6} />
              <View>
                <Text style={[styles.rowTitle, { color: c.primary }]}>Vibration</Text>
                <Text style={[styles.rowSub, { color: c.onSurfaceVariant }]}>Haptic feedback on alerts</Text>
              </View>
            </View>
            <Switch
              value={vibrationEnabled}
              onValueChange={setVibrationEnabled}
              trackColor={{ false: c.surfaceContainerHighest, true: c.primary }}
              thumbColor={c.onPrimary}
            />
          </View>

          <View style={[styles.testSection, { backgroundColor: c.surfaceContainerLow }]}>
            <View style={styles.rowLeft}>
              <Bell size={24} color={c.primary} opacity={0.6} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: c.primary }]}>Try alerts</Text>
                <Text style={[styles.rowSub, { color: c.onSurfaceVariant }]}>
                  Uses Fajr sound & volume. Scheduled test fires once in ~15s — put the app in background.
                </Text>
              </View>
            </View>
            {testBusy ? (
              <ActivityIndicator style={{ marginTop: spacing.md }} color={c.primary} />
            ) : (
              <View style={styles.testBtnColumn}>
                <Pressable
                  onPress={() =>
                    runNotificationTest(() => sendTestAdhanNotification('Fajr', 'lead'))
                  }
                  style={({ pressed }) => [
                    styles.testBtn,
                    { backgroundColor: c.primaryContainer },
                    pressed && { opacity: 0.85 },
                  ]}>
                  <Text style={[styles.testBtnText, { color: c.onPrimaryContainer }]}>Now: before prayer</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    runNotificationTest(() => sendTestAdhanNotification('Fajr', 'atSalah'))
                  }
                  style={({ pressed }) => [
                    styles.testBtn,
                    { backgroundColor: c.primaryContainer },
                    pressed && { opacity: 0.85 },
                  ]}>
                  <Text style={[styles.testBtnText, { color: c.onPrimaryContainer }]}>Now: prayer time</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    runNotificationTest(() => scheduleTestAdhanInSeconds(15, 'Fajr', 'atSalah'))
                  }
                  style={({ pressed }) => [
                    styles.testBtn,
                    { backgroundColor: c.surfaceContainerHighest, borderWidth: 1, borderColor: c.outlineVariant },
                    pressed && { opacity: 0.85 },
                  ]}>
                  <Text style={[styles.testBtnText, { color: c.primary }]}>Schedule test (15s)</Text>
                </Pressable>
                <Pressable
                  onPress={async () => {
                    if (!getBuiltinAdhanBundleFile(byPrayer.Fajr.soundId)) {
                      Alert.alert(
                        'Built-in sounds only',
                        'Preview here works for bundled adhans. For custom uploads, open Sound selection and use the play button there.',
                      );
                      return;
                    }
                    setTestBusy(true);
                    try {
                      await playBundledAdhanPreview(byPrayer.Fajr.soundId);
                    } finally {
                      setTestBusy(false);
                    }
                  }}
                  style={({ pressed }) => [
                    styles.testBtn,
                    { backgroundColor: c.surfaceContainerHighest, borderWidth: 1, borderColor: c.outlineVariant },
                    pressed && { opacity: 0.85 },
                  ]}>
                  <Text style={[styles.testBtnText, { color: c.primary }]}>Play Fajr sound in app</Text>
                </Pressable>
              </View>
            )}
          </View>

        </Animated.View>
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
  },
  headerBox: {
    marginBottom: spacing.xl,
    marginTop: spacing.md,
  },
  heading: {
    fontFamily: fontFamilies.headline,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  subheading: {
    fontFamily: fontFamilies.body,
    fontSize: 15,
    fontWeight: '500',
  },
  card: {
    borderRadius: radius.md,
    padding: spacing.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  textCol: {
    flex: 1,
  },
  rowTitle: {
    fontFamily: fontFamilies.headline,
    fontSize: 18,
    fontWeight: '700',
  },
  rowSub: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    marginTop: 2,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionLabel: {
    fontFamily: fontFamilies.headline,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: spacing.md,
    opacity: 0.6,
  },
  prayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  prayerRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  timeBox: {
    minWidth: 80,
  },
  prayerName: {
    fontFamily: fontFamilies.headline,
    fontSize: 18,
    fontWeight: '800',
  },
  divider: {
    width: 1,
    height: 40,
    opacity: 0.1,
  },
  soundIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    opacity: 0.8,
  },
  soundLabel: {
    fontFamily: fontFamilies.body,
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.8,
  },
  segmentControl: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radius.sm,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.sm - 2,
    gap: 4,
  },
  segmentText: {
    fontFamily: fontFamilies.headline,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  testSection: {
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  testBtnColumn: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  testBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  testBtnText: {
    fontFamily: fontFamilies.headline,
    fontSize: 14,
    fontWeight: '700',
  },
});
