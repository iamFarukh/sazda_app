import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { getCrashlytics, log, recordError } from '@react-native-firebase/crashlytics';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Report the crash to Firebase Crashlytics (no-op if the native module is unavailable).
    try {
      const crashlytics = getCrashlytics();
      if (errorInfo.componentStack) {
        log(crashlytics, `componentStack: ${errorInfo.componentStack}`);
      }
      recordError(crashlytics, error);
    } catch {
      /* Crashlytics not available (e.g. Firebase not configured) */
    }
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong.</Text>
          <Text style={styles.subtitle}>
            We've encountered an unexpected issue. Please restart the application.
          </Text>
          <Pressable style={styles.button} onPress={this.resetError}>
            <Text style={styles.buttonText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAF9F6',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#BA1A1A',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#49454E',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#006C4C',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
