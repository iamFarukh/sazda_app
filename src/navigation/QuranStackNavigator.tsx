import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QuranHomeScreen } from '../screens/quran/QuranHomeScreen';
import { SurahListScreen } from '../screens/quran/SurahListScreen';
import { MushafReaderScreen } from '../screens/quran/MushafReaderScreen';
import { SurahReaderScreen } from '../screens/quran/SurahReaderScreen';
import { TafsirScreen } from '../screens/quran/TafsirScreen';
import { QuranAudioPlayerScreen } from '../screens/quran/QuranAudioPlayerScreen';
import { useThemedStackScreenOptions } from './useThemedStackScreenOptions';
import type { QuranStackParamList } from './types';

const Stack = createNativeStackNavigator<QuranStackParamList>();

export function QuranStackNavigator() {
  const screenOptions = useThemedStackScreenOptions();
  return (
    <Stack.Navigator screenOptions={{ ...screenOptions, freezeOnBlur: false }}>
      <Stack.Screen name="QuranHome" component={QuranHomeScreen} />
      <Stack.Screen name="SurahList" component={SurahListScreen} />
      <Stack.Screen name="SurahReader" component={SurahReaderScreen} />
      <Stack.Screen
        name="QuranAudioPlayer"
        component={QuranAudioPlayerScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_bottom',
          // Sheet-like: swipe down to dismiss instead of a horizontal pop.
          gestureDirection: 'vertical',
          fullScreenGestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="MushafReader"
        component={MushafReaderScreen}
        options={{
          headerShown: false,
          headerBackVisible: false,
          animation: 'slide_from_right',
          // Page-flip reader owns horizontal pans; keep pop on the edge only.
          fullScreenGestureEnabled: false,
        }}
      />
      <Stack.Screen name="Tafsir" component={TafsirScreen} />
    </Stack.Navigator>
  );
}
