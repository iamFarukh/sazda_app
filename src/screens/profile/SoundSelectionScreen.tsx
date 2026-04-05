import { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, Play, Square, Check, Upload, Info } from 'lucide-react-native';
import Sound from 'react-native-sound';
import { useThemePalette } from '../../theme/useThemePalette';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { fontFamilies } from '../../theme/typography';
import { useAdhanSettingsStore } from '../../store/adhanSettingsStore';
import type { FiveDailyPrayer } from '../../store/prayerTrackerStore';
import type { ProfileStackParamList } from '../../navigation/types';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  getBuiltinAdhanBundleFile,
  getBuiltinAdhanDisplayName,
} from '../../constants/adhanBuiltInSounds';

// Ensure sounds play even when silent mode is on via OS, based on user preference
Sound.setCategory('Playback', true);

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'SoundSelection'>;
type Route = RouteProp<ProfileStackParamList, 'SoundSelection'>;


const STANDARD_SOUNDS = [
  { id: 'makkah', name: 'Makkah', sub: 'Makkah-style adhan' },
  { id: 'fajar', name: 'Fajr', sub: 'Fajr adhan' },
  { id: 'adan_tune', name: 'Classic', sub: 'Full adhan' },
  { id: 'soft', name: 'Soft', sub: 'Gentle tone' },
  { id: 'default', name: 'System', sub: 'Device default alert' },
];

