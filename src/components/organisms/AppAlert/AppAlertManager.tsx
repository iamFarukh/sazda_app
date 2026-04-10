import { useEffect, useState, useMemo } from 'react';
import { BackHandler, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
  ZoomOut,
  SlideInDown,
} from 'react-native-reanimated';
import { AlertCircle, CheckCircle2, Info, LogOut } from 'lucide-react-native';
import { AppAlert, AppAlertConfig } from './AppAlert';
import { useThemePalette } from '../../../theme/useThemePalette';
import { fontFamilies } from '../../../theme/typography';
import { radius } from '../../../theme/radius';
import { spacing } from '../../../theme/spacing';

export function AppAlertManager() {
  const [config, setConfig] = useState<AppAlertConfig | null>(null);
  const { colors: c } = useThemePalette();

  useEffect(() => {
    return AppAlert.subscribe(setConfig);
  }, []);

  // Handle Android back button
  useEffect(() => {
    if (!config) return;
    const isCancelable = config.options?.cancelable ?? true;
    
    const handler = () => {
      if (isCancelable) {
        handleDismiss();
        return true;
      }
      return false; // Prevent back if not cancelable
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handler);
    return () => subscription.remove();
  }, [config]);

  if (!config) return null;

  const handleDismiss = () => {
    AppAlert.hide();
  };

  const handlePress = (onPress?: () => void) => {
    handleDismiss();
    if (onPress) {
      requestAnimationFrame(() => {
        onPress();
      });
    }
  };

  // Determine styles strictly matching HTML design variants
  // "destructive" / "confirmation": Red/Logout style.
  // "success": Primary Checkmark style.
  // "info": Neutral Info style.
  const variant = config.options?.variant ?? 'info';
  
  // Safe default: 1 OK button
  const buttons = config.buttons && config.buttons.length > 0 
    ? config.buttons 
    : [{ text: 'OK' }];

  let IconComponent = Info;
  let iconColor = c.onSurfaceVariant;
  let iconBgColor = c.surfaceContainerLow;
  let innerIconBgStyle: any = null; // Only success uses double rings in HTML design

  if (variant === 'destructive' || variant === 'confirmation') {
    IconComponent = variant === 'confirmation' ? LogOut : AlertCircle;
    iconColor = variant === 'confirmation' ? c.secondary : c.error;
    iconBgColor = variant === 'confirmation' ? c.surfaceContainerLow : c.errorContainer;
  } else if (variant === 'success') {
    IconComponent = CheckCircle2;
    iconColor = '#ffffff'; 
    iconBgColor = 'rgba(176, 240, 214, 0.3)'; // Primary-fixed translucent ring
    innerIconBgStyle = { backgroundColor: c.primaryContainer, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' };
  } else {
    // Info styling
    IconComponent = Info;
    iconColor = c.primary;
    iconBgColor = c.surfaceContainerLow;
  }

  // Find the 'cancel' button in array (for two-button layouts)
  // Usually, buttons[0] is cancel, buttons[1] is OK (iOS convention) or reversed.
  // We'll render them vertically as per HTML design:
  // - Top button: Primary action
  // - Bottom button: Secondary / Ghost action

  const actionButton = buttons.find(b => b.style !== 'cancel') || buttons[buttons.length - 1];
  const cancelButton = buttons.find(b => b.style === 'cancel');

  return (
    <Modal visible={!!config} transparent animationType="none" statusBarTranslucent>
      <Animated.View 
        style={styles.backdrop}
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
      >
        <Pressable 
          style={StyleSheet.absoluteFill} 
          onPress={config.options?.cancelable !== false ? handleDismiss : undefined}
          accessibilityLabel="Dismiss Alert" 
        />
        
        <Animated.View 
          style={[styles.card, { backgroundColor: c.surface }]}
          entering={ZoomIn.duration(200)}
          exiting={ZoomOut.duration(150)}
          accessibilityRole="alert"
        >
          {variant === 'confirmation' && (
             <View style={[styles.glowRing, { backgroundColor: 'rgba(254, 214, 91, 0.1)' }]} pointerEvents="none" />
          )}

          <View style={styles.header}>
            <View style={[styles.iconWrapper, { backgroundColor: iconBgColor }]}>
              {innerIconBgStyle ? (
                 <View style={innerIconBgStyle}>
                   <IconComponent color={iconColor} size={28} strokeWidth={2.5} />
                 </View>
              ) : (
                <IconComponent color={iconColor} size={36} strokeWidth={2} />
              )}
            </View>
            <View style={styles.textContent}>
              <Text style={[styles.title, { color: c.primary }]}>{config.title}</Text>
              {!!config.message && (
                <Text style={[styles.message, { color: c.onSurfaceVariant }]}>{config.message}</Text>
              )}
            </View>
          </View>

          <View style={styles.buttonStack}>
            {/* Primary Action */}
            <Pressable
              onPress={() => handlePress(actionButton.onPress)}
              style={({ pressed }) => [
                styles.primaryBtn,
                { 
                  backgroundColor: variant === 'success' ? c.secondaryContainer : c.primaryContainer 
                },
                pressed && styles.pressed
              ]}
            >
              <Text style={[
                styles.primaryBtnText, 
                { color: variant === 'success' ? c.onSecondaryContainer : '#ffffff' }
              ]}>
                {actionButton.text}
              </Text>
            </Pressable>

            {/* Cancel/Secondary Action (if present & there is more than 1 button) */}
            {buttons.length > 1 && cancelButton && (
              <Pressable
                onPress={() => handlePress(cancelButton.onPress)}
                style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressedBg]}
              >
                <Text style={[styles.secondaryBtnText, { color: c.primary }]}>
                  {cancelButton.text}
                </Text>
              </Pressable>
            )}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 53, 39, 0.4)', // primary with 0.4 opacity
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    zIndex: 999,
    elevation: 999,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: 'rgba(6, 78, 59, 0.15)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 40,
    elevation: 24,
  },
  glowRing: {
    position: 'absolute',
    top: -48,
    right: -48,
    width: 128,
    height: 128,
    borderRadius: 64,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl + spacing.sm,
    width: '100%',
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  textContent: {
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  title: {
    fontFamily: fontFamilies.headline,
    fontWeight: '800',
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  message: {
    fontFamily: fontFamilies.body,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonStack: {
    width: '100%',
    gap: spacing.sm + 2,
  },
  primaryBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontFamily: fontFamilies.headline,
    fontWeight: '700',
    fontSize: 18,
  },
  secondaryBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontFamily: fontFamilies.headline,
    fontWeight: '700',
    fontSize: 18,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  pressedBg: {
    backgroundColor: 'rgba(0,0,0,0.04)',
  }
});
