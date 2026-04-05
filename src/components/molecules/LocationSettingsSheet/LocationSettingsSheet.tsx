import { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, Navigation, RefreshCw } from 'lucide-react-native';
import { SazdaText } from '../../atoms/SazdaText/SazdaText';
import { radius } from '../../../theme/radius';
import { spacing } from '../../../theme/spacing';
import { fontFamilies, platformFontWeight } from '../../../theme/typography';
import type { AppPalette } from '../../../theme/useThemePalette';
import type { ResolvedScheme } from '../../../theme/useThemePalette';
import { useThemePalette } from '../../../theme/useThemePalette';

type Props = {
  visible: boolean;
  onClose: () => void;
  busy: boolean;
  onUseCurrentLocation: () => void;
  onRefreshLocation: () => void;
};

const SHEET_NAME = 'location-settings';

export function LocationSettingsSheet({
  visible,
  onClose,
  busy,
  onUseCurrentLocation,
  onRefreshLocation,
}: Props) {
  const { colors: c, scheme } = useThemePalette();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => createStyles(c, scheme, Math.max(insets.bottom, spacing.md)),
    [c, scheme, insets.bottom],
  );
  const sheetRef = useRef<TrueSheet>(null);
  const prevVisible = useRef(visible);
  /** True when dismiss already happened natively (swipe, tap outside, Cancel). Avoids effect calling dismiss() again → TrueSheet warning. */
  const dismissedByNativeRef = useRef(false);

  const handleDidDismiss = () => {
    dismissedByNativeRef.current = true;
    onClose();
  };

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    if (visible) {
      dismissedByNativeRef.current = false;
      void sheet.present();
    } else if (prevVisible.current) {
      if (dismissedByNativeRef.current) {
        dismissedByNativeRef.current = false;
      } else {
        void sheet.dismiss();
      }
    }
    prevVisible.current = visible;
  }, [visible]);

  const dismiss = () => {
    void sheetRef.current?.dismiss();
  };

  return (
    <TrueSheet
      ref={sheetRef}
      name={SHEET_NAME}
      detents={['auto']}
      cornerRadius={radius.md + 14}
      backgroundColor={c.surface}
      dimmed
      grabber={false}
      draggable
      dismissible
      onDidDismiss={handleDidDismiss}>
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <SazdaText variant="headlineMedium" color="primary" style={styles.title}>
          Manage Location
        </SazdaText>
        <SazdaText variant="bodyMedium" color="onSurfaceVariant" style={styles.subtitle}>
          Adjust your coordinates for precise prayer timings.
        </SazdaText>

        <Pressable
          onPress={onUseCurrentLocation}
          disabled={busy}
          style={({ pressed }) => [
            styles.primaryBtn,
            pressed && !busy && styles.primaryBtnPressed,
            busy && styles.primaryBtnDisabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Use current location">
          <View style={styles.primaryLeft}>
            <View style={styles.iconCircle}>
              {busy ? (
                <ActivityIndicator color={c.onPrimaryContainer} size="small" />
              ) : (
                <Navigation size={22} color={c.onPrimaryContainer} strokeWidth={2.2} />
              )}
            </View>
            <SazdaText
              variant="bodyMedium"
              color="onPrimaryContainer"
              style={styles.primaryLabel}>
              Use Current Location
            </SazdaText>
          </View>
          {!busy ? (
            <ChevronRight size={22} color={c.onPrimaryContainer} style={{ opacity: 0.55 }} />
          ) : null}
        </Pressable>

        <View style={styles.footerRow}>
          <Pressable
            onPress={onRefreshLocation}
            disabled={busy}
            style={({ pressed }) => [styles.textBtn, pressed && !busy && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Refresh location">
            <RefreshCw size={18} color={c.primary} strokeWidth={2.2} />
            <SazdaText variant="bodyMedium" color="primary" style={styles.textBtnLabel}>
              Refresh
            </SazdaText>
          </Pressable>
          <Pressable
            onPress={dismiss}
            style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Cancel">
            <SazdaText variant="bodyMedium" color="onSurfaceVariant" style={styles.cancelLabel}>
              Cancel
            </SazdaText>
          </Pressable>
        </View>
      </View>
    </TrueSheet>
  );
}

function createStyles(c: AppPalette, _scheme: ResolvedScheme, bottomInset: number) {
  return StyleSheet.create({
    sheet: {
      backgroundColor: c.surface,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md + 4,
      paddingBottom: bottomInset + spacing.lg,
    },
    handle: {
      alignSelf: 'center',
      width: 44,
      height: 5,
      borderRadius: 3,
      backgroundColor: c.surfaceContainerHighest,
      marginBottom: spacing.lg,
    },
    title: {
      fontFamily: fontFamilies.headline,
      fontWeight: platformFontWeight('700'),
      marginBottom: spacing.xs,
    },
    subtitle: {
      marginBottom: spacing.xl,
      opacity: 0.92,
    },
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.primaryContainer,
      borderRadius: radius.full,
      paddingVertical: spacing.md + 4,
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.xl,
    },
    primaryBtnPressed: { opacity: 0.94 },
    primaryBtnDisabled: { opacity: 0.75 },
    primaryLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      flex: 1,
    },
    iconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(0, 53, 39, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryLabel: {
      fontFamily: fontFamilies.body,
      fontWeight: platformFontWeight('700'),
      fontSize: 17,
      flex: 1,
    },
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.surfaceContainerHighest,
    },
    textBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.full,
    },
    textBtnLabel: { fontWeight: platformFontWeight('700') },
    cancelBtn: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.full,
    },
    cancelLabel: { fontWeight: platformFontWeight('600') },
    pressed: { opacity: 0.85 },
  });
}
