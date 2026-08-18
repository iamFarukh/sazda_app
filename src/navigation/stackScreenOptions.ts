import { Platform } from 'react-native';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import type { AppPalette } from '../theme/useThemePalette';

/** Build stack options for current palette (light/dark). */
export function getDefaultStackScreenOptions(palette: AppPalette): NativeStackNavigationOptions {
  return {
    headerShown: false,
    contentStyle: { backgroundColor: palette.surface },
    // Consistent premium push everywhere: native slide on both platforms
    // (Android's platform default is an abrupt fade on many OEM skins).
    animation: Platform.OS === 'android' ? 'slide_from_right' : 'default',
    // Back must always be reachable by gesture, headers are custom on most
    // screens so the whole surface — not just the edge — can swipe back on iOS.
    gestureEnabled: true,
    fullScreenGestureEnabled: true,
  };
}

/**
 * Native header for Tools screens that are pushed above `ToolsMain`.
 * Enables OS back button + iOS interactive pop gesture (stack must have history).
 */
export function getToolsSubScreenHeaderOptions(palette: AppPalette): NativeStackNavigationOptions {
  return {
    headerShown: true,
    headerStyle: { backgroundColor: palette.surface },
    headerTintColor: palette.primary,
    headerTitleStyle: {
      color: palette.onSurface,
      fontWeight: '700',
      fontSize: 17,
    },
    headerShadowVisible: false,
    gestureEnabled: true,
    fullScreenGestureEnabled: true,
  };
}
