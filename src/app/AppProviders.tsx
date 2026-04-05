import { QueryClientProvider } from '@tanstack/react-query';
import { useMemo, type PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthBootstrap } from '../components/organisms/AuthBootstrap';
import { createAppQueryClient } from '../services/queryClient';
import { useThemePalette } from '../theme/useThemePalette';

function ThemedRoot({ children }: PropsWithChildren) {
  const { colors: c } = useThemePalette();
  return (
    <View style={[styles.flex, { backgroundColor: c.surface }]}>{children}</View>
  );
}

export function AppProviders({ children }: PropsWithChildren) {
  const queryClient = useMemo(() => createAppQueryClient(), []);

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <AuthBootstrap>
          <QueryClientProvider client={queryClient}>
            <ThemedRoot>{children}</ThemedRoot>
          </QueryClientProvider>
        </AuthBootstrap>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
