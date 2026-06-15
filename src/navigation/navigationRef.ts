import { createNavigationContainerRef } from '@react-navigation/native';
import type { MainDrawerParamList } from './types';

export const navigationRef = createNavigationContainerRef<MainDrawerParamList>();

export function openQuranAudioPlayer() {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate('MainTabs', {
    screen: 'QuranTab',
    params: { screen: 'QuranAudioPlayer' as never },
  } as never);
}

