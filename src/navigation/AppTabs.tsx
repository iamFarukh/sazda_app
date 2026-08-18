import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { QiblaStackNavigator } from './QiblaStackNavigator';
import { HomeStackNavigator } from './HomeStackNavigator';
import { ProfileStackNavigator } from './ProfileStackNavigator';
import { QuranStackNavigator } from './QuranStackNavigator';
import { ToolsStackNavigator } from './ToolsStackNavigator';
import type { MainTabParamList } from './types';
import { SazdaBottomTabBar } from '../components/organisms/BottomTabBar/SazdaBottomTabBar';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useThemePalette } from '../theme/useThemePalette';

const Tab = createBottomTabNavigator<MainTabParamList>();

const renderTabBar = (props: BottomTabBarProps) => <SazdaBottomTabBar {...props} />;

export function AppTabs() {
  const { colors: c } = useThemePalette();

  return (
    <Tab.Navigator
      tabBar={renderTabBar}
      // Keep tab scenes attached on both platforms — detaching + freezeOnBlur caused
      // intermittent blank Quran (and other) tabs after switching back on iOS.
      detachInactiveScreens={false}
      screenOptions={{
        headerShown: false,
        freezeOnBlur: false,
        // Instant tab switches — fade left some scenes transparent on iOS.
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
        options={{ title: 'Quran', lazy: false }}
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
