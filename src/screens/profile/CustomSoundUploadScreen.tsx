import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import { ChevronLeft, CloudUpload, Info, Music, Trash2, LibraryBig } from 'lucide-react-native';
import { useThemePalette } from '../../theme/useThemePalette';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { fontFamilies } from '../../theme/typography';
import { useAdhanSettingsStore } from '../../store/adhanSettingsStore';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

export function CustomSoundUploadScreen() {
  const navigation = useNavigation();
  const { colors: c } = useThemePalette();
  
  const customSounds = useAdhanSettingsStore(s => s.customSounds);
  const addCustomSound = useAdhanSettingsStore(s => s.addCustomSound);
  const removeCustomSound = useAdhanSettingsStore(s => s.removeCustomSound);
  const byPrayer = useAdhanSettingsStore(s => s.byPrayer);

  const [isUploading, setIsUploading] = useState(false);

  const handlePickFile = async () => {
    try {
      setIsUploading(true);
      const res = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.audio],
      });

      if (!res.uri || !res.name) return;
      
      // Basic size limit check ~ 5MB
      if (res.size && res.size > 5 * 1024 * 1024) {
        Alert.alert('File too large', 'Please select an audio file smaller than 5MB.');
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

    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        console.error('DocumentPicker error:', err);
        Alert.alert('Upload Failed', 'There was an error accessing the audio file.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string, uri: string) => {
    // Check if the sound is currenly in use by any prayer
    const inUseBy = Object.entries(byPrayer).filter(([prayer, settings]) => settings.soundId === id);
    if (inUseBy.length > 0) {
      Alert.alert(
        'Sound in Use',
        `This sound is currently active for ${inUseBy.map(x => x[0]).join(', ')}. Removing it will reset them to default. Continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Remove', 
            style: 'destructive',
            onPress: () => performDelete(id, uri)
          }
        ]
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
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}>
          <ChevronLeft size={28} color={c.primary} strokeWidth={2.25} />
        </Pressable>
        <Text style={[styles.title, { color: c.primary }]}></Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        {/* Header Section */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.headerBox}>
          <Text style={[styles.heading, { color: c.primary }]}>Upload Custom Sound</Text>
          <Text style={[styles.subheading, { color: c.onSurfaceVariant }]}>
            Personalize your spiritual atmosphere with unique audio.
          </Text>
        </Animated.View>

        {/* Upload Area */}
        <Animated.View entering={FadeInDown.duration(400).delay(150)}>
          <Pressable 
            onPress={handlePickFile}
            disabled={isUploading}
            style={({ pressed }) => [
              styles.uploadBox,
              { 
                backgroundColor: c.surfaceContainerLowest, 
                borderColor: pressed ? c.primaryContainer : c.outlineVariant,
                opacity: isUploading ? 0.7 : 1
              }
            ]}
          >
            <View style={[styles.cloudIcon, { backgroundColor: c.primaryContainer }]}>
              <CloudUpload size={40} color={c.onPrimary} />
            </View>
            <Text style={[styles.uploadTitle, { color: c.primary }]}>
              {isUploading ? 'Importing Audio...' : 'Select Audio File'}
            </Text>
            <Text style={[styles.uploadSub, { color: c.onSurfaceVariant }]}>
              Click to browse your device for audio files
            </Text>
          </Pressable>

          <View style={[styles.noteBox, { backgroundColor: c.surfaceContainerHighest }]}>
            <Info size={20} color={c.primary} style={{ marginTop: 2 }} />
            <Text style={[styles.noteText, { color: c.onSurfaceVariant }]}>
              <Text style={{ fontWeight: '700', color: c.primary }}>Note: </Text>
              Sound should be short and clear. Recommended formats: MP3, WAV, or M4A (Max 5MB).
            </Text>
          </View>
        </Animated.View>

        {/* Library Section */}
        <Animated.View entering={FadeInUp.duration(400).delay(200)} style={styles.librarySection}>
          <View style={styles.libraryHeader}>
            <Text style={[styles.libraryTitle, { color: c.primary }]}>Your Library</Text>
            <Text style={[styles.libraryCount, { color: c.primary }]}>{customSounds.length} {customSounds.length === 1 ? 'FILE' : 'FILES'} UPLOADED</Text>
          </View>

          <View style={styles.list}>
            {customSounds.map((sound) => (
              <View key={sound.id} style={[styles.soundItem, { backgroundColor: c.surfaceContainerLowest }]}>
                <View style={styles.soundItemLeft}>
                  <View style={[styles.musicIcon, { backgroundColor: c.secondaryContainer }]}>
                    <Music size={20} color={c.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.soundName, { color: c.primary }]} numberOfLines={1}>
                      {sound.name}
                    </Text>
                    <Text style={[styles.soundSub, { color: c.onSurfaceVariant }]}>Custom Audio</Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => handleDelete(sound.id, sound.uri)}
                  style={({ pressed }) => [styles.deleteBtn, { backgroundColor: pressed ? 'rgba(186, 26, 26, 0.15)' : 'rgba(186, 26, 26, 0.05)' }]}
                >
                  <Trash2 size={20} color={c.error} />
                </Pressable>
              </View>
            ))}

            {customSounds.length === 0 && (
              <View style={[styles.emptyState, { backgroundColor: c.primary + '0D', borderColor: c.primary + '1A' }]}>
                <LibraryBig size={32} color={c.primary} style={{ opacity: 0.6, marginBottom: spacing.sm }} />
                <Text style={[styles.emptyText, { color: c.primary }]}>
                  Upload your own voice or custom audio for a truly personal sanctuary experience
                </Text>
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
    fontSize: 18,
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
  uploadBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  cloudIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  uploadTitle: {
    fontFamily: fontFamilies.headline,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  uploadSub: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    textAlign: 'center',
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
  noteText: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  librarySection: {
    marginTop: spacing.sm,
  },
  libraryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  libraryTitle: {
    fontFamily: fontFamilies.headline,
    fontSize: 20,
    fontWeight: '800',
  },
  libraryCount: {
    fontFamily: fontFamilies.body,
    fontSize: 11,
    fontWeight: '700',
    opacity: 0.5,
  },
  list: {
    gap: spacing.md,
  },
  soundItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderRadius: radius.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  soundItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  musicIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundName: {
    fontFamily: fontFamilies.headline,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  soundSub: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    fontWeight: '500',
  },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    opacity: 0.8,
  }
});
