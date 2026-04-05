import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { ProfileSettingsScreen } from '../screens/profile/ProfileSettingsScreen';
import { AdhanSettingsScreen } from '../screens/profile/AdhanSettingsScreen';
import { SoundSelectionScreen } from '../screens/profile/SoundSelectionScreen';
import { CustomSoundUploadScreen } from '../screens/profile/CustomSoundUploadScreen';
import { OfflineQuranManagerScreen } from '../screens/profile/OfflineQuranManagerScreen';
import { useThemedStackScreenOptions } from './useThemedStackScreenOptions';
import type { ProfileStackParamList } from './types';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStackNavigator() {
  const screenOptions = useThemedStackScreenOptions();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="ProfileSettings" component={ProfileSettingsScreen} />
      <Stack.Screen name="AdhanSettings" component={AdhanSettingsScreen} />
      <Stack.Screen name="SoundSelection" component={SoundSelectionScreen} />
      <Stack.Screen name="CustomSoundUpload" component={CustomSoundUploadScreen} />
      <Stack.Screen name="OfflineQuran" component={OfflineQuranManagerScreen} />
    </Stack.Navigator>
  );
}
