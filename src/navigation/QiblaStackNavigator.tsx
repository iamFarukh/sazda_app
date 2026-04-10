import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QiblaScreen } from '../screens/tools/QiblaScreen';
import { QiblaARScreen } from '../screens/tools/QiblaARScreen';
import { useThemedStackScreenOptions } from './useThemedStackScreenOptions';
import type { QiblaStackParamList } from './types';

const Stack = createNativeStackNavigator<QiblaStackParamList>();

export function QiblaStackNavigator() {
  const screenOptions = useThemedStackScreenOptions();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="QiblaMain" component={QiblaScreen} />
      <Stack.Screen name="QiblaAR" component={QiblaARScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