export function SoundSelectionScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { colors: c } = useThemePalette();
  const prayer = route.params.prayer as FiveDailyPrayer;
  
  const byPrayer = useAdhanSettingsStore(s => s.byPrayer);
  const setPrayerSoundId = useAdhanSettingsStore(s => s.setPrayerSoundId);
  const customSounds = useAdhanSettingsStore(s => s.customSounds);
  
  const currentSettings = byPrayer[prayer];
  const activeSoundId = currentSettings.soundId;

  const [playingId, setPlayingId] = useState<string | null>(null);
  const [soundRef, setSoundRef] = useState<Sound | null>(null);

  // Auto clean up sound when navigating away
  useEffect(() => {
    return () => {
      if (soundRef) {
        soundRef.stop();
        soundRef.release();
      }
    };
  }, [soundRef]);

  const selectSound = (id: string) => {
    setPrayerSoundId(prayer, id);
  };

  const playPreview = (id: string, uri?: string) => {
    if (playingId === id && soundRef) {
      soundRef.stop();
      setPlayingId(null);
      return;
    }

    if (soundRef) {
      soundRef.stop();
      soundRef.release();
    }

    if (uri) {
      const newSound = new Sound(uri, '', (error) => {
        if (error) {
          console.warn('Failed to load custom sound', uri, error);
          setPlayingId(id);
          setTimeout(() => setPlayingId(null), 1500);
          return;
        }
        setPlayingId(id);
        newSound.play(() => {
          setPlayingId(null);
          newSound.release();
        });
      });
      setSoundRef(newSound);
    } else {
      const soundPath = getBuiltinAdhanBundleFile(id);
      if (!soundPath) {
        console.warn('Unknown built-in sound id', id);
        return;
      }

      const newSound = new Sound(soundPath, Sound.MAIN_BUNDLE, (error: any) => {
        if (error) {
           console.warn('Failed to load built-in sound', soundPath, error);
           setPlayingId(id);
           setTimeout(() => setPlayingId(null), 1500);
           return;
        }
        setPlayingId(id);
        newSound.play(() => {
           setPlayingId(null);
           newSound.release();
        });
      });
      setSoundRef(newSound);
    }
  };

  const renderActiveName = () => {
    const builtIn = getBuiltinAdhanDisplayName(activeSoundId);
    if (builtIn) return builtIn;
    const cs = customSounds.find(x => x.id === activeSoundId);
    if (cs) return cs.name;
    return 'Custom Audio';
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.surface }]} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}>
          <ChevronLeft size={28} color={c.primary} strokeWidth={2.25} />
        </Pressable>
        <Text style={[styles.title, { color: c.primary }]}>Select Adhan Sound</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        <Animated.View entering={FadeInDown.duration(400).delay(100)} style={[styles.heroBox, { backgroundColor: c.primaryContainer }]}>
          <View style={{ zIndex: 10, maxWidth: '60%' }}>
            <Text style={[styles.heroTitle, { color: c.secondaryContainer }]}>
              {renderActiveName()}
            </Text>
            <Text style={[styles.heroSub, { color: c.onPrimary }]}>
              Currently active for {prayer}
            </Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(150)} style={styles.list}>
          {STANDARD_SOUNDS.map((sound, index) => {
            const isActive = activeSoundId === sound.id;
            const isPlaying = playingId === sound.id;

            return (
              <Pressable
                key={sound.id}
                onPress={() => selectSound(sound.id)}
                style={({ pressed }) => [
                  styles.soundRow,
                  { backgroundColor: isActive ? c.surfaceContainerHighest : c.surfaceContainerLow },
                  pressed && { backgroundColor: c.surfaceContainer }
                ]}
              >
                <View style={styles.soundRowLeft}>
                  <Pressable
                    onPress={() => playPreview(sound.id)}
                    style={({ pressed }) => [
                      styles.playBtn,
                      { backgroundColor: isActive ? c.primaryContainer : c.surfaceContainerHighest },
                      pressed && { opacity: 0.8 }
                    ]}
                  >
                    {isPlaying ? (
                      <Square size={20} color={isActive ? c.secondaryContainer : c.primary} fill="currentColor" />
                    ) : (
                      <Play size={20} color={isActive ? c.secondaryContainer : c.primary} fill="currentColor" />
                    )}
                  </Pressable>
                  <View>
                    <Text style={[styles.soundName, { color: c.primary }]}>{sound.name}</Text>
                    <Text style={[styles.soundSub, { color: c.primary }]}>{sound.sub}</Text>
                  </View>
                </View>
                {isActive && (
                  <View style={[styles.checkCircle, { backgroundColor: c.primary }]}>
                    <Check size={16} color={c.surface} strokeWidth={3} />
                  </View>
                )}
              </Pressable>
            );
          })}

          {customSounds.map(cs => {
             const isActive = activeSoundId === cs.id;
             const isPlaying = playingId === cs.id;
             return (
              <Pressable
                key={cs.id}
                onPress={() => selectSound(cs.id)}
                style={({ pressed }) => [
                  styles.soundRow,
                  { backgroundColor: isActive ? c.surfaceContainerHighest : c.surfaceContainerLow },
                  pressed && { backgroundColor: c.surfaceContainer }
                ]}
              >
                <View style={styles.soundRowLeft}>
                  <Pressable
                    onPress={() => playPreview(cs.id, cs.uri)}
                    style={({ pressed }) => [
                      styles.playBtn,
                      { backgroundColor: isActive ? c.primaryContainer : c.surfaceContainerHighest },
                      pressed && { opacity: 0.8 }
                    ]}
                  >
                    {isPlaying ? (
                      <Square size={20} color={isActive ? c.secondaryContainer : c.primary} fill="currentColor" />
                    ) : (
                      <Play size={20} color={isActive ? c.secondaryContainer : c.primary} fill="currentColor" />
                    )}
                  </Pressable>
                  <View>
                    <Text style={[styles.soundName, { color: c.primary }]}>{cs.name}</Text>
                    <Text style={[styles.soundSub, { color: c.primary }]}>Custom Audio</Text>
                  </View>
                </View>
                {isActive && (
                  <View style={[styles.checkCircle, { backgroundColor: c.primary }]}>
                    <Check size={16} color={c.surface} strokeWidth={3} />
                  </View>
                )}
              </Pressable>
             )
          })}

          <Pressable
            onPress={() => navigation.navigate('CustomSoundUpload')}
            style={({ pressed }) => [
              styles.soundRow,
              styles.dashedRow,
              { backgroundColor: c.surfaceContainerLow, borderColor: c.outlineVariant },
              pressed && { backgroundColor: c.surfaceContainer }
            ]}
          >
            <View style={[styles.soundRowLeft, { paddingRight: spacing.sm }]}>
              <View style={[styles.playBtn, { backgroundColor: c.secondaryContainer }]}>
                <Upload size={20} color={c.onSecondaryContainer} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.soundName, { color: c.primary }]} numberOfLines={1}>Custom</Text>
                <Text style={[styles.soundSub, { color: c.primary }]} numberOfLines={1}>User uploaded files</Text>
              </View>
            </View>
            <View style={[styles.manageBtn, { backgroundColor: c.surfaceContainerHighest }]}>
              <Text style={[styles.manageBtnText, { color: c.primary }]}>Manage Uploads</Text>
            </View>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(200)} style={[styles.tipCard, { backgroundColor: c.surfaceContainer }]}>
          <Info size={32} color={c.primary} style={{ opacity: 0.2, position: 'absolute', top: spacing.md, right: spacing.md }} />
          <Text style={[styles.tipTitle, { color: c.primary }]}>Sacred Etiquette</Text>
          <Text style={[styles.tipText, { color: c.onSurfaceVariant }]}>
            Choose sounds that inspire tranquility and mindfulness. The Adhan is a call to peace; its tone should reflect the sanctuary within your heart.
          </Text>
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
    fontSize: 18,
    fontWeight: '800',
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.x3xl,
  },
  heroBox: {
    padding: spacing.xl,
    borderRadius: radius.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    minHeight: 140,
    justifyContent: 'center',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  heroTitle: {
    fontFamily: fontFamilies.headline,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  heroSub: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.9,
  },
  list: {
    gap: spacing.md,
  },
  soundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderRadius: radius.md,
  },
  dashedRow: {
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  soundRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    flex: 1,
  },
  playBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  soundName: {
    fontFamily: fontFamilies.headline,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 2,
  },
  soundSub: {
    fontFamily: fontFamilies.body,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    opacity: 0.6,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  manageBtnText: {
    fontFamily: fontFamilies.body,
    fontSize: 12,
    fontWeight: '700',
  },
  tipCard: {
    marginTop: spacing.xxl,
    padding: spacing.xl,
    borderRadius: radius.md,
    position: 'relative',
  },
  tipTitle: {
    fontFamily: fontFamilies.headline,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  tipText: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
    maxWidth: '85%',
  }
});
