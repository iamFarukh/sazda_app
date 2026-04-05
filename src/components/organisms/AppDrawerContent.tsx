import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { View, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import {
  BookOpen,
  Compass,
  Grid3x3,
  Home,
  LogOut,
  Settings,
  User,
} from 'lucide-react-native';
import { SazdaText } from '../atoms/SazdaText/SazdaText';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { useAuthStore } from '../../store/authStore';
import { useThemePalette } from '../../theme/useThemePalette';
import { hapticMedium } from '../../utils/appHaptics';

type TabName = 'HomeTab' | 'QuranTab' | 'ToolsTab' | 'QiblaTab' | 'ProfileTab';

type Item = {
  label: string;
  icon: ReactNode;
  tab: TabName;
};

export function AppDrawerContent({ navigation }: DrawerContentComponentProps) {
  const signOut = useAuthStore(s => s.signOut);
  const firebaseUser = useAuthStore(s => s.firebaseUser);
  const guestSession = useAuthStore(s => s.guestSession);
  const { colors: c, scheme } = useThemePalette();

  const ITEMS: Item[] = useMemo(
    () => [
      { label: 'Home', tab: 'HomeTab', icon: <Home size={22} color={c.primary} strokeWidth={2} /> },
      { label: 'Quran', tab: 'QuranTab', icon: <BookOpen size={22} color={c.primary} strokeWidth={2} /> },
      { label: 'Tools', tab: 'ToolsTab', icon: <Grid3x3 size={22} color={c.primary} strokeWidth={2} /> },
      {
        label: 'Qibla',
        tab: 'QiblaTab',
        icon: <Compass size={22} color={c.primary} strokeWidth={2} />,
      },
      { label: 'Profile', tab: 'ProfileTab', icon: <User size={22} color={c.primary} strokeWidth={2} /> },
    ],
    [c.primary],
  );

  const hairline = scheme === 'dark' ? 'rgba(142,207,178,0.12)' : 'rgba(0,53,39,0.08)';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1, backgroundColor: c.surface },
        scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
        brand: {
          paddingVertical: spacing.xl,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: hairline,
          marginBottom: spacing.md,
        },
        brandItalic: { fontStyle: 'italic', marginBottom: spacing.xxs },
        list: { gap: spacing.xxs },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.sm,
          borderRadius: radius.md,
        },
        rowPressed: { backgroundColor: c.surfaceContainerLow },
        rowIcon: { width: 36, alignItems: 'center' },
        footer: {
          marginTop: spacing.xl,
          paddingTop: spacing.lg,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: hairline,
          gap: spacing.sm,
        },
        rowMuted: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.sm,
        },
        mutedLabel: { fontWeight: '500' },
      }),
    [c.surface, c.surfaceContainerLow, hairline],
  );

  const goTab = (tab: TabName) => {
    const stackRoot =
      tab === 'HomeTab'
        ? ({ screen: 'HomeTab' as const, params: { screen: 'HomeMain' as const } } as const)
        : tab === 'QuranTab'
          ? ({ screen: 'QuranTab' as const, params: { screen: 'QuranHome' as const } } as const)
          : tab === 'ToolsTab'
            ? ({ screen: 'ToolsTab' as const, params: { screen: 'ToolsMain' as const } } as const)
            : tab === 'QiblaTab'
              ? ({
                  screen: 'QiblaTab' as const,
                  params: { screen: 'QiblaMain' as const },
                } as const)
              : ({ screen: 'ProfileTab' as const, params: { screen: 'ProfileMain' as const } } as const);

    (navigation as unknown as { navigate: (a: string, b: unknown) => void }).navigate(
      'MainTabs',
      stackRoot,
    );
    navigation.closeDrawer();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.brand}>
          <SazdaText variant="headlineLarge" color="primary" style={styles.brandItalic}>
            Sazda
          </SazdaText>
          <SazdaText variant="caption" color="onSurfaceVariant">
            Your digital sanctuary
          </SazdaText>
          {firebaseUser?.email ? (
            <SazdaText variant="caption" color="onSurfaceVariant" style={{ marginTop: 4, opacity: 0.85 }}>
              {firebaseUser.email}
            </SazdaText>
          ) : guestSession ? (
            <SazdaText variant="caption" color="onSurfaceVariant" style={{ marginTop: 4, opacity: 0.85 }}>
              Guest session (not synced)
            </SazdaText>
          ) : null}
        </View>

        <View style={styles.list}>
          {ITEMS.map(item => (
            <Pressable
              key={item.tab}
              onPress={() => {
                hapticMedium();
                goTab(item.tab);
              }}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              accessibilityRole="button"
              accessibilityLabel={item.label}>
              <View style={styles.rowIcon}>{item.icon}</View>
              <SazdaText variant="titleSm" color="onSurface">
                {item.label}
              </SazdaText>
            </Pressable>
          ))}
        </View>

        <View style={styles.footer}>
          <Pressable style={styles.rowMuted} accessibilityRole="button" accessibilityLabel="Settings">
            <Settings size={20} color={c.onSurfaceVariant} strokeWidth={2} />
            <SazdaText variant="bodyMedium" color="onSurfaceVariant" style={styles.mutedLabel}>
              Settings
            </SazdaText>
          </Pressable>
          <Pressable
            onPress={() => {
              navigation.closeDrawer();
              void signOut();
            }}
            style={styles.rowMuted}
            accessibilityRole="button"
            accessibilityLabel="Sign out">
            <LogOut size={20} color={c.error} strokeWidth={2} />
            <SazdaText variant="bodyMedium" color="error" style={styles.mutedLabel}>
              Sign out
            </SazdaText>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
