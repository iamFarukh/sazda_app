import { useNavigation } from '@react-navigation/native';
import type { ToolsStackParamList } from './types';

/**
 * From any authenticated screen under the main tab bar: open a Tools stack screen.
 */
export function useNavigateToToolsScreen() {
  const navigation = useNavigation();

  return (screen: keyof ToolsStackParamList) => {
    // Bubble to tab navigator (sibling of Home / Quran stacks).
    (navigation as { navigate: (name: string, params: { screen: keyof ToolsStackParamList }) => void }).navigate(
      'ToolsTab',
      { screen },
    );
  };
}
