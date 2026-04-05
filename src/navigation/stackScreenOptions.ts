import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import type { AppPalette } from '../theme/useThemePalette';

/** Build stack options for current palette (light/dark). */
export function getDefaultStackScreenOptions(palette: AppPalette): NativeStackNavigationOptions {
  return {
    headerShown: false,
    contentStyle: { backgroundColor: palette.surface },
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
