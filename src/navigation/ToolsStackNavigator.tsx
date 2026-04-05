import { useEffect, useMemo } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QiblaScreen } from '../screens/tools/QiblaScreen';
import { TasbeehScreen } from '../screens/tools/TasbeehScreen';
import { ToolsHomeScreen } from '../screens/tools/ToolsHomeScreen';
import { PrayerTrackerScreen } from '../screens/tools/PrayerTrackerScreen';
import { ZakatCalculatorScreen } from '../screens/tools/ZakatCalculatorScreen';
import { ZakatDashboardScreen } from '../screens/tools/zakat/ZakatDashboardScreen';
import { ZakatAddPaymentScreen } from '../screens/tools/zakat/ZakatAddPaymentScreen';
import { ZakatPaymentHistoryScreen } from '../screens/tools/zakat/ZakatPaymentHistoryScreen';
import { ZakatInsightsScreen } from '../screens/tools/zakat/ZakatInsightsScreen';
import { ZakatCycleManageScreen } from '../screens/tools/zakat/ZakatCycleManageScreen';
import { DailyDuasScreen } from '../screens/tools/DailyDuasScreen';
import { HijriCalendarScreen } from '../screens/tools/HijriCalendarScreen';
import { useAuthStore } from '../store/authStore';
import { setZakatSyncUser } from '../services/zakatCloudSync';
import { getToolsSubScreenHeaderOptions } from './stackScreenOptions';
import { useThemedStackScreenOptions } from './useThemedStackScreenOptions';
import { useThemePalette } from '../theme/useThemePalette';
import type { ToolsStackParamList } from './types';

const Stack = createNativeStackNavigator<ToolsStackParamList>();

export function ToolsStackNavigator() {
  const screenOptions = useThemedStackScreenOptions();
  const { colors } = useThemePalette();
  const subHeader = useMemo(() => getToolsSubScreenHeaderOptions(colors), [colors]);
  const uid = useAuthStore(s => s.firebaseUser?.uid ?? null);

  useEffect(() => {
    setZakatSyncUser(uid);
  }, [uid]);

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="ToolsMain"
        component={ToolsHomeScreen}
        options={{ title: 'Tools', headerBackTitle: 'Tools', headerShown: false }}
      />
      <Stack.Screen name="Qibla" component={QiblaScreen} />
      <Stack.Screen name="Tasbeeh" component={TasbeehScreen} />
      <Stack.Screen
        name="ZakatHome"
        component={ZakatDashboardScreen}
        options={{
          ...subHeader,
          title: 'Zakat',
          /** Shown as back label on Calculator, History, etc. */
          headerBackTitle: 'Zakat',
        }}
      />
      <Stack.Screen
        name="ZakatCalculator"
        component={ZakatCalculatorScreen}
        options={{ ...subHeader, title: 'Calculator' }}
      />
      <Stack.Screen
        name="ZakatAddPayment"
        component={ZakatAddPaymentScreen}
        options={{ ...subHeader, title: 'Add payment' }}
      />
      <Stack.Screen
        name="ZakatPaymentHistory"
        component={ZakatPaymentHistoryScreen}
        options={{ ...subHeader, title: 'History' }}
      />
      <Stack.Screen
        name="ZakatInsights"
        component={ZakatInsightsScreen}
        options={{ ...subHeader, title: 'Insights' }}
      />
      <Stack.Screen
        name="ZakatCycleManage"
        component={ZakatCycleManageScreen}
        options={{ ...subHeader, title: 'Cycles' }}
      />
      <Stack.Screen name="PrayerTracker" component={PrayerTrackerScreen} />
      <Stack.Screen name="DailyDuas" component={DailyDuasScreen} />
      <Stack.Screen name="HijriCalendar" component={HijriCalendarScreen} />
    </Stack.Navigator>
  );
}
