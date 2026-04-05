import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { CommonActions } from '@react-navigation/native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BookOpen, Compass, Grid3x3, House, User } from 'lucide-react-native';
import type { AppPalette } from '../../../theme/useThemePalette';
import { useThemePalette } from '../../../theme/useThemePalette';
import { fontFamilies } from '../../../theme/typography';
import { TAB_STACK_ROOT } from '../../../navigation/tabRootScreens';
import { hapticMedium } from '../../../utils/appHaptics';

/** Large top corners — matches Stitch “sheet” dock (not a narrow floating pill). */
const DOCK_TOP_RADIUS = 32;

type TabKey =
  | 'HomeTab'
  | 'QuranTab'
  | 'ToolsTab'
  | 'QiblaTab'
  | 'ProfileTab';

type TabSpec = {
  key: TabKey;
  label: string;
  Icon: (props: {
    size?: number;
    color?: string;
    strokeWidth?: number;
  }) => ReactNode;
};

const TAB_SPECS: Record<TabKey, TabSpec> = {
  HomeTab: { key: 'HomeTab', label: 'Home', Icon: House },
  QuranTab: { key: 'QuranTab', label: 'Quran', Icon: BookOpen },
  ToolsTab: { key: 'ToolsTab', label: 'Tools', Icon: Grid3x3 },
  QiblaTab: { key: 'QiblaTab', label: 'Qibla', Icon: Compass },
  ProfileTab: { key: 'ProfileTab', label: 'Profile', Icon: User },
};

const INACTIVE_ICON = 22;
const ACTIVE_ICON = 22;
const ACTIVE_LIFT_Y = -12;

const IS_ANDROID = Platform.OS === 'android';

