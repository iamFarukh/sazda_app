/**
 * Initial route name for each main tab’s stack — used when re-tapping a tab to return “home” within that tab.
 */
export const TAB_STACK_ROOT: Record<
  'HomeTab' | 'QuranTab' | 'ToolsTab' | 'QiblaTab' | 'ProfileTab',
  string
> = {
  HomeTab: 'HomeMain',
  QuranTab: 'QuranHome',
  ToolsTab: 'ToolsMain',
  QiblaTab: 'QiblaMain',
  ProfileTab: 'ProfileMain',
};
