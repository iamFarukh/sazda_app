import { createNavigationContainerRef } from '@react-navigation/native';
import type { MainTabParamList } from './types';

export const navigationRef = createNavigationContainerRef<MainTabParamList>();

export function openQuranAudioPlayer() {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate('QuranTab', { screen: 'QuranAudioPlayer' });
}
