/**
 * @format
 */
import { StatusBar, View, StyleSheet } from 'react-native';
import { useState } from 'react';
import { AppProviders } from './src/app/AppProviders';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useThemePalette } from './src/theme/useThemePalette';
import { AnimatedSplashScreen } from './src/components/AnimatedSplashScreen';
import { AppAlertManager } from './src/components/organisms/AppAlert/AppAlertManager';

function ThemedStatusBar() {
  const { scheme } = useThemePalette();
  return <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />;
}

function AppContent() {
  const [isAppReady, setIsAppReady] = useState(false);

  return (
    <View style={StyleSheet.absoluteFill}>
      <ThemedStatusBar />
      <RootNavigator />
      <AppAlertManager />
      {!isAppReady && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]}>
          <AnimatedSplashScreen onAnimationEnd={() => setIsAppReady(true)} />
        </View>
      )}
    </View>
  );
}

function App() {
  return (
    <AppProviders>
      <AppContent />
    </AppProviders>
  );
}

export default App;