function TabItem({
  spec,
  isFocused,
  onPress,
  palette,
}: {
  spec: TabSpec;
  isFocused: boolean;
  onPress: () => void;
  palette: AppPalette;
}) {
  const focusProgress = useSharedValue(isFocused ? 1 : 0);
  const pressProgress = useSharedValue(0);

  useEffect(() => {
    const duration = IS_ANDROID
      ? isFocused
        ? 220
        : 160
      : isFocused
        ? 420
        : 280;
    focusProgress.value = withTiming(isFocused ? 1 : 0, {
      duration,
      easing: Easing.out(Easing.quad),
    });
  }, [focusProgress, isFocused]);

  const liftStyle = useAnimatedStyle(() => {
    const liftedY = interpolate(
      focusProgress.value,
      [0, 1],
      [0, ACTIVE_LIFT_Y],
    );
    const scale = interpolate(focusProgress.value, [0, 1], [1, 1.06]);
    const pressScale = interpolate(pressProgress.value, [0, 1], [1, 0.96]);
    return {
      transform: [{ translateY: liftedY }, { scale: scale * pressScale }],
    };
  });

  const inactiveIconColor = palette.primaryContainer;
  const inactiveLabelColor = palette.primaryContainer;
  const activeFg = palette.onPrimary;

  // Cross-fade instead of swapping trees — avoids mount/unmount jank on tab change.
  const inactiveLayerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(focusProgress.value, [0, 1], [1, 0]),
  }));
  const activeLayerStyle = useAnimatedStyle(() => ({
    opacity: focusProgress.value,
  }));

  const bubbleShadow = IS_ANDROID
    ? styles.activeBubbleShadowAndroid
    : styles.activeBubbleShadowIos;

  return (
    <View style={styles.itemFlex}>
      {/* Pressable outside Reanimated wrapper so hits aren’t dropped on some RN/Reanimated builds. */}
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          pressProgress.value = withTiming(1, {
            duration: IS_ANDROID ? 70 : 100,
            easing: Easing.out(Easing.quad),
          });
        }}
        onPressOut={() => {
          pressProgress.value = withTiming(0, {
            duration: IS_ANDROID ? 85 : 120,
            easing: Easing.out(Easing.quad),
          });
        }}
        accessibilityRole="button"
        accessibilityLabel={spec.label}
        style={styles.pressableFill}
      >
        <Animated.View style={[styles.itemAnimatedWrap, liftStyle]}>
          <View style={styles.tabSlot} collapsable={false}>
            <Animated.View
              style={[styles.layerBottom, inactiveLayerStyle]}
              pointerEvents="none"
              importantForAccessibility={isFocused ? 'no-hide-descendants' : 'yes'}
            >
              <View style={styles.inactiveColumn}>
                <spec.Icon
                  size={INACTIVE_ICON}
                  color={inactiveIconColor}
                  strokeWidth={2}
                />
                <Text
                  style={[styles.labelInactive, { color: inactiveLabelColor }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.72}
                >
                  {spec.label.toUpperCase()}
                </Text>
              </View>
            </Animated.View>
            <Animated.View
              style={[styles.layerBottom, activeLayerStyle]}
              pointerEvents="none"
              importantForAccessibility={isFocused ? 'yes' : 'no-hide-descendants'}
            >
              <View
                style={[
                  styles.activeBubble,
                  bubbleShadow,
                  { backgroundColor: palette.primary },
                ]}
              >
                <spec.Icon
                  size={ACTIVE_ICON}
                  color={activeFg}
                  strokeWidth={2.25}
                />
                <Text
                  style={[styles.labelActive, { color: activeFg }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                >
                  {spec.label.toUpperCase()}
                </Text>
              </View>
            </Animated.View>
          </View>
        </Animated.View>
      </Pressable>
    </View>
  );
}

export function SazdaBottomTabBar({
  state,
  navigation,
  insets: insetsProp,
}: BottomTabBarProps) {
  const { colors: palette, scheme } = useThemePalette();
  const routes = state.routes as { name: string }[];
  const activeRouteName = state.routeNames[state.index] as string;

  const items = useMemo(() => {
    return routes
      .map(r => r.name as TabKey)
      .filter((k): k is TabKey =>
        Object.prototype.hasOwnProperty.call(TAB_SPECS, k),
      );
  }, [routes]);

  const navigationRef = useRef(navigation);
  const stateRef = useRef(state);
  navigationRef.current = navigation;
  stateRef.current = state;

  const onTabPress = useCallback((key: TabKey) => {
    const nav = navigationRef.current;
    const st = stateRef.current;
    const activeName = st.routeNames[st.index];
    const isFocused = activeName === key;
    const route = st.routes.find(r => r.name === key);
    if (!route) {
      return;
    }

    const hapticLater = () => {
      if (IS_ANDROID) {
        setTimeout(() => hapticMedium(), 0);
      } else {
        hapticMedium();
      }
    };

    // Match @react-navigation/bottom-tabs: dispatch NAVIGATE with target so the tab router
    // always receives the action (navigate() from the bar can be a no-op without target).
    const dispatchToTabNavigator = (action: ReturnType<typeof CommonActions.navigate>) => {
      nav.dispatch({
        ...action,
        target: st.key,
      });
    };

    if (isFocused) {
      hapticLater();
      const root = TAB_STACK_ROOT[key];
      dispatchToTabNavigator(
        CommonActions.navigate({
          name: key,
          params: { screen: root, params: {} },
        }),
      );
      return;
    }

    const event = nav.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!event.defaultPrevented) {
      dispatchToTabNavigator(CommonActions.navigate(route));
    }
    hapticLater();
  }, []);

  const pressByKey = useMemo(() => {
    const out = {} as Record<TabKey, () => void>;
    for (const k of items) {
      out[k] = () => onTabPress(k);
    }
    return out;
  }, [items, onTabPress]);

  const bottomInset = Math.max(insetsProp?.bottom ?? 0, 0);

  const dockBorder =
    scheme === 'dark' ? 'rgba(149, 211, 186, 0.12)' : 'rgba(0, 53, 39, 0.08)';

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.dock,
        IS_ANDROID ? styles.dockAndroid : null,
        {
          backgroundColor: palette.surface,
          borderColor: dockBorder,
          paddingBottom: bottomInset + 10,
          borderTopLeftRadius: DOCK_TOP_RADIUS,
          borderTopRightRadius: DOCK_TOP_RADIUS,
          shadowColor: palette.primary,
        },
      ]}
    >
      <View style={styles.row}>
        {items.map(key => {
          const spec = TAB_SPECS[key];
          const isFocused = activeRouteName === key;

          return (
            <TabItem
              key={key}
              spec={spec}
              isFocused={isFocused}
              onPress={pressByKey[key]}
              palette={palette}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    width: '100%',
    paddingHorizontal: 4,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dockAndroid: {
    elevation: 4,
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minHeight: 52,
  },
  itemFlex: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  itemAnimatedWrap: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  pressableFill: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  tabSlot: {
    width: '100%',
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  layerBottom: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  inactiveColumn: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 4,
    gap: 4,
    opacity: 0.72,
  },
  activeBubble: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 58,
    minHeight: 58,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 2,
  },
  activeBubbleShadowIos: {
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  activeBubbleShadowAndroid: {
    elevation: 2,
    shadowOpacity: 0,
  },
  labelInactive: {
    fontFamily: fontFamilies.body,
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.35,
    maxWidth: '100%',
    paddingHorizontal: 1,
  },
  labelActive: {
    fontFamily: fontFamilies.body,
    fontSize: 8,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.4,
    marginTop: 1,
    maxWidth: 56,
  },
});
