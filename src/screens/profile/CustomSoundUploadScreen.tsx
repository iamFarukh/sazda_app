import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import { ChevronLeft, CloudUpload, Info, Music, Trash2, LibraryBig } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useThemePalette } from '../../theme/useThemePalette';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { elevation } from '../../theme/elevation';
import { motionDurations, motionEasing } from '../../theme/motion';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { SazdaText } from '../../components/atoms/SazdaText/SazdaText';
import { PressableScale } from '../../components/atoms/PressableScale/PressableScale';
import { Skeleton } from '../../components/atoms/Skeleton/Skeleton';
import { EmptyState } from '../../components/molecules/EmptyState/EmptyState';
import { hapticLight, hapticMedium, hapticSuccess } from '../../utils/appHaptics';
import { useAdhanSettingsStore } from '../../store/adhanSettingsStore';
import { AppAlert } from '../../components/organisms/AppAlert/AppAlert';

export function CustomSoundUploadScreen() {
  const navigation = useNavigation();
  const { colors: c, scheme } = useThemePalette();
  const reduceMotion = useReduceMotion();

  const customSounds = useAdhanSettingsStore(s => s.customSounds);
  const addCustomSound = useAdhanSettingsStore(s => s.addCustomSound);
  const removeCustomSound = useAdhanSettingsStore(s => s.removeCustomSound);
  const byPrayer = useAdhanSettingsStore(s => s.byPrayer);

  const [isUploading, setIsUploading] = useState(false);

  const dyn = useMemo(
    () => ({
      uploadCard: {
        backgroundColor: c.surfaceContainerLowest,
        borderColor: c.outlineVariant,
        ...elevation('sm', scheme),
      },
      cloudIcon: {
        backgroundColor: c.primaryContainer,
        ...elevation('md', scheme),
      },
      noteBox: { backgroundColor: c.surfaceContainer },
      soundItem: {
        backgroundColor: c.surfaceContainerLow,
        ...elevation('sm', scheme),
      },
      musicIcon: { backgroundColor: c.secondaryContainer },
      deleteBtn: { backgroundColor: c.error + '14' },
    }),
    [c, scheme],
  );

  const enter = (delay: number) =>
    reduceMotion
      ? undefined
      : FadeInDown.duration(motionDurations.slow).delay(delay).easing(motionEasing.standardOut);

  const handlePickFile = async () => {
    try {
      setIsUploading(true);
      const res = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.audio],
      });

      if (!res.uri || !res.name) return;

      if (res.size && res.size > 5 * 1024 * 1024) {
        AppAlert.show('File too large', 'Please select an audio file smaller than 5MB.', undefined, { variant: 'info' });
        return;
      }

      // We generate a unique id for the new sound
      const uniqueId = 'custom_' + Date.now().toString(36);

      // Construct local destination path
      const destPath = `${RNFS.DocumentDirectoryPath}/${uniqueId}_${res.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;

      // Copy the file from temporary to app's Document directory
      await RNFS.copyFile(res.uri, destPath);

      addCustomSound({
        id: uniqueId,
        name: res.name,
        uri: 'file://' + destPath,
      });
      hapticSuccess();

    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        console.error('DocumentPicker error:', err);
        AppAlert.show('Upload Failed', 'There was an error accessing the audio file.', undefined, { variant: 'destructive' });
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string, uri: string) => {
    // Check if the sound is currenly in use by any prayer
    const inUseBy = Object.entries(byPrayer).filter(([, settings]) => settings.soundId === id);
    if (inUseBy.length > 0) {
      AppAlert.show(
        'Sound in Use',
        `This sound is currently active for ${inUseBy.map(x => x[0]).join(', ')}. Removing it will reset them to default. Continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => performDelete(id, uri)
          }
        ],
        { variant: 'confirmation' }
      );
    } else {
      performDelete(id, uri);
    }
  };

  const performDelete = async (id: string, uri: string) => {
    try {
      // Remove the file from disk using RNFS
      const localPath = uri.replace('file://', '');
      const fileExists = await RNFS.exists(localPath);
      if (fileExists) {
        await RNFS.unlink(localPath);
      }
    } catch (e) {
      console.warn('Failed to delete physical file during custom sound removal:', e);
    }
    removeCustomSound(id);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.surface }]} edges={['top']}>
      <View style={styles.topBar}>
        <PressableScale
          onPress={() => {
            hapticLight();
            navigation.goBack();
          }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
          style={styles.iconBtn}>
          <ChevronLeft size={28} color={c.primary} strokeWidth={2.25} />
        </PressableScale>
        <SazdaText variant="headlineMedium" color="primary">
          Custom Sounds
        </SazdaText>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header Section */}
        <Animated.View entering={enter(60)} style={styles.headerBox}>
          <SazdaText variant="headlineLarge" color="primary" style={styles.heading}>
            Upload Custom Sound
          </SazdaText>
          <SazdaText variant="bodyMedium" color="onSurfaceVariant">
            Personalize your spiritual atmosphere with unique audio.
          </SazdaText>
        </Animated.View>

        {/* Upload Area */}
        <Animated.View entering={enter(140)}>
          <PressableScale
            onPress={() => {
              hapticMedium();
              handlePickFile();
            }}
            disabled={isUploading}
            accessibilityRole="button"
            accessibilityLabel={isUploading ? 'Importing audio file' : 'Select an audio file to upload'}
            accessibilityState={{ disabled: isUploading, busy: isUploading }}
            to={0.98}
            pressedOpacity={0.9}
            style={[styles.uploadBox, dyn.uploadCard, isUploading && styles.uploadBoxBusy]}>
            <View style={[styles.cloudIcon, dyn.cloudIcon]}>
              <CloudUpload size={36} color={c.onPrimaryContainer} />
            </View>
            <SazdaText variant="headlineMedium" color="primary" align="center" style={styles.uploadTitle}>
              {isUploading ? 'Importing Audio…' : 'Select Audio File'}
            </SazdaText>
            <SazdaText variant="bodySmall" color="onSurfaceVariant" align="center" style={styles.uploadSub}>
              Tap to browse your device for audio files
            </SazdaText>
          </PressableScale>

          <View style={[styles.noteBox, dyn.noteBox]}>
            <Info size={18} color={c.primary} style={styles.noteIcon} />
            <SazdaText variant="caption" color="onSurfaceVariant" style={styles.noteText}>
              Keep it short and clear. Recommended formats: MP3, WAV, or M4A (max 5MB).
            </SazdaText>
          </View>
        </Animated.View>

        {/* Library Section */}
        <Animated.View entering={enter(220)} style={styles.librarySection}>
          <View style={styles.libraryHeader}>
            <SazdaText variant="titleLarge" color="primary">
              Your Library
            </SazdaText>
            <SazdaText variant="label" color="onSurfaceVariant">
              {customSounds.length} {customSounds.length === 1 ? 'file' : 'files'}
            </SazdaText>
          </View>

          <View style={styles.list}>
            {isUploading && (
              <View style={[styles.soundItem, dyn.soundItem]}>
                <View style={styles.soundItemLeft}>
                  <Skeleton circle width={48} height={48} />
                  <View style={styles.skeletonLines}>
                    <Skeleton width="70%" height={14} />
                    <Skeleton width="40%" height={10} />
                  </View>
                </View>
              </View>
            )}

            {customSounds.map((sound, index) => (
              <Animated.View key={sound.id} entering={enter(260 + Math.min(index, 6) * 50)}>
                <View
                  style={[styles.soundItem, dyn.soundItem]}
                  accessible
                  accessibilityLabel={`${sound.name}, custom audio`}>
                  <View style={styles.soundItemLeft}>
                    <View style={[styles.musicIcon, dyn.musicIcon]}>
                      <Music size={20} color={c.onSecondaryContainer} />
                    </View>
                    <View style={styles.soundItemText}>
                      <SazdaText variant="titleLarge" color="primary" numberOfLines={1}>
                        {sound.name}
                      </SazdaText>
                      <SazdaText variant="label" color="onSurfaceVariant" style={styles.soundSub}>
                        Custom Audio
                      </SazdaText>
                    </View>
                  </View>
                  <PressableScale
                    onPress={() => {
                      hapticMedium();
                      handleDelete(sound.id, sound.uri);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${sound.name}`}
                    hitSlop={8}
                    to={0.92}
                    style={[styles.deleteBtn, dyn.deleteBtn]}>
                    <Trash2 size={20} color={c.error} />
                  </PressableScale>
                </View>
              </Animated.View>
            ))}

            {customSounds.length === 0 && !isUploading && (
              <EmptyState
                compact
                icon={<LibraryBig size={36} color={c.onSurfaceVariant} />}
                title="No custom sounds yet"
                message="Upload your own voice or a favorite recitation for a truly personal alert."
                actionLabel="Upload a sound"
                onAction={() => {
                  hapticMedium();
                  handlePickFile();
                }}
              />
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
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.x3xl,
  },
  headerBox: {
    marginBottom: spacing.xl,
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  heading: {
    marginBottom: 0,
  },
  uploadBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  uploadBoxBusy: {
    opacity: 0.7,
  },
  cloudIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  uploadTitle: {
    marginBottom: spacing.xxs,
  },
  uploadSub: {
    maxWidth: 240,
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.sm,
    marginBottom: spacing.xxl,
  },
  noteIcon: {
    marginTop: 1,
  },
  noteText: {
    flex: 1,
  },
  librarySection: {
    marginTop: spacing.sm,
  },
  libraryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  list: {
    gap: spacing.sm,
  },
  soundItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radius.md,
  },
  soundItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  soundItemText: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  skeletonLines: {
    flex: 1,
    gap: spacing.xs,
  },
  musicIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundSub: {
    marginTop: 2,
  },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
