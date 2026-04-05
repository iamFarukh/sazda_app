import { useNavigation, type NavigationProp } from '@react-navigation/native';
import type { MainTabParamList, ToolsStackParamList } from './types';

/** From a stack screen inside a tab: jump to another main tab (stack root by default). */
export function useNavigateMainTab() {
  const navigation = useNavigation();
  return (
    name: keyof MainTabParamList,
    /** When `name` is `ToolsTab`, open this nested screen (default `ToolsMain`). */
    toolsScreen?: keyof ToolsStackParamList,
  ) => {
    const tabNav = navigation.getParent() as NavigationProp<MainTabParamList> | undefined;
    if (!tabNav) return;
    switch (name) {
      case 'HomeTab':
        tabNav.navigate('HomeTab', { screen: 'HomeMain' });
        break;
      case 'QuranTab':
        tabNav.navigate('QuranTab', { screen: 'QuranHome' });
        break;
      case 'ToolsTab':
        tabNav.navigate('ToolsTab', { screen: toolsScreen ?? 'ToolsMain' });
        break;
      case 'QiblaTab':
        tabNav.navigate('QiblaTab', { screen: 'QiblaMain' });
        break;
      case 'ProfileTab':
        tabNav.navigate('ProfileTab', { screen: 'ProfileMain' });
        break;
      default:
        break;
    }
  };
}
