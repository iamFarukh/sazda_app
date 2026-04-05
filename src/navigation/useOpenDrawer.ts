import { DrawerActions, useNavigation } from '@react-navigation/native';

/** Works from any screen under the root drawer. */
export function useOpenDrawer() {
  const navigation = useNavigation();
  return () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };
}
