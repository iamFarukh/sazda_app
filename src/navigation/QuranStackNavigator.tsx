import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QuranHomeScreen } from '../screens/quran/QuranHomeScreen';
import { SurahListScreen } from '../screens/quran/SurahListScreen';
import { SurahReaderScreen } from '../screens/quran/SurahReaderScreen';
import { TafsirScreen } from '../screens/quran/TafsirScreen';
import { useThemedStackScreenOptions } from './useThemedStackScreenOptions';
import type { QuranStackParamList } from './types';

const Stack = createNativeStackNavigator<QuranStackParamList>();

export function QuranStackNavigator() {
  const screenOptions = useThemedStackScreenOptions();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="QuranHome" component={QuranHomeScreen} />
      <Stack.Screen name="SurahList" component={SurahListScreen} />
      <Stack.Screen name="SurahReader" component={SurahReaderScreen} />
      <Stack.Screen name="Tafsir" component={TafsirScreen} />
    </Stack.Navigator>
  );
}
