import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { QiblaStackNavigator } from './QiblaStackNavigator';
import { HomeStackNavigator } from './HomeStackNavigator';
import { ProfileStackNavigator } from './ProfileStackNavigator';
import { QuranStackNavigator } from './QuranStackNavigator';
import { ToolsStackNavigator } from './ToolsStackNavigator';
import type { MainTabParamList } from './types';
import { SazdaBottomTabBar } from '../components/organisms/BottomTabBar/SazdaBottomTabBar';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';
import { useThemePalette } from '../theme/useThemePalette';

const Tab = createBottomTabNavigator<MainTabParamList>();

const renderTabBar = (props: BottomTabBarProps) => <SazdaBottomTabBar {...props} />;

export function AppTabs() {
  const { colors: c } = useThemePalette();

  return (
    <Tab.Navigator
      tabBar={renderTabBar}
      // Detaching inactive native screens on Android often causes visible hitch when
      // switching tabs; keep scenes attached for smoother tab changes (more memory).
      detachInactiveScreens={Platform.OS !== 'android'}
      screenOptions={{
        headerShown: false,
        // Suspend JS on unfocused tabs to cut background work.
        freezeOnBlur: true,
        // Explicit instant scene transition (library default is already 'none').
        animation: 'none',
        // Avoid default white strip behind the custom dock (iOS especially).
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        sceneStyle: { backgroundColor: c.surface },
      }}>
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{ title: 'Home' }}
      />
      <Tab.Screen
        name="QuranTab"
        component={QuranStackNavigator}
        options={{ title: 'Quran' }}
      />
      <Tab.Screen
        name="ToolsTab"
        component={ToolsStackNavigator}
        options={{ title: 'Tools' }}
      />
      <Tab.Screen
        name="QiblaTab"
        component={QiblaStackNavigator}
        options={{ title: 'Qibla' }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}
