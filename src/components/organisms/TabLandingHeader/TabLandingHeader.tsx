import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SazdaText } from '../../atoms/SazdaText/SazdaText';
import { useNavigateMainTab } from '../../../navigation/useNavigateMainTab';
import { useProfileStore } from '../../../store/profileStore';
import { radius } from '../../../theme/radius';
import { spacing } from '../../../theme/spacing';
import type { AppPalette } from '../../../theme/useThemePalette';
import type { ResolvedScheme } from '../../../theme/useThemePalette';
import { useThemePalette } from '../../../theme/useThemePalette';
import { hapticLight } from '../../../utils/appHaptics';

type Props = {
  /** Replace default profile avatar (e.g. Settings on Profile tab). */
  rightAccessory?: ReactNode;
  /** Tighter bottom padding when a location row sits directly below (e.g. Home). */
  denseBottom?: boolean;
  /** White treatment for placement over a dark/immersive background (e.g. Home hero). */
  onDark?: boolean;
};

/**
 * Shared top bar for main tab “landing” screens: Sazda wordmark · profile (or custom right).
 */
export function TabLandingHeader({ rightAccessory, denseBottom, onDark }: Props) {
  const { colors: c, scheme } = useThemePalette();
  const styles = useMemo(
    () => createStyles(c, scheme, !!denseBottom),
    [c, scheme, denseBottom],
  );
  const goTab = useNavigateMainTab();
  const displayName = useProfileStore(s => s.displayName);
  const initial =
    displayName.trim().charAt(0).toUpperCase() || 'G';

  return (
    <View style={styles.row}>
      <View style={styles.brandBlock}>
        <SazdaText
          variant="titleSm"
          color={onDark ? '#ffffff' : 'primary'}
          style={styles.brand}>
          Sazda
        </SazdaText>
      </View>
      {rightAccessory ? (
        <View style={styles.rightSlot}>{rightAccessory}</View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Profile"
          onPress={() => {
            hapticLight();
            goTab('ProfileTab');
          }}
          style={({ pressed }) => [
            styles.avatarOuter,
            onDark && styles.avatarOuterDark,
            pressed && styles.avatarPressed,
          ]}>
          <View style={[styles.avatarInner, onDark && styles.avatarInnerDark]}>
            <SazdaText
              variant="caption"
              color={onDark ? '#ffffff' : 'onSurfaceVariant'}
              style={styles.avatarLetter}>
              {initial}
            </SazdaText>
          </View>
        </Pressable>
      )}
    </View>
  );
}

function createStyles(c: AppPalette, _scheme: ResolvedScheme, denseBottom: boolean) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      /** Horizontal inset comes from parent `ScrollView` / wrapper so brand aligns with page titles. */
      paddingHorizontal: 0,
      paddingTop: denseBottom ? spacing.xxs : spacing.sm,
      paddingBottom: denseBottom ? spacing.xxs : spacing.sm,
      minHeight: denseBottom ? 44 : 56,
    },
    brandBlock: {
      flex: 1,
      minWidth: 0,
      justifyContent: 'center',
    },
    brand: {
      fontStyle: 'italic',
      letterSpacing: -0.3,
    },
    rightSlot: {
      minWidth: 40,
      minHeight: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarOuter: {
      borderRadius: radius.full,
      borderWidth: 2,
      borderColor: c.secondaryContainer,
      overflow: 'hidden',
    },
    avatarOuterDark: {
      borderColor: 'rgba(255,216,107,0.85)',
    },
    avatarPressed: {
      opacity: 0.85,
      transform: [{ scale: 0.96 }],
    },
    avatarInner: {
      width: 40,
      height: 40,
      borderRadius: radius.full,
      backgroundColor: c.surfaceContainerHighest,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInnerDark: {
      backgroundColor: 'rgba(255,255,255,0.16)',
    },
    avatarLetter: {
      fontWeight: '700',
    },
  });
}
